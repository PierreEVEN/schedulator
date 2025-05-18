DO
$$
BEGIN
	CREATE TYPE SCHEMA_NAME.slot_kind AS ENUM ('unavailable', 'available');
	EXCEPTION WHEN DUPLICATE_OBJECT THEN
		RAISE NOTICE 'slot_kind already exists, skipping...';
END
$$;