use crate::database::event::Event;
use crate::routes::app_ctx::AppCtx;
use crate::server_error::ServerError;
use crate::types::database_ids::{CalendarId, CalendarUserId, EventId};
use crate::types::enc_string::EncString;
use anyhow::Error;
use axum::extract::{FromRequest, Request, State};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde::Deserialize;
use std::sync::Arc;

pub struct EventRoutes {}

impl EventRoutes {
    pub fn create(ctx: &Arc<AppCtx>) -> Result<Router, Error> {
        let router = Router::new()
            .route("/create/", post(create_event).with_state(ctx.clone()))
            .route("/from-calendar/", post(from_calendar).with_state(ctx.clone()))
            .route("/delete/", post(delete_event).with_state(ctx.clone()));
        Ok(router)
    }
}


async fn create_event(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {
    #[derive(Deserialize)]
    struct CreateEventData {
        calendar: CalendarId,
        title: EncString,
        owner: CalendarUserId,
        start: i64,
        end: i64,
        source: EncString,
        presence: f32
    }

    let data = Json::<Vec<CreateEventData>>::from_request(request, &ctx).await?;

    let mut events = vec![];

    for event in data.0 {
        let mut new_event = Event::default();
        new_event.calendar = event.calendar.clone();
        new_event.title = event.title.clone();
        new_event.owner = event.owner.clone();
        new_event.start_time = event.start.clone();
        new_event.end_time = event.end.clone();
        new_event.source = event.source.clone();
        new_event.presence = event.presence;

        new_event.push(&ctx.database).await?;
        events.push(new_event);
    }

    Ok(Json(events))
}

async fn from_calendar(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {
    let data = Json::<CalendarId>::from_request(request, &ctx).await?;
    Ok(Json(Event::from_calendar(&ctx.database, &data).await?))
}

async fn delete_event(
    State(ctx): State<Arc<AppCtx>>,
    request: Request,
) -> Result<impl IntoResponse, ServerError> {

    let data = Json::<Vec<EventId>>::from_request(request, &ctx).await?;

    for event in data.0 {
        Event::from_id(&ctx.database, &event).await?.delete(&ctx.database).await?;
    }

    Ok(())
}