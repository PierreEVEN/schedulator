use crate::database::Database;
use crate::types::database_ids::{DatabaseIdTrait, PlanningId, PlanningUserId, SlotId};
use crate::types::enc_string::EncString;
use crate::{query_fmt, query_object};
use anyhow::Error;
use postgres_from_row::FromRow;
use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize, Deserialize, FromRow)]
pub struct Slot {
    id: SlotId,
    pub planning: PlanningId,
    pub title: EncString,
    pub owner: PlanningUserId,
    pub start_time: i64,
    pub end_time: i64,
    pub source: EncString,
    pub presence: f32
}

impl Slot {
    pub async fn from_id(db: &Database, id: &SlotId) -> Result<Self, Error> {
        Ok(query_object!(db, Slot, "SELECT * FROM SCHEMA_NAME.slots WHERE id = $1", id).unwrap())
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
            query_fmt!(db, "INSERT INTO SCHEMA_NAME.slots
                        (id, planning, title, owner, start_time, end_time, presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT(id) DO UPDATE SET
                        id = $1, planning = $2, title = $3, owner = $4, start_time = $5, end_time = $6, source = $7, presence = $8;",
                self.id(), self.planning, self.title, self.owner, self.start_time, self.end_time, self.source, self.presence);
        } else {
            let res = query_object!(db, SlotId, "INSERT INTO SCHEMA_NAME.slots
                        (planning, title, owner, start_time, end_time, presence) VALUES
                        ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                self.planning, self.title, self.owner, self.start_time, self.end_time, self.source, self.presence);
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
