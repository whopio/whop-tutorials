/*
  Warnings:

  - A unique constraint covering the columns `[whopProductId]` on the table `Creator` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "whopProductId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Creator_whopProductId_key" ON "Creator"("whopProductId");
