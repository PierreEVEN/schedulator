CREATE TABLE IF NOT EXISTS SCHEMA_NAME.planning_users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        planning_id BIGINT NOT NULL,
        user_id BIGINT,
        FOREIGN KEY(planning_id) REFERENCES SCHEMA_NAME.plannings(id),
        FOREIGN KEY(user_id) REFERENCES SCHEMA_NAME.users(id),
        UNIQUE (name, planning_id)
    );