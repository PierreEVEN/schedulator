CREATE TABLE IF NOT EXISTS SCHEMA_NAME.slots (
        id BIGSERIAL PRIMARY KEY,
        planning_id BIGINT,
        title VARCHAR(200),
        user_id BIGINT NOT NULL,
        start TIMESTAMP NOT NULL,
        end TIMESTAMP NOT NULL,
        FOREIGN KEY(planning_id) REFERENCES SCHEMA_NAME.plannings(id),
        FOREIGN KEY(user_id) REFERENCES SCHEMA_NAME.users(id)
    );