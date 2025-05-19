use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, PlanningId, PlanningUserId, UserId};
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};
use crate::database::slot::Slot;
use crate::types::enc_string::EncString;

#[derive(Debug, Default, FromRow, Serialize, Deserialize)]
pub struct PlanningUser {
    id: PlanningUserId,
    pub name: EncString,
    pub planning_id: PlanningId,
    pub user_id: Option<UserId>,
}

impl PlanningUser {
    pub async fn from_id(db: &Database, id: &PlanningUserId) -> Result<Self, Error> {
        Ok(query_object!(db, PlanningUser, "SELECT * FROM SCHEMA_NAME.planning_users WHERE id = $1", id).unwrap())
    }

    pub async fn from_planning(db: &Database, id: &PlanningId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.planning_users WHERE id = $1", id))
    }

    pub async fn from_user(db: &Database, id: &PlanningId, name: &EncString) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.planning_users WHERE id = $1 AND name = $2", id, name))
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        Slot::delete_from_user(db, &self.id).await?;
        query_fmt!(db, "DELETE FROM SCHEMA_NAME.planning_users WHERE id = $1;", self.id);
        Ok(())
    }

    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SHEMA_NAME.planning_users
                        (id, name, planning_id, user_id) VALUES
                        ($1, $2, $3, $4)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, name = $2, planning_id = $3, user_id = $4;",
                self.id(), self.name, self.planning_id, self.user_id);
        } else {
            let res = query_object!(db, PlanningUserId, "INSERT INTO SHEMA_NAME.planning_users
                        (name, planning_id, user_id) VALUES
                        ($1, $2, $3) RETURNING id",
                self.name, self.planning_id, self.user_id);
            if let Some(res) = res {
                self.id = res;;
            }
        }
        Ok(())
    }
}

impl PlanningUser {
    pub fn id(&self) -> &PlanningUserId {
        &self.id
    }
}