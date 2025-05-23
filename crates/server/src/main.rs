use crate::config::{Config, WebClientConfig};
use crate::database::user::User;
use crate::routes::app_ctx::AppCtx;
use crate::routes::{ApiRoutes, RequestContext};
use crate::server_error::ServerError;
use crate::types::enc_string::EncString;
use crate::web_client::{get_origin, WebClient};
use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::{Request, StatusCode};
use axum::middleware::Next;
use axum::response::{Html, IntoResponse, Response};
use axum::{middleware, Router};
use axum_extra::extract::CookieJar;
use axum_server::tls_rustls::RustlsConfig;
use axum_server_dual_protocol::{tokio, ServerExt};
use chrono::{DateTime, Utc};
use http_body_util::BodyExt;
use serde::Serialize;
use std::fs::OpenOptions;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::atomic::Ordering::SeqCst;
use std::sync::Arc;
use std::{env, fs};
use tracing::{error, info, warn, Level};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::{filter, fmt, Layer, Registry};

mod config;
mod database;
mod routes;
mod server_error;
mod types;
mod web_client;

async fn start_web_client(config: WebClientConfig) {
    match WebClient::new(&config).await {
        Ok(_) => {
            info!("Successfully started web client.")
        }
        Err(err) => {
            error!("Failed to start web client : {err}");
        }
    };
}

#[derive(Default)]
struct Server {
    listeners: Vec<SocketAddr>,
}

impl Server {
    pub fn add_listener(&mut self, addr: SocketAddr) {
        self.listeners.push(addr);
    }

    pub async fn start(&self, config: &Config, router: Router) {
        let mut spawned_threads = vec![];

        let tls_config = if config.use_tls {
            if !config.tls_config.certificate.exists() || !config.tls_config.private_key.exists() {
                error!(
                    "Invalid tls certificate paths : cert:'{}' / key:'{}'",
                    config.tls_config.certificate.display(),
                    config.tls_config.private_key.display()
                );
                return;
            }

            Some(
                match RustlsConfig::from_pem_file(
                    config.tls_config.certificate.clone(),
                    config.tls_config.private_key.clone(),
                )
                .await
                {
                    Ok(config) => config,
                    Err(err) => {
                        error!("Invalid tls configuration : {err}");
                        return;
                    }
                },
            )
        } else {
            None
        };

        for addr in self.listeners.clone() {
            let router = router.clone();
            let tls_config = tls_config.clone();
            spawned_threads.push(tokio::spawn(async move {
                if let Some(tls_config) = &tls_config {
                    match axum_server_dual_protocol::bind_dual_protocol(addr, tls_config.clone())
                        .set_upgrade(true)
                        .serve(router.into_make_service())
                        .await
                    {
                        Ok(_) => {}
                        Err(err) => {
                            error!("Cannot start secured web server : {err}");
                        }
                    };
                } else {
                    axum::serve(
                        match tokio::net::TcpListener::bind(addr).await {
                            Ok(listener) => listener,
                            Err(error) => {
                                error!("Cannot start unsecured web server : {error}");
                                return;
                            }
                        },
                        router,
                    )
                    .await
                    .unwrap();
                }
            }))
        }

        for thread in spawned_threads {
            match thread.await {
                Ok(_) => {}
                Err(err) => {
                    error!("Server thread ended : {err}")
                }
            };
        }
    }
}

#[tokio::main]
async fn main() {
    /*********************** INITIALIZE LOGGER ***********************/
    fs::create_dir_all("schedulator_logs").unwrap();
    let error_file = "schedulator_logs/errors.log";
    let log_file = "schedulator_logs/logs.log";
    if fs::exists(error_file).unwrap() {
        let last_write_time: DateTime<Utc> =
            fs::metadata(error_file).unwrap().modified().unwrap().into();
        let last_write_time = format!("{last_write_time}")
            .replace(":", "-")
            .replace(" ", "_");
        fs::rename(
            error_file,
            format!("schedulator_logs/error_{}.log", last_write_time),
        )
        .unwrap();
    }

    if fs::exists(log_file).unwrap() {
        let last_write_time: DateTime<Utc> =
            fs::metadata(log_file).unwrap().modified().unwrap().into();
        let last_write_time = format!("{last_write_time}")
            .replace(":", "-")
            .replace(" ", "_");
        fs::rename(
            log_file,
            format!("schedulator_logs/logs_{}.log", last_write_time),
        )
        .unwrap();
    }

    let err_file = OpenOptions::new()
        .append(true)
        .create(true)
        .open(error_file)
        .unwrap();
    let debug_file = OpenOptions::new()
        .append(true)
        .create(true)
        .open(log_file)
        .unwrap();

    let subscriber = Registry::default()
        .with(
            // stdout layer, to view everything in the console
            fmt::layer().compact().with_ansi(true),
        )
        .with(
            // log-error file, to log the errors that arise
            fmt::layer()
                .with_ansi(false)
                .with_writer(err_file)
                .with_filter(filter::LevelFilter::from_level(Level::WARN)),
        )
        .with(
            // log-debug file, to log the debug
            fmt::layer().with_ansi(false).with_writer(debug_file),
        );

    tracing::subscriber::set_global_default(subscriber).unwrap();

    /*********************** OPEN CONFIG  ***********************/

    let config = match Config::from_file(
        env::current_exe()
            .expect("Failed to find executable path")
            .parent()
            .unwrap()
            .join("config.json"),
    ) {
        Ok(config) => config,
        Err(error) => {
            error!("Failed to load config : {}", error);
            return;
        }
    };

    let ctx = Arc::new(match AppCtx::new(config.clone()).await {
        Ok(ctx) => ctx,
        Err(error) => {
            error!("Failed to load app context : {error}");
            return;
        }
    });

    /*********************** READ ARGS  ***********************/

    let args: Vec<String> = env::args().collect();
    let mut it = args.iter();
    it.next().expect("Expected first arg");
    while let Some(arg) = it.next() {
        match arg.as_str() {
            "-migrate" => {
                let dir = it.next().expect("Missing <migration_dir> parameter");
                ctx.database
                    .migrate(
                        PathBuf::from(dir),
                        &config.backend_config.postgres.scheme_name,
                    )
                    .await
                    .expect("Failed to migrate database");
                return;
            }
            val => {
                error!("Unknown arg : {}", val);
                return;
            }
        }
    }

    // Start web client
    start_web_client(config.web_client_config.clone()).await;

    // Instantiate router
    let router = Router::new()
        .nest("/api/", ApiRoutes::create(&ctx).unwrap())
        .merge(WebClient::router(&ctx).unwrap())
        .layer(middleware::from_fn_with_state(
            ctx.clone(),
            print_request_response,
        ))
        .layer(middleware::from_fn_with_state(
            ctx.clone(),
            middleware_get_request_context,
        ));

    // Create http server
    let mut server = Server::default();
    for address in &config.addresses {
        match SocketAddr::from_str(address.as_str()) {
            Ok(addr) => {
                server.add_listener(addr);
            }
            Err(err) => {
                error!("Invalid server address '{}' : {err}", address);
            }
        };
    }
    server.start(&ctx.config, router).await;

    info!("Server closed !");
}

