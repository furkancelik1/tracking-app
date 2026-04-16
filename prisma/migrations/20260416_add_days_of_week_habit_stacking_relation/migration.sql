ALTER TABLE "Routine"
  ADD COLUMN IF NOT EXISTS "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Backfill from legacy specificDays when available.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Routine' AND column_name = 'specificDays'
  ) THEN
    EXECUTE '
      UPDATE "Routine"
      SET "daysOfWeek" = COALESCE("specificDays", ARRAY[]::INTEGER[])
      WHERE cardinality("daysOfWeek") = 0
    ';
  END IF;
END
$$;
