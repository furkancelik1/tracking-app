-- Gamification Phase 2: Badge & Onboarding System

-- Add hasSeenTour column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasSeenTour" BOOLEAN NOT NULL DEFAULT false;

-- Create BadgeCriteriaType enum
DO $$ BEGIN
    CREATE TYPE "BadgeCriteriaType" AS ENUM ('STREAK', 'TOTAL_COMPLETIONS', 'COIN_EARNED', 'FIRST_HABIT', 'ALL_DONE', 'TOUR_COMPLETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Badge table
CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "criteriaType" "BadgeCriteriaType" NOT NULL,
    "criteriaValue" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_name_key" ON "Badge"("name");

-- Create UserBadge table
CREATE TABLE IF NOT EXISTS "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "UserBadge"("userId");

-- Foreign keys
DO $$ BEGIN
    ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Seed: Default badges
INSERT INTO "Badge" ("id", "name", "description", "icon", "criteriaType", "criteriaValue") VALUES
    ('badge-first-step',    'First Step',     'Created your first routine.',           'Star',        'FIRST_HABIT',         1),
    ('badge-7-day-streak',  '7 Day Streak',   'Maintained a 7-day streak!',            'Flame',       'STREAK',              7),
    ('badge-30-day-streak', '30 Day Streak',  'Maintained a 30-day streak!',           'Flame',       'STREAK',             30),
    ('badge-centurion',     'Centurion',      'Completed 100 routines total.',         'Target',      'TOTAL_COMPLETIONS', 100),
    ('badge-golden-boy',    'Golden Boy',     'Earned 1000 coins total!',              'Coins',       'COIN_EARNED',      1000),
    ('badge-all-star',      'All Star',       'Completed all routines in a day!',      'CheckCircle2','ALL_DONE',            1),
    ('badge-explorer',      'Explorer',       'Completed the onboarding tour.',        'Compass',     'TOUR_COMPLETE',       1)
ON CONFLICT ("name") DO NOTHING;
