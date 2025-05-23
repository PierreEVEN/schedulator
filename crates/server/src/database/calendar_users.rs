use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, CalendarId, CalendarUserId, UserId};
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};
use crate::database::event::Event;
use crate::types::enc_string::EncString;

#[derive(Debug, Default, FromRow, Serialize, Deserialize)]
pub struct CalendarUser {
    id: CalendarUserId,
    pub name: EncString,
    pub calendar_id: CalendarId,
    pub user_id: Option<UserId>,
}

impl CalendarUser {
    pub async fn from_id(db: &Database, id: &CalendarUserId) -> Result<Self, Error> {
        query_object!(db, CalendarUser, "SELECT * FROM SCHEMA_NAME.calendar_users WHERE id = $1", id).ok_or(Error::msg("User not found"))
    }

    pub async fn from_calendar(db: &Database, id: &CalendarId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.calendar_users WHERE calendar_id = $1", id))
    }

    pub async fn from_username(db: &Database, id: &CalendarId, name: &EncString) -> Result<Self, Error> {
        query_object!(db, Self, "SELECT * FROM SCHEMA_NAME.calendar_users WHERE calendar_id = $1 AND name = $2", id, name).ok_or(Error::msg("User not found"))
    }

    pub async fn from_user(db: &Database, id: &CalendarId, user: &UserId) -> Result<Self, Error> {
        query_object!(db, Self, "SELECT * FROM SCHEMA_NAME.calendar_users WHERE calendar_id = $1 AND user_id = $2 AND user_id IS NOT NULL", id, user).ok_or(Error::msg("User not found"))
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        Event::delete_from_user(db, &self.id).await?;
        query_fmt!(db, "DELETE FROM SCHEMA_NAME.calendar_users WHERE id = $1;", self.id);
        Ok(())
    }

    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SCHEMA_NAME.calendar_users
                        (id, name, calendar_id, user_id) VALUES
                        ($1, $2, $3, $4)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, name = $2, calendar_id = $3, user_id = $4;",
                self.id(), self.name, self.calendar_id, self.user_id);
        } else {
            let res = query_object!(db, CalendarUserId, "INSERT INTO SCHEMA_NAME.calendar_users
                        (name, calendar_id, user_id) VALUES
                        ($1, $2, $3) RETURNING id",
                self.name, self.calendar_id, self.user_id);
            if let Some(res) = res {
                self.id = res;
            }
        }
        Ok(())
    }
}

impl CalendarUser {
    pub fn id(&self) -> &CalendarUserId {
        &self.id
    }
}