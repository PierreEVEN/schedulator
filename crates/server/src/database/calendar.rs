use crate::database::calendar_users::CalendarUser;
use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, CalendarId, UserId};
use crate::types::enc_string::EncString;
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use rand::distr::{Alphanumeric, SampleString};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug, Clone, FromRow)]
pub struct Calendar {

    id: CalendarId,
    pub owner_id: UserId,
    pub title: EncString,
    pub key: EncString,
    pub start_date: i64,
    pub end_date: i64,
    pub time_precision: i64,
    pub start_daily_hour: i64,
    pub end_daily_hour: i64,
    pub require_account: bool,
    pub default_presence: f32,
}

impl Calendar {
    pub async fn from_id(db: &Database, id: &CalendarId) -> Result<Self, Error> {
        match query_object!(db, Calendar, "SELECT * FROM SCHEMA_NAME.calendars WHERE id = $1", id) {
            None => { Err(Error::msg("Calendar not found")) }
            Some(user) => { Ok(user) }
        }
    }
    pub async fn from_key(db: &Database, key: &EncString) -> Result<Self, Error> {
        match query_object!(db, Calendar, "SELECT * FROM SCHEMA_NAME.calendars WHERE key = $1", key) {
            None => { Err(Error::msg("Calendar not found")) }
            Some(user) => { Ok(user) }
        }
    }
    pub async fn from_user(db: &Database, user: &UserId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.calendars WHERE owner_id = $1", user))
    }
    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SCHEMA_NAME.calendars
                        (id, owner_id, title, key, start_date, end_date, time_precision, start_daily_hour, end_daily_hour, require_account, default_presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, owner_id = $2, title = $3, key = $4, start_date = $5, end_date = $6, time_precision = $7, start_daily_hour = $8, end_daily_hour = $9, require_account = $10, default_presence = $11;",
                self.id(), self.owner_id, self.title, self.key, self.start_date, self.end_date, self.time_precision, self.start_daily_hour, self.end_daily_hour, self.require_account, self.default_presence);
        } else {
            loop {
                self.key = EncString::from(Alphanumeric.sample_string(&mut rand::rng(), 16));
                if query_object!(db, Self, "SELECT * FROM SCHEMA_NAME.calendars WHERE key = $1", self.key).is_none() {
                    break;
                }
            }
            let res = query_object!(db, CalendarId, "INSERT INTO SCHEMA_NAME.calendars
                        (owner_id, title, key, start_date, end_date, time_precision, start_daily_hour, end_daily_hour, require_account, default_presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
                self.owner_id, self.title, self.key, self.start_date, self.end_date, self.time_precision, self.start_daily_hour, self.end_daily_hour, self.require_account, self.default_presence);
            if let Some(res) = res {
                self.id = res;
            }
        }
        Ok(())
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        for user in CalendarUser::from_calendar(db, self.id()).await? {
            CalendarUser::delete(&user, db).await?;
        }
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.calendars WHERE id = $1;"#, self.id());
        Ok(())
    }
}

impl Calendar {
    pub fn id(&self) -> &CalendarId {
        &self.id
    }
}