CREATE TABLE IF NOT EXISTS SCHEMA_NAME.slots (
        id BIGSERIAL PRIMARY KEY,
        planning BIGINT,
        title VARCHAR(200) NOT NULL,
        owner BIGINT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        source VARCHAR(200) NOT NULL,
        FOREIGN KEY(planning) REFERENCES SCHEMA_NAME.plannings(id),
        FOREIGN KEY(owner) REFERENCES SCHEMA_NAME.planning_users(id)
    );