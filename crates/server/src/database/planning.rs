use crate::database::planning_users::PlanningUser;
use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, PlanningId, UserId};
use crate::types::enc_string::EncString;
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Default, Clone, FromRow)]
pub struct Planning {

    id: PlanningId,
    pub owner_id: UserId,
    pub title: EncString,
    pub key: EncString,
    pub start_date: i64,
    pub end_date: i64,
    pub time_precision: i64,
    pub start_daily_hour: i64,
    pub end_daily_hour: i64,
    pub require_account: bool,
}

impl Planning {
    pub async fn from_id(db: &Database, id: &PlanningId) -> Result<Self, Error> {
        match query_object!(db, Planning, "SELECT * FROM SCHEMA_NAME.plannings WHERE id = $1", id) {
            None => { Err(Error::msg("Planning not found")) }
            Some(user) => { Ok(user) }
        }
    }
    pub async fn from_key(db: &Database, key: &EncString) -> Result<Self, Error> {
        match query_object!(db, Planning, "SELECT * FROM SCHEMA_NAME.plannings WHERE key = $1", key) {
            None => { Err(Error::msg("Planning not found")) }
            Some(user) => { Ok(user) }
        }
    }
    pub async fn from_user(db: &Database, user: &UserId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.plannings WHERE owner_id = $1", user))
    }
    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SCHEMA_NAME.plannings
                        (id, owner_id, title, key, start_date, end_date, time_precision, start_daily_hour, end_daily_hour, require_account) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, owner_id = $2, title = $3, key = $4, start_date = $5, end_date = $6, time_precision = $7, start_daily_hour = $8, end_daily_hour = $9, require_account = $10;",
                self.id(), self.owner_id, self.title, self.key, self.start_date, self.end_date, self.time_precision, self.start_daily_hour, self.end_daily_hour, self.require_account);
        } else {
            let res = query_object!(db, PlanningId, "INSERT INTO SCHEMA_NAME.plannings
                        (owner_id, title, key, start_date, end_date, time_precision, start_daily_hour, end_daily_hour, require_account) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
                self.owner_id, self.title, self.key, self.start_date, self.end_date, self.time_precision, self.start_daily_hour, self.end_daily_hour, self.require_account);
            if let Some(res) = res {
                self.id = res;
            }
        }
        Ok(())
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        for user in PlanningUser::from_planning(db, self.id()).await? {
            PlanningUser::delete(&user, db).await?;
        }
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.plannings WHERE id = $1;"#, self.id());
        Ok(())
    }
}

impl Planning {
    pub fn id(&self) -> &PlanningId {
        &self.id
    }
}