use crate::database::Database;
use crate::routes::RequestContext;
use crate::server_error::ServerError;
use crate::types::database_ids::PlanningId;
use axum::extract::Request;
use axum::http::StatusCode;
use std::sync::Arc;

pub struct Permissions {
    request_context: Arc<RequestContext>,
}

unsafe impl Send for Permissions {}
unsafe impl Sync for Permissions {}

pub enum PermissionResult {
    Granted,
    Denied,
}

impl PermissionResult {
    pub fn require(&self) -> Result<(), ServerError> {
        match self {
            PermissionResult::Denied => { Err(ServerError::msg(StatusCode::FORBIDDEN, "Access denied")) }
            _ => { Ok(()) }
        }
    }

    pub fn granted(&self) -> bool {
        match self {
            PermissionResult::Granted => { true }
            _ => { false }
        }
    }
}

impl Permissions {
    pub fn new(request: &Request) -> Result<Self, ServerError> {
        Ok(Self {
            request_context: request.extensions().get::<Arc<RequestContext>>().unwrap().clone(),
        })
    }

    pub async fn view_planning(&self, db: &Database, repository_id: &PlanningId) -> Result<PermissionResult, ServerError> {
        Ok(PermissionResult::Denied)
    }
}