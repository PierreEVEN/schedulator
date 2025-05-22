CREATE TABLE IF NOT EXISTS SCHEMA_NAME.plannings (
        id BIGSERIAL PRIMARY KEY,
        owner_id BIGINT NOT NULL,
        title VARCHAR(200) NOT NULL,
        key CHAR(16) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        time_precision TIME NOT NULL DEFAULT '00:30:00',
        start_daily_hour TIME,
        end_daily_hour TIME,
        require_account BOOLEAN NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES SCHEMA_NAME.users(id)
    );