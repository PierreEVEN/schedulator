use anyhow::Error;
use serde::{Deserialize, Serialize};


use postgres_from_row::FromRow;

use postgres_types::private::BytesMut;

use postgres_types::{to_sql_checked, IsNull, Type};
use crate::types::database_ids::{DatabaseIdTrait, RepositoryId, UserId};
use crate::types::enc_string::EncString;

#[derive(Clone, Debug, Default, PartialEq, PartialOrd, Deserialize, Serialize)]
pub enum RepositoryStatus {
    #[default]
    Private,
    Hidden,
    Public,
}

impl From<String> for RepositoryStatus {
    fn from(value: String) -> Self {
        match value.as_str() {
            "private" => { RepositoryStatus::Private }
            "hidden" => { RepositoryStatus::Hidden }
            "public" => { RepositoryStatus::Public }
            _ => { RepositoryStatus::Private }
        }
    }
}


impl<'a> postgres_types::FromSql<'a> for RepositoryStatus {
    fn from_sql(ty: &Type, raw: &'a [u8]) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> { Ok(Self::from(String::from_sql(ty, raw)?)) }
    fn accepts(ty: &Type) -> bool { ty.name() == "repository_status" }
}

impl postgres_types::ToSql for RepositoryStatus {
    fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, Box<dyn std::error::Error + Sync + Send>> {
        match self {
            RepositoryStatus::Private => { "private".to_sql(ty, out) }
            RepositoryStatus::Hidden => { "hidden".to_sql(ty, out) }
            RepositoryStatus::Public => { "public".to_sql(ty, out) }
        }
    }
    fn accepts(ty: &Type) -> bool { ty.name() == "repository_status" }
    to_sql_checked!();
}

#[derive(Serialize, Deserialize, Debug, Default, Clone, FromRow)]
pub struct Repository {
    id: RepositoryId,
    pub url_name: EncString,
    pub owner: UserId,
    pub description: Option<EncString>,
    pub status: RepositoryStatus,
    pub display_name: EncString,
    pub max_file_size: Option<i64>,
    pub visitor_file_lifetime: Option<i64>,
    pub allow_visitor_upload: bool,
}

impl Repository {
    pub fn set_id(&mut self, id: RepositoryId) -> Result<(), Error> {
        if self.id.is_valid() {
            Err(Error::msg("Cannot override a valid id"))
        } else {
            self.id = id;
            Ok(())
        }
    }
    pub fn id(&self) -> &RepositoryId {
        &self.id
    }
}
