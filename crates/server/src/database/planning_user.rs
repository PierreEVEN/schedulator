use crate::database::Database;
use crate::types::database_ids::{PlanningId, PlanningUserId};
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use crate::database::slot::Slot;

#[derive(Debug, FromRow)]
pub struct PlanningUser {
    id: PlanningUserId,
    pub name: String,
    pub user_id: Option<PlanningId>,
}

impl PlanningUser {
    pub async fn from_id(db: &Database, id: &PlanningUserId) -> Result<Self, Error> {
        Ok(query_object!(db, PlanningUser, "SELECT * FROM SCHEMA_NAME.planning_users WHERE id = $1", id).unwrap())
    }

    pub async fn from_planning(db: &Database, id: &PlanningId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Self, "SELECT * FROM SCHEMA_NAME.planning_users WHERE id = $1", id))
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        Slot::delete_from_user(db, &self.id).await?;
        query_fmt!(db, "DELETE FROM SCHEMA_NAME.planning_users WHERE id = $1;", self.id);
        Ok(())
    }
}

impl PlanningUser {
    pub fn id(&self) -> &PlanningUserId {
        &self.id
    }
}