CREATE TABLE IF NOT EXISTS SCHEMA_NAME.calendars (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL,
        title VARCHAR(200) NOT NULL,
        key CHAR(16) NOT NULL,
        start_date BIGINT NOT NULL,
        end_date BIGINT NOT NULL,
        time_precision BIGINT NOT NULL DEFAULT 1800000, -- 30mn in ms
        start_daily_hour BIGINT,
        end_daily_hour BIGINT,
        require_account BOOLEAN NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES SCHEMA_NAME.users(id)
    );