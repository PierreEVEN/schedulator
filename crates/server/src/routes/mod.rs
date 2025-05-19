use std::sync::Arc;
use anyhow::Error;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse};
use axum::Router;
use tracing::warn;
use crate::database::planning::Planning;
use crate::routes::app_ctx::AppCtx;
use crate::routes::route_planning::PlanningRoutes;
use crate::routes::route_slot::SlotRoutes;
use crate::types::user::User;

mod route_planning;
pub mod permissions;
pub mod app_ctx;
pub mod route_slot;

#[macro_export]
macro_rules! get_connected_user {
    ($request:expr, $prop:ident, $body:expr, $or_else:expr) => {{
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.connected_user().await.as_ref() {
            {$body}
        } else {
            $or_else
        }
    }};

    ($request:expr, $prop:ident, $body:expr) => (
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.connected_user().await.as_ref() {
            $body
        }
    );
}

#[macro_export]
macro_rules! require_connected_user {
    ($request:expr) => {{
        crate::get_connected_user!($request, connected_user, {
            connected_user.clone()
        }, {
            return Err(ServerError::msg(axum::http::StatusCode::UNAUTHORIZED, "Not connected"))
        })
    }};
}


#[macro_export]
macro_rules! get_display_planning {
    ($request:expr, $prop:ident, $body:expr, $or_else:expr) => {{
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.display_planning().await.as_ref() {
            {$body}
        } else {
            $or_else
        }
    }};

    ($request:expr, $prop:ident, $body:expr) => (
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.display_planning().await.as_ref() {
            $body
        }
    );
}

#[macro_export]
macro_rules! require_display_planning {
    ($request:expr) => {{
        crate::require_display_planning!($request, display_planning, {
            display_planning.clone()
        }, {
            return Err(ServerError::msg(StatusCode::UNAUTHORIZED, "Invalid repository"))
        })
    }};
}

#[macro_export]
macro_rules! get_action {
    ($request:expr) => (
        $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap().action().await
    );
}

#[derive(Default, Debug)]
pub struct RequestContext {
    pub connected_user: tokio::sync::RwLock<Option<User>>,
    pub display_planning: tokio::sync::RwLock<Option<Planning>>,
}

impl RequestContext {
    pub async fn connected_user(&self) -> tokio::sync::RwLockReadGuard<Option<User>> {
        self.connected_user.read().await
    }
    #[allow(unused)]
    pub async fn connected_user_mut(&self) -> tokio::sync::RwLockWriteGuard<Option<User>> {
        self.connected_user.write().await
    }


    pub async fn display_planning(&self) -> tokio::sync::RwLockReadGuard<Option<Planning>> {
        self.display_planning.read().await
    }
    #[allow(unused)]
    pub async fn display_planning_mut(&self) -> tokio::sync::RwLockWriteGuard<Option<Planning>> {
        self.display_planning.write().await
    }
}

pub struct ApiRoutes {}

impl ApiRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router<>, Error> {
        let router = Router::new()
            .nest("/planning/", PlanningRoutes::create(ctx)?)
            .nest("/slot/", SlotRoutes::create(ctx)?)
            .fallback(handler_404);
        Ok(router)
    }
}

async fn handler_404(_: Request<Body>) -> impl IntoResponse {
    warn!("\t\t'-> 404 : NOT FOUND");
    (StatusCode::NOT_FOUND, "Not found !")
}
