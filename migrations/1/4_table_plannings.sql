CREATE TABLE IF NOT EXISTS SCHEMA_NAME.plannings (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL,
        title VARCHAR(200) NOT NULL,
        start TIMESTAMP NOT NULL,
        end TIMESTAMP NOT NULL,
        time_precision TIME NOT NULL DEFAULT "00:30:00",
        start_daily_hour TIME,
        end_daily_hour TIME,
        FOREIGN KEY(user_id) REFERENCES SCHEMA_NAME.users(id)
    );