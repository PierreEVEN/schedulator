use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};
use crate::database::Database;
use crate::{query_fmt, query_object, query_objects};
use crate::types::database_ids::UserId;
use crate::types::enc_string::EncString;


#[derive(Serialize, Deserialize, Debug, Default, Clone, FromRow)]
pub struct AuthToken {
    pub owner: UserId,
    pub token: EncString,
    pub device: EncString,
    pub expdate: i64,
}

impl AuthToken {
    pub async fn find(db: &Database, token: &EncString) -> Result<AuthToken, Error> {
        query_object!(db, AuthToken, "SELECT * FROM SCHEMA_NAME.authtoken WHERE token = $1", token).ok_or(Error::msg("Invalid authentication token"))
    }

    pub async fn from_user(db: &Database, id: &UserId) -> Result<Vec<AuthToken>, Error> {
        Ok(query_objects!(db, AuthToken, "SELECT * FROM SCHEMA_NAME.authtoken WHERE owner = $1", id))
    }

    pub async fn delete(token: &AuthToken, db: &Database) -> Result<(), Error> {
        query_fmt!(db, "DELETE FROM SCHEMA_NAME.authtoken WHERE token = $1", token.token);
        Ok(())
    }
}