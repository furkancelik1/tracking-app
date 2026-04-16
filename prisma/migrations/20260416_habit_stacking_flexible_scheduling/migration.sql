-- Add flexible scheduling + habit stacking fields to Routine

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'RoutineFrequencyType'
  ) THEN
    CREATE TYPE "RoutineFrequencyType" AS ENUM ('DAILY', 'WEEKLY', 'SPECIFIC_DAYS');
  END IF;
END
$$;

ALTER TABLE "Routine"
  ADD COLUMN IF NOT EXISTS "frequencyType" "RoutineFrequencyType" NOT NULL DEFAULT 'DAILY',
  ADD COLUMN IF NOT EXISTS "weeklyTarget" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "specificDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "stackParentId" TEXT;

-- Backfill frequencyType safely from old frequency values.
UPDATE "Routine"
SET "frequencyType" = CASE
  WHEN "frequency" = 'WEEKLY' THEN 'WEEKLY'::"RoutineFrequencyType"
  WHEN "frequency" = 'MONTHLY' THEN 'WEEKLY'::"RoutineFrequencyType"
  ELSE 'DAILY'::"RoutineFrequencyType"
END
WHERE "frequencyType" = 'DAILY'::"RoutineFrequencyType";

CREATE INDEX IF NOT EXISTS "Routine_stackParentId_idx" ON "Routine"("stackParentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Routine_stackParentId_fkey'
  ) THEN
    ALTER TABLE "Routine"
      ADD CONSTRAINT "Routine_stackParentId_fkey"
      FOREIGN KEY ("stackParentId")
      REFERENCES "Routine"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
