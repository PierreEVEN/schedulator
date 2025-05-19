use crate::database::planning::Planning;
use crate::database::user::DbUser;
use crate::require_connected_user;
use crate::routes::app_ctx::AppCtx;
use crate::routes::permissions::Permissions;
use crate::server_error::ServerError;
use crate::types::database_ids::{DatabaseId, PlanningId, UserId};
use crate::types::enc_string::EncString;
use anyhow::Error;
use axum::body::Body;
use axum::extract::{FromRequest, Path, Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use std::sync::Arc;

pub struct SlotRoutes {}

impl SlotRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router, Error> {
        let router = Router::new();
            /*
            .route("/create/", post(create_repository).with_state(ctx.clone()))
            .route("/delete/", post(find_repositories).with_state(ctx.clone()))
            .route("/delete_all/", post(find_repositories).with_state(ctx.clone()))*/
        Ok(router)
    }
}