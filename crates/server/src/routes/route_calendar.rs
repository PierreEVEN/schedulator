use crate::database::calendar::Calendar;
use crate::database::calendar_users::CalendarUser;
use crate::routes::app_ctx::AppCtx;
use crate::server_error::ServerError;
use crate::types::database_ids::{CalendarId, CalendarUserId};
use crate::types::enc_string::EncString;
use crate::{get_connected_user, require_connected_user};
use anyhow::Error;
use axum::body::Body;
use axum::extract::{FromRequest, Path, Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub struct CalendarRoutes {}

impl CalendarRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router, Error> {
        let router = Router::new()
            .route("/create/", post(create).with_state(ctx.clone()))
            .route("/delete/", post(delete).with_state(ctx.clone()))
            .route("/my_calendars/", get(my_calendars).with_state(ctx.clone()))
            .route("/get/{key}/", get(get_calendar).with_state(ctx.clone()))
            .route("/add_user/", post(add_user).with_state(ctx.clone()))
            .route("/find_or_create_user/", post(find_or_create_user).with_state(ctx.clone()))
            .route("/remove_user/", post(remove_user).with_state(ctx.clone()));
        Ok(router)
    }
}

async fn create(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {
    let user = require_connected_user!(request);

    #[derive(Deserialize)]
    pub struct CreateCalendarData {
        title: EncString,
        start: i64,
        end: i64,
        time_precision: i64,
        start_daily_hour: i64,
        end_daily_hour: i64,
        require_account: bool,
    }

    let key = EncString::from("todo");

    let calendar_data = Json::<CreateCalendarData>::from_request(request, &ctx).await?;
    if Calendar::from_key(&ctx.database, &key).await.is_ok() {
        return Err(ServerError::msg(
            StatusCode::FORBIDDEN,
            "A repository with this key already exists",
        ));
    }
    let mut calendar = Calendar::default();
    calendar.title = calendar_data.title.clone();
    calendar.start_date = calendar_data.start.clone();
    calendar.end_date = calendar_data.end.clone();
    calendar.owner_id = user.id().clone();
    calendar.time_precision = calendar_data.time_precision.clone();
    calendar.start_daily_hour = calendar_data.start_daily_hour.clone();
    calendar.end_daily_hour = calendar_data.end_daily_hour.clone();
    calendar.require_account = calendar_data.require_account;
    Calendar::push(&mut calendar, &ctx.database).await?;
    Ok(Json(calendar))
}

/// Get repositories owned by connected user
async fn my_calendars(State(ctx): State<Arc<AppCtx>>, request: Request) -> impl IntoResponse {
    let user = require_connected_user!(request);
    Ok(Json(Calendar::from_user(&ctx.database, user.id()).await?))
}

async fn get_calendar(
    State(ctx): State<Arc<AppCtx>>,
    Path(path): Path<EncString>,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Serialize)]
    pub struct CalendarData {
        calendar: Calendar,
        users: Vec<CalendarUser>,
    }
    let calendar = Calendar::from_key(&ctx.database, &path).await?;
    Ok(Json(CalendarData { users: CalendarUser::from_calendar(&ctx.database, calendar.id()).await?, calendar }))
}

/// Delete repository
async fn delete(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    let connected_user = require_connected_user!(request);

    #[derive(Deserialize)]
    pub struct RequestParams {
        pub calendar_key: EncString,
    }

    let data = Json::<RequestParams>::from_request(request, &ctx).await?;

    for calendar in Calendar::from_user(&ctx.database, connected_user.id()).await? {
        if calendar.key.encoded() == data.calendar_key.encoded() {
            calendar.delete(&ctx.database).await?;
            return Ok(Json(vec![calendar.id().clone()]));
        }
    }
    return Err(ServerError::msg(
        StatusCode::FORBIDDEN,
        "You don't own this calendar",
    ));
}

/// Get all root items of a repository
pub async fn find_or_create_user(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    let user = require_connected_user!(request);

    #[derive(Deserialize)]
    pub struct RequestParams {
        pub calendar: CalendarId,
    }
    let data = Json::<RequestParams>::from_request(request, &ctx).await?;

    if let Ok(found) = CalendarUser::from_user(&ctx.database, &data.calendar, user.id()).await {
        return Ok(Json(found));
    };

    let mut calendar_user = CalendarUser::default();
    calendar_user.name = user.display_name.clone();
    calendar_user.user_id = Some(user.id().clone());
    calendar_user.calendar_id = data.calendar.clone();
    CalendarUser::push(&mut calendar_user, &ctx.database).await?;
    Ok(Json(calendar_user))
}

/// Get all root items of a repository
pub async fn add_user(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Deserialize)]
    pub struct CreateUserData {
        name: EncString,
        calendar: CalendarId,
    }

    let mut user = None;
    get_connected_user!(request, found_user, user = Some(found_user.clone()));
    let user_id = match &user {
        None => None,
        Some(user) => Some(user.id().clone()),
    };

    let data = Json::<CreateUserData>::from_request(request, &ctx).await?;

    if data.name.is_empty() {
        return Err(ServerError::msg(StatusCode::NOT_ACCEPTABLE, "Name cannot be empty"));
    }

    if CalendarUser::from_username(&ctx.database, &data.calendar, &data.name).await.is_ok() {
        return Err(ServerError::msg(
            StatusCode::FORBIDDEN,
            format!("A calendar user named {} already exists", data.name),
        ));
    }

    let mut calendar_user = CalendarUser::default();
    calendar_user.name = data.name.clone();
    calendar_user.user_id = user_id;
    calendar_user.calendar_id = data.calendar.clone();
    CalendarUser::push(&mut calendar_user, &ctx.database).await?;
    Ok(Json(calendar_user))
}

/// Get trash root items of a repository
pub async fn remove_user(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    let owner = require_connected_user!(request);
    let data = Json::<Vec<CalendarUserId>>::from_request(request, &ctx).await?;

    for removed in &data.0 {
        let calendar_user = CalendarUser::from_id(&ctx.database, &removed).await?;
        let calendar = Calendar::from_id(&ctx.database, &calendar_user.calendar_id).await?;

        if calendar.owner_id != *owner.id() {
            return Err(ServerError::msg(
                StatusCode::FORBIDDEN,
                "Forbidden : not owning this calendar",
            ));
        }

        calendar_user.delete(&ctx.database).await?;
    }

    Ok(Json(data.0))
}
