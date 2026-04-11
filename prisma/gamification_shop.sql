-- Gamification: Shop & Item System
-- Add coins column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 0;

-- Create ItemType enum
DO $$ BEGIN
    CREATE TYPE "ItemType" AS ENUM ('STREAK_FREEZE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Item table
CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Item_name_key" ON "Item"("name");

-- Create UserItem table
CREATE TABLE IF NOT EXISTS "UserItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserItem_userId_itemId_key" ON "UserItem"("userId", "itemId");
CREATE INDEX IF NOT EXISTS "UserItem_userId_idx" ON "UserItem"("userId");

-- Foreign keys
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Streak Freeze item
INSERT INTO "Item" ("id", "name", "type", "price", "description", "icon")
VALUES (
    'streak-freeze-001',
    'Streak Freeze',
    'STREAK_FREEZE',
    100,
    'Protects your streak for one missed day.',
    'Snowflake'
) ON CONFLICT ("name") DO NOTHING;
