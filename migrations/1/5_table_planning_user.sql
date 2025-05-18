CREATE TABLE IF NOT EXISTS SCHEMA_NAME.planning_user (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(200),
        planning_id BIGINT,
        user_id BIGINT,
        FOREIGN KEY(planning_id) REFERENCES SCHEMA_NAME.plannings(id),
        FOREIGN KEY(user_id) REFERENCES SCHEMA_NAME.users(id)
    );