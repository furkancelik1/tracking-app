-- CreateEnum
CREATE TYPE "RoutineIntensity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Routine" ADD COLUMN "intensity" "RoutineIntensity" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Routine" ADD COLUMN "estimatedMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Routine" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Routine" ADD COLUMN "isGuided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Routine" ADD COLUMN "coachTip" TEXT;
