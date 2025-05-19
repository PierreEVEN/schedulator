use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, PlanningId, PlanningUserId, SlotId};
use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;

#[derive(Debug, FromRow)]
pub struct Slot {
    id: SlotId,
    pub planning: PlanningId,
    pub title: String,
    pub owner: PlanningUserId,
    pub start: i64,
    pub end: i64,
    pub source: String
}

impl Slot {
    pub async fn from_id(db: &Database, id: &SlotId) -> Result<Self, Error> {
        Ok(query_object!(db, Slot, "SELECT * FROM SCHEMA_NAME.slots WHERE id = $1", id).unwrap())
    }

    pub async fn from_planning_user(db: &Database, id: &PlanningUserId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Slot, "SELECT * FROM SCHEMA_NAME.slots AND planning = $2", id))
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.slots WHERE id = $1;"#, self.id);
        Ok(())
    }

    pub async fn delete_from_user(db: &Database, user: &PlanningUserId) -> Result<(), Error> {
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.slots WHERE owner = $1;"#, user);
        Ok(())
    }

    pub async fn push(&mut self, db: &Database) -> Result<(), Error> {
        if self.id().is_valid() {
            query_fmt!(db, "INSERT INTO SHEMA_NAME.slots
                        (id, planning, title, owner, start, end) VALUES
                        ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, planning = $2, title = $3, owner = $4, start = $5, end = $6, source = $7;",
                self.id(), self.planning, self.title, self.owner, self.start, self.end, self.source);
        } else {
            let res = query_object!(db, SlotId, "INSERT INTO SHEMA_NAME.slots
                        (planning, title, owner, start, end) VALUES
                        ($1, $2, $3, $4, $5, $6) RETURNING id",
                self.planning, self.title, self.owner, self.start, self.end, self.source);
            if let Some(res) = res {
                self.id = res;
            }
        }
        Ok(())
    }

    pub fn id(&self) -> &SlotId {
        &self.id
    }
}