pub async fn handle_error() {}

pub async fn middleware_get_request_context(
    jar: CookieJar,
    State(ctx): State<Arc<AppCtx>>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, ServerError> {
    let mut context = RequestContext::default();

    let token = match jar.get("authtoken") {
        None => {
            match request
                .headers()
                .get("content-authtoken")
                .map(EncString::try_from)
            {
                None => None,
                Some(header) => Some(Ok(header?)),
            }
        }
        Some(token) => Some(EncString::from_url_path(token.value().to_string())),
    };

    if let Some(token) = token {
        context.connected_user =
            tokio::sync::RwLock::new(match User::from_auth_token(&ctx.database, &token?).await {
                Ok(connected_user) => Some(connected_user),
                Err(_) => None,
            })
    }

    let uri = request.uri().clone();
    let user_string = if let Some(user) = &*context.connected_user().await {
        format!("#{}", user.display_name)
    } else {
        String::from("{?}")
    };
    info!("[{}] {} | {}", request.method(), user_string, uri);
    request.extensions_mut().insert(Arc::new(context));
    Ok(next.run(request).await)
}
async fn print_request_response(
    State(ctx): State<Arc<AppCtx>>,
    req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, impl IntoResponse> {
    let path = req.uri().path().to_string();
    let origin = get_origin(&ctx, &req)?;

    // Retrieve the request context object
    let context = match req.extensions().get::<Arc<RequestContext>>() {
        None => None,
        Some(context) => Some(context.clone()),
    };

    // Execute the request and get the response
    let mut res = next.run(req).await;

    if !res.status().is_success() {
        // Get response message
        let (parts, body) = res.into_parts();
        let bytes = match buffer_and_print("response", body).await {
            Ok(res) => res,
            Err((code, msg)) => return Err(ServerError::msg(code, msg)),
        };
        let data_string = match String::from_utf8(bytes.as_ref().to_vec()) {
            Ok(data) => data,
            Err(err) => {
                error!("Failed to convert body to string : {}", err);
                return Ok(Response::from_parts(parts, Body::from(bytes)));
            }
        };

        warn!("{} ({}) : {}", parts.status, path, data_string);
        // Embed the response into a html webpage if it was sent from a web client
        if let Some(context) = context {
            if context.is_web_client.load(SeqCst) {
                let index_path_buf = ctx
                    .config
                    .web_client_config
                    .client_path
                    .join("public")
                    .join("index.html");
                let index_path = index_path_buf.to_str().unwrap();
                let index_data = match fs::read_to_string(index_path) {
                    Ok(file) => file,
                    Err(err) => {
                        return Err(ServerError::msg(
                            StatusCode::INTERNAL_SERVER_ERROR,
                            format!("Cannot find index file : {err} (searching in {index_path})"),
                        ))
                    }
                };

                #[derive(Serialize, Default)]
                struct ErrorInfos {
                    origin: String,
                    error_message: String,
                    error_code: String,
                }
                let infos = ErrorInfos {
                    origin,
                    error_message: data_string,
                    error_code: parts.status.to_string(),
                };

                let index_data = index_data.replace(
                    r#"data-app_config='{}'"#,
                    format!(
                        r##"data-app_config='{}'"##,
                        match serde_json::to_string(&infos) {
                            Ok(data) => {
                                data.replace("'", "&apos;")
                            }
                            Err(err) => {
                                return Err(ServerError::msg(
                                    StatusCode::INTERNAL_SERVER_ERROR,
                                    err.to_string(),
                                ));
                            }
                        }
                    )
                    .as_str(),
                );

                return Ok(Html(index_data).into_response());
            }
        }

        res = Response::from_parts(parts, Body::from(bytes));
    }
    Ok(res)
}

async fn buffer_and_print<B>(direction: &str, body: B) -> Result<Bytes, (StatusCode, String)>
where
    B: axum::body::HttpBody<Data = Bytes>,
    B::Error: std::fmt::Display,
{
    let bytes = match body.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(err) => {
            return Err((
                StatusCode::BAD_REQUEST,
                format!("failed to read {direction} body: {err}"),
            ));
        }
    };
    Ok(bytes)
}
