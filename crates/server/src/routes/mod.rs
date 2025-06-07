use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use anyhow::Error;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::{IntoResponse};
use axum::Router;
use tracing::warn;
use crate::database::calendar::Calendar;
use crate::database::user::User;
use crate::routes::app_ctx::AppCtx;
use crate::routes::route_calendar::CalendarRoutes;
use crate::routes::route_event::EventRoutes;
use crate::routes::route_user::UserRoutes;

mod route_calendar;
pub mod app_ctx;
pub mod route_event;
pub mod route_user;

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
macro_rules! get_display_calendar {
    ($request:expr, $prop:ident, $body:expr, $or_else:expr) => {{
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.display_calendar().await.as_ref() {
            {$body}
        } else {
            $or_else
        }
    }};

    ($request:expr, $prop:ident, $body:expr) => (
        let req_ctx = $request.extensions().get::<std::sync::Arc<crate::routes::RequestContext>>().unwrap();
        if let Some($prop) = req_ctx.display_calendar().await.as_ref() {
            $body
        }
    );
}

#[macro_export]
macro_rules! require_display_calendar {
    ($request:expr) => {{
        crate::require_display_calendar!($request, display_calendar, {
            display_calendar.clone()
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
    pub display_calendar: tokio::sync::RwLock<Option<Calendar>>,
    pub is_web_client: AtomicBool,
}

impl RequestContext {
    pub async fn connected_user(&self) -> tokio::sync::RwLockReadGuard<Option<User>> {
        self.connected_user.read().await
    }
    #[allow(unused)]
    pub async fn connected_user_mut(&self) -> tokio::sync::RwLockWriteGuard<Option<User>> {
        self.connected_user.write().await
    }


    pub async fn display_calendar(&self) -> tokio::sync::RwLockReadGuard<Option<Calendar>> {
        self.display_calendar.read().await
    }
    #[allow(unused)]
    pub async fn display_calendar_mut(&self) -> tokio::sync::RwLockWriteGuard<Option<Calendar>> {
        self.display_calendar.write().await
    }
}

pub struct ApiRoutes {}

impl ApiRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router<>, Error> {
        let router = Router::new()
            .nest("/calendar", CalendarRoutes::create(ctx)?)
            .nest("/event", EventRoutes::create(ctx)?)
            .nest("/user", UserRoutes::create(ctx)?)
            .fallback(handler_404);
        Ok(router)
    }
}

async fn handler_404(_: Request<Body>) -> impl IntoResponse {
    warn!("\t\t'-> 404 : NOT FOUND");
    (StatusCode::NOT_FOUND, "Not found !")
}
