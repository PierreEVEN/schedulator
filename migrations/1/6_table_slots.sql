CREATE TABLE IF NOT EXISTS SCHEMA_NAME.slots (
        id BIGSERIAL PRIMARY KEY,
        planning BIGINT,
        title VARCHAR(200) NOT NULL,
        owner BIGINT NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT NOT NULL,
        source VARCHAR(200) NOT NULL,
        presence REAL NOT NULL DEFAULT 0,
        FOREIGN KEY(planning) REFERENCES SCHEMA_NAME.plannings(id),
        FOREIGN KEY(owner) REFERENCES SCHEMA_NAME.planning_users(id)
    );