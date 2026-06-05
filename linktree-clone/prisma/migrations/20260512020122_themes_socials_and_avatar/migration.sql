-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "bgKind" TEXT NOT NULL DEFAULT 'auto',
ADD COLUMN     "bgValue" TEXT,
ADD COLUMN     "cardStyle" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "textColor" TEXT NOT NULL DEFAULT 'auto';

-- CreateTable
CREATE TABLE "SocialLink" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
