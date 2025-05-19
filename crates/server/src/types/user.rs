use anyhow::Error;
use serde::ser::SerializeStruct;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::Formatter;

use crate::types::database_ids::{DatabaseIdTrait, PasswordHash, UserId};
use crate::types::enc_string::EncString;
use postgres_from_row::FromRow;
use serde::de::{MapAccess, Visitor};

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
        state.serialize_field("name", &self.display_name)?;
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
                        "name" => { user.display_name = map.next_value()? }
                        _ => {}
                    }
                }
                Ok(user)
            }
        }
        const FIELDS: &[&str] = &["id", "email", "name", "login", "user_role"];
        deserializer.deserialize_struct("Item", FIELDS, UserVisitor)
    }
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, FromRow)]
pub struct AuthToken {
    owner: UserId,
    pub token: EncString,
    pub device: EncString,
    pub expdate: i64,
}

impl AuthToken {
    pub fn owner(&self) -> &UserId {
        &self.owner
    }
}

#[derive(Deserialize, Serialize, Default)]
pub struct LoginInfos {
    pub login: EncString,
    pub password: EncString,
    pub device: Option<EncString>,
}

#[derive(Serialize, Deserialize)]
pub struct LoginResult {
    pub token: AuthToken,
    pub user: User,
}
