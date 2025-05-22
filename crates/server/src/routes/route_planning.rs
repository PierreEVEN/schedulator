use crate::database::planning::Planning;
use crate::database::planning_users::PlanningUser;
use crate::routes::app_ctx::AppCtx;
use crate::server_error::ServerError;
use crate::types::database_ids::{PlanningId, PlanningUserId};
use crate::types::enc_string::EncString;
use crate::{get_connected_user, require_connected_user};
use anyhow::Error;
use axum::body::Body;
use axum::extract::{FromRequest, Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use std::sync::Arc;

pub struct PlanningRoutes {}

impl PlanningRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router, Error> {
        let router = Router::new()
            .route("/create/", post(create).with_state(ctx.clone()))
            .route("/delete/", post(delete).with_state(ctx.clone()))
            .route("/my_plannings/", get(my_plannings).with_state(ctx.clone()))
            .route("/get/", get(get_planning).with_state(ctx.clone()))
            .route("/add_user/", post(add_user).with_state(ctx.clone()))
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
    pub struct CreatePlanningData {
        title: EncString,
        start: i64,
        end: i64,
        time_precision: i64,
        start_daily_hour: i64,
        end_daily_hour: i64,
    }

    let key = EncString::from("todo");

    let planning_data = Json::<CreatePlanningData>::from_request(request, &ctx).await?;
    let mut plannings = vec![];
    if Planning::from_key(&ctx.database, &key).await.is_ok() {
        return Err(ServerError::msg(
            StatusCode::FORBIDDEN,
            "A repository with this key already exists",
        ));
    }
    let mut planning = Planning::default();
    planning.title = planning_data.title.clone();
    planning.start_date = planning_data.start.clone();
    planning.end_date = planning_data.end.clone();
    planning.owner_id = user.id().clone();
    planning.time_precision = planning_data.time_precision.clone();
    planning.start_daily_hour = planning_data.start_daily_hour.clone();
    planning.end_daily_hour = planning_data.end_daily_hour.clone();
    Planning::push(&mut planning, &ctx.database).await?;
    plannings.push(planning);
    Ok(Json(plannings))
}

/// Get repositories owned by connected user
async fn my_plannings(State(ctx): State<Arc<AppCtx>>, request: Request) -> impl IntoResponse {
    let user = require_connected_user!(request);
    Ok(Json(Planning::from_user(&ctx.database, user.id()).await?))
}

async fn get_planning(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Deserialize)]
    pub struct CreatePlanningData {
        planning_key: EncString,
    }

    let data = Json::<CreatePlanningData>::from_request(request, &ctx).await?;

    Ok(Json(
        Planning::from_key(&ctx.database, &data.planning_key).await?,
    ))
}

/// Delete repository
async fn delete(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    let connected_user = require_connected_user!(request);

    #[derive(Deserialize)]
    pub struct RequestParams {
        pub planning_key: EncString,
    }

    let data = Json::<RequestParams>::from_request(request, &ctx).await?;

    for planning in Planning::from_user(&ctx.database, connected_user.id()).await? {
        if planning.key.encoded() == data.planning_key.encoded() {
            planning.delete(&ctx.database).await?;
            return Ok(Json(vec![planning.id().clone()]));
        }
    }
    return Err(ServerError::msg(
        StatusCode::FORBIDDEN,
        "You don't own this planning",
    ));
}

/// Get all root items of a repository
pub async fn add_user(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Deserialize)]
    pub struct CreatePlanningData {
        optional_name: Option<EncString>,
        planning: PlanningId,
    }

    let mut user = None;
    get_connected_user!(request, found_user, user = Some(found_user.clone()));
    let user_id = match &user {
        None => None,
        Some(user) => Some(user.id().clone()),
    };

    let data = Json::<CreatePlanningData>::from_request(request, &ctx).await?;

    let name = match &data.optional_name {
        None => {
            let user = match &user {
                None => return Err(ServerError::msg(StatusCode::FORBIDDEN, "Unknown user")),
                Some(user) => user,
            };
            user.display_name.clone()
        }
        Some(name) => name.clone(),
    };

    if PlanningUser::from_user(&ctx.database, &data.planning, &name)
        .await
        .is_ok()
    {
        return Err(ServerError::msg(
            StatusCode::FORBIDDEN,
            "A repository with this key already exists",
        ));
    }

    let mut planning_user = PlanningUser::default();
    planning_user.name = name;
    planning_user.user_id = user_id;
    planning_user.planning_id = data.planning.clone();
    PlanningUser::push(&mut planning_user, &ctx.database).await?;
    Ok(Json(planning_user))
}

/// Get trash root items of a repository
pub async fn remove_user(
    State(ctx): State<Arc<AppCtx>>,
    request: axum::http::Request<Body>,
) -> Result<impl IntoResponse, ServerError> {
    let owner = require_connected_user!(request);
    let data = Json::<Vec<PlanningUserId>>::from_request(request, &ctx).await?;

    for removed in &data.0 {
        let planning_user = PlanningUser::from_id(&ctx.database, &removed).await?;
        let planning = Planning::from_id(&ctx.database, &planning_user.planning_id).await?;

        if planning.owner_id != *owner.id() {
            return Err(ServerError::msg(
                StatusCode::FORBIDDEN,
                "Forbidden : not owning this planning",
            ));
        }

        planning_user.delete(&ctx.database).await?;
    }

    Ok(Json(data.0))
}
