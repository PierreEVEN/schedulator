use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, CalendarId, CalendarUserId, EventId};
use crate::types::enc_string::EncString;
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize, Deserialize, FromRow)]
pub struct Event {
    id: EventId,
    pub calendar: CalendarId,
    pub title: EncString,
    pub owner: CalendarUserId,
    pub start_time: i64,
    pub end_time: i64,
    pub source: EncString,
    pub presence: f32
}

impl Event {
    pub async fn from_id(db: &Database, id: &EventId) -> Result<Self, Error> {
        query_object!(db, Event, "SELECT * FROM SCHEMA_NAME.events WHERE id = $1", id).ok_or(Error::msg("Failed to get event from id"))
    }

    pub async fn from_calendar(db: &Database, id: &CalendarId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Event, "SELECT * FROM SCHEMA_NAME.events WHERE calendar = $1", id))
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.events WHERE id = $1;"#, self.id);
        Ok(())
    }

    pub async fn delete_from_user(db: &Database, user: &CalendarUserId) -> Result<(), Error> {
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.events WHERE owner = $1;"#, user);
        Ok(())
    }

    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SCHEMA_NAME.events
                        (id, calendar, title, owner, start_time, end_time, presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, calendar = $2, title = $3, owner = $4, start_time = $5, end_time = $6, source = $7, presence = $8;",
                self.id(), self.calendar, self.title, self.owner, self.start_time, self.end_time, self.source, self.presence);
        } else {
            let res = query_object!(db, EventId, "INSERT INTO SCHEMA_NAME.events
                        (calendar, title, owner, start_time, end_time, source, presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                self.calendar, self.title, self.owner, self.start_time, self.end_time, self.source, self.presence);
            if let Some(res) = res {
                self.id = res;
            }
        }
        Ok(())
    }

    pub fn id(&self) -> &EventId {
        &self.id
    }
}
