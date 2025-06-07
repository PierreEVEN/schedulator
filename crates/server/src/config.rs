use anyhow::Error;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct PostgresConfig {
    pub username: String,
    pub secret: String,
    pub url: String,
    pub port: u16,
    pub database: String,
    pub ssl_mode: bool,
    pub scheme_name: String,
    pub default_migrations: String
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct WebClientConfig {
    pub client_path: PathBuf,
    pub debug: bool,
    pub check_for_packages_updates: bool,
    pub build_webpack: bool,
    pub force_secure_requests: bool
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct TlsConfig {
    pub certificate: PathBuf,
    pub private_key: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Default, Clone)]
pub struct BackendConfig {
    pub postgres: PostgresConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    pub addresses: Vec<String>,
    pub backend_config: BackendConfig,
    pub web_client_config: WebClientConfig,
    pub tls_config: TlsConfig,
    pub use_tls: bool
}

impl Default for Config {
    fn default() -> Self {
        Self {
            addresses: vec!["127.0.0.1:3000".to_string()],
            backend_config: BackendConfig {
                postgres: PostgresConfig {
                    username: "postgres".to_string(),
                    secret: "postgres".to_string(),
                    url: "127.0.0.1".to_string(),
                    port: 5432,
                    database: "postgres".to_string(),
                    ssl_mode: false,
                    scheme_name: "schedulator".to_string(),
                    default_migrations: "./migrations".to_string(),
                },
            },
            web_client_config: WebClientConfig {
                client_path: PathBuf::from("./webclient"),
                debug: false,
                check_for_packages_updates: true,
                build_webpack: true,
                force_secure_requests: false,
            },
            tls_config: TlsConfig {
                certificate: PathBuf::from("/Path/To/certificate.pem"),
                private_key: PathBuf::from("/Path/To/private_key.pem"),
            },
            use_tls: true
        }
    }
}

impl Config {
    pub fn from_file(path: PathBuf) -> Result<Self, Error> {
        if path.exists() {
            Ok(serde_json::from_str(&fs::read_to_string(path)?)?)
        }
        else {
            fs::write(path.clone(), serde_json::to_string_pretty(&Config::default())?)?;
            Err(Error::msg("Created a new config file. Please fill in information first"))
        }
    }
}
