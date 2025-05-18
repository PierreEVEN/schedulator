CREATE TABLE IF NOT EXISTS SCHEMA_NAME.users (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(200) UNIQUE NOT NULL,
        display_name VARCHAR(200) UNIQUE NOT NULL,
        password_hash VARCHAR(64) NOT NULL,
    );