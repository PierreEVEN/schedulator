use std::fmt::Formatter;
use crate::database::planning::Planning;
use crate::database::Database;
use crate::types::database_ids::{DatabaseId, DatabaseIdTrait, PasswordHash, UserId};
use crate::types::enc_string::EncString;
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use rand::distributions::{Alphanumeric, DistString};
use rand::random;
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde::de::{MapAccess, Visitor};
use serde::ser::SerializeStruct;
use crate::database::auth_token::AuthToken;


#[derive(Debug, Default, Clone, FromRow)]
pub struct User {
    id: UserId,
    pub email: EncString,
    pub display_name: EncString,
    password_hash: PasswordHash,
}

impl User {
    pub fn id(&self) -> &UserId {
        &self.id
    }

    pub fn set_id(&mut self, id: UserId) -> Result<(), Error> {
        if self.id.is_valid() {
            Err(Error::msg("Cannot override a valid id"))
        } else {
            self.id = id;
            Ok(())
        }
    }

    pub fn update_password(&mut self, password: PasswordHash) {
        self.password_hash = password
    }

    pub fn password(&self) -> &PasswordHash {
        &self.password_hash
    }
}

impl Serialize for User {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("Item", 3)?;

        state.serialize_field("id", &self.id)?;
        state.serialize_field("display_name", &self.display_name)?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for User {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct UserVisitor;

        impl<'de> Visitor<'de> for UserVisitor {
            type Value = User;

            fn expecting(&self, formatter: &mut Formatter) -> std::fmt::Result {
                formatter.write_str("Item data")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut user = User::default();
                while let Some(key) = map.next_key()? {
                    match key {
                        "id" => { user.id = map.next_value()? }
                        "email" => {
                            user.email = map.next_value()?;
                        }
                        "display_name" => { user.display_name = map.next_value()? }
                        _ => {}
                    }
                }
                Ok(user)
            }
        }
        const FIELDS: &[&str] = &["id", "email", "display_name"];
        deserializer.deserialize_struct("Item", FIELDS, UserVisitor)
    }
}


impl User {
    pub async fn from_id(db: &Database, id: &UserId) -> Result<User, Error> {
        match query_object!(db, User, "SELECT * FROM SCHEMA_NAME.users WHERE id = $1", id) {
            None => { Err(Error::msg("User not found")) }
            Some(user) => { Ok(user) }
        }
    }

    pub async fn from_url_name(db: &Database, name: &EncString) -> Result<User, Error> {
        match query_object!(db, User, "SELECT * FROM SCHEMA_NAME.users WHERE LOWER(name) = LOWER($1)", name) {
            None => { Err(Error::msg("User not found")) }
            Some(user) => { Ok(user) }
        }
    }

    pub async fn exists(db: &Database, display_name: &EncString, email: &EncString) -> Result<bool, Error> {
        Ok(!query_objects!(db, User, r#"SELECT * FROM SCHEMA_NAME.users WHERE display_name = $1 OR email = $2"#, display_name, email).is_empty())
    }

    pub async fn from_credentials(db: &Database, display_name: &EncString, password: &EncString) -> Result<User, Error> {
        let user = query_object!(db, User, r#"SELECT * FROM SCHEMA_NAME.users WHERE display_name = $1 OR email = $1"#, display_name.encoded())
            .ok_or(Error::msg("User not found"))
            .map_err(|err| Error::msg(format!("Failed to query credentials for user : {}", err)))?;
        if user.password().verify(password)? {
            Ok(user)
        } else {
            Err(Error::msg("Failed to find user with given credentials"))
        }
    }

    pub async fn from_auth_token(db: &Database, authtoken: &EncString) -> Result<User, Error> {
        User::from_id(db, &AuthToken::find(db, authtoken).await?.owner).await
    }

    pub async fn generate_auth_token(user: &User, db: &Database, device: &EncString) -> Result<AuthToken, Error> {
        let mut token: String;
        loop {
            token = Alphanumeric.sample_string(&mut rand::thread_rng(), 64);
            if query_fmt!(db, "SELECT token FROM SCHEMA_NAME.authtoken WHERE token = $1", token).is_empty() {
                break;
            }
        }
        let enc_token = EncString::encode(token.as_str());

        let exp_date = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as i64;

        query_fmt!(db, "INSERT INTO SCHEMA_NAME.authtoken (owner, token, device, expdate) VALUES ($1, $2, $3, $4)", user.id(), enc_token, device, exp_date);
        query_object!(db, AuthToken, "SELECT * from SCHEMA_NAME.authtoken WHERE token = $1", enc_token).ok_or(Error::msg("Failed to add authentication token"))
    }

    pub async fn create_or_reset_password(user: &mut User, db: &Database, password_hash: &PasswordHash) -> Result<(), Error> {
        if !user.id().is_valid() {
            loop {
                user.set_id(UserId::from(random::<DatabaseId>().abs()))?;
                if query_fmt!(db, "SELECT id FROM SCHEMA_NAME.users WHERE id = $1", *user.id()).is_empty() {
                    break;
                }
            }
        }
        user.update_password(password_hash.clone());
        Self::push(user, db).await
    }

    pub async fn push(user: &mut User, db: &Database) -> Result<(), Error> {
        if user.display_name.is_empty() {
            return Err(Error::msg("Invalid name"));
        }
        query_fmt!(db, "INSERT INTO SCHEMA_NAME.users
                        (id, email, password_hash, display_name) VALUES
                        ($1, $2, $3, $4)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, email = $2, password_hash = $3, display_name = $4;",
            user.id(), user.email, user.password(), user.display_name);
        Ok(())
    }

    pub async fn delete(user: &User, db: &Database) -> Result<(), Error> {
        for repository in Planning::from_user(db, &user.id()).await? {
            Planning::delete(&repository, db).await?;
        }
        for token in AuthToken::from_user(db, user.id()).await? {
            AuthToken::delete(&token, db).await?;
        }
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.users WHERE id = $1;"#, user.id());
        Ok(())
    }
}