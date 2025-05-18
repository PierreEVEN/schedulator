
use anyhow::Error;
use crate::config::Config;
use crate::database::Database;

pub struct AppCtx {
    pub config: Config,
    pub database: Database
}

impl AppCtx {
    pub async fn new(config: Config) -> Result<Self, Error> {
        let database = Database::new(&config.backend_config).await?;

        Ok(Self {
            config,
            database,
        })
    }
}