use crate::{query_fmt, query_object, query_objects};
use anyhow::Error;
use postgres_from_row::FromRow;
use crate::database::Database;
use crate::types::database_ids::{ItemId, ObjectId};
use std::path::{Path, PathBuf};

#[derive(Debug, FromRow)]
pub struct Object {
    #[allow(unused)]
    id: ObjectId,
    #[allow(unused)]
    pub hash: String,
}

#[allow(unused)]
impl Object {
    
    pub async fn from_id(db: &Database, id: &ObjectId) -> Result<Self, Error> {
        Ok(query_object!(db, Object, "SELECT * FROM SCHEMA_NAME.objects WHERE id = $1", id).unwrap())
    }

    pub async fn from_item(db: &Database, id: &ItemId) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Object, "SELECT * FROM SCHEMA_NAME.objects WHERE id = $1", id))
    }

    pub async fn from_hash(db: &Database, hash: &String) -> Result<Vec<Self>, Error> {
        Ok(query_objects!(db, Object, "SELECT * FROM SCHEMA_NAME.objects WHERE hash = $1", hash))
    }

    pub async fn insert(db: &Database, _: &Path, hash: &String) -> Result<Self, Error> {
        let new_object = query_object!(db, Self, "INSERT INTO SCHEMA_NAME.objects (hash) VALUES ($1) RETURNING *", hash).ok_or(Error::msg("Failed to insert object"))?;

        Ok(new_object)
    }

    pub async fn delete(&self, db: &Database) -> Result<(), Error> {
        Self::delete_objects(db, &vec![self.id.clone()]).await
    }

    pub async fn delete_objects(db: &Database, objects: &Vec<ObjectId>) -> Result<(), Error> {
        query_fmt!(db, r#"DELETE FROM SCHEMA_NAME.objects WHERE id = any($1);"#, objects);
        Ok(())
    }
    
    pub fn id(&self) -> &ObjectId {
        &self.id
    }


    pub async fn equals_to_file(&self, _: &Database, _: PathBuf) -> Result<bool, Error> {

        Ok(true)
    }
}
