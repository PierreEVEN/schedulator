CREATE TABLE IF NOT EXISTS SCHEMA_NAME.events (
        id BIGSERIAL PRIMARY KEY,
        calendar BIGINT,
        title VARCHAR(200) NOT NULL,
        owner BIGINT NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT NOT NULL,
        source VARCHAR(200) NOT NULL,
        presence REAL NOT NULL DEFAULT 0,
        FOREIGN KEY(calendar) REFERENCES SCHEMA_NAME.calendars(id),
        FOREIGN KEY(owner) REFERENCES SCHEMA_NAME.calendar_users(id)
    );