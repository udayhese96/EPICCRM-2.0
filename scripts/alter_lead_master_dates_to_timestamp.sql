-- Convert *_call_date columns from DATE to TIMESTAMP for better precision
-- Safe on Postgres: USING clause casts existing values to midnight timestamps

ALTER TABLE lead_master
  ALTER COLUMN first_call_date TYPE TIMESTAMP USING
    CASE WHEN first_call_date IS NULL THEN NULL ELSE first_call_date::timestamp END,
  ALTER COLUMN second_call_date TYPE TIMESTAMP USING
    CASE WHEN second_call_date IS NULL THEN NULL ELSE second_call_date::timestamp END,
  ALTER COLUMN third_call_date TYPE TIMESTAMP USING
    CASE WHEN third_call_date IS NULL THEN NULL ELSE third_call_date::timestamp END,
  ALTER COLUMN fourth_call_date TYPE TIMESTAMP USING
    CASE WHEN fourth_call_date IS NULL THEN NULL ELSE fourth_call_date::timestamp END,
  ALTER COLUMN fifth_call_date TYPE TIMESTAMP USING
    CASE WHEN fifth_call_date IS NULL THEN NULL ELSE fifth_call_date::timestamp END,
  ALTER COLUMN sixth_call_date TYPE TIMESTAMP USING
    CASE WHEN sixth_call_date IS NULL THEN NULL ELSE sixth_call_date::timestamp END,
  ALTER COLUMN seventh_call_date TYPE TIMESTAMP USING
    CASE WHEN seventh_call_date IS NULL THEN NULL ELSE seventh_call_date::timestamp END;



