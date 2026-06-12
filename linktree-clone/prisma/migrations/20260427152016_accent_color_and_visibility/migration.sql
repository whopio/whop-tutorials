-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'violet';

-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;
