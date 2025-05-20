use crate::database::slot::Slot;
use crate::routes::app_ctx::AppCtx;
use crate::server_error::ServerError;
use crate::types::database_ids::{PlanningId, PlanningUserId, SlotId};
use crate::types::enc_string::EncString;
use anyhow::Error;
use axum::extract::{FromRequest, Request, State};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use std::sync::Arc;

pub struct SlotRoutes {}

impl SlotRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router, Error> {
        let router = Router::new()
            .route("/create/", post(create_slot).with_state(ctx.clone()))
            .route("/delete/", post(delete_slot).with_state(ctx.clone()));
        Ok(router)
    }
}


async fn create_slot(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Deserialize)]
    struct CreateSlotData {
        planning: PlanningId,
        title: EncString,
        owner: PlanningUserId,
        start: i64,
        end: i64,
        source: EncString,
    }

    let data = Json::<Vec<CreateSlotData>>::from_request(request, &ctx).await?;

    let mut slots = vec![];

    for slot in data.0 {
        let mut new_slot = Slot::default();
        new_slot.planning = slot.planning.clone();
        new_slot.title = slot.title.clone();
        new_slot.owner = slot.owner.clone();
        new_slot.start_time = slot.start.clone();
        new_slot.end_time = slot.end.clone();
        new_slot.source = slot.source.clone();

        new_slot.push(&ctx.database).await?;
        slots.push(new_slot);
    }

    Ok(Json(slots))
}

async fn delete_slot(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {

    let data = Json::<Vec<SlotId>>::from_request(request, &ctx).await?;

    for slot in data.0 {
        Slot::from_id(&ctx.database, &slot).await?.delete(&ctx.database).await?;
    }

    Ok(())
}