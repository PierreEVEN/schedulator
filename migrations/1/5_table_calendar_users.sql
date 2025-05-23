CREATE TABLE IF NOT EXISTS SCHEMA_NAME.calendar_users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        calendar_id BIGINT NOT NULL,
        user_id BIGINT,
        FOREIGN KEY(calendar_id) REFERENCES SCHEMA_NAME.calendars(id),
        FOREIGN KEY(user_id) REFERENCES SCHEMA_NAME.users(id),
        UNIQUE (name, calendar_id)
    );