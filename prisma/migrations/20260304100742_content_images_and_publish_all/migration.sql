-- AlterTable
ALTER TABLE "Content" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "Content" ADD COLUMN "imagePrompt" TEXT;
ALTER TABLE "Content" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "contentSnapshot" TEXT;
ALTER TABLE "Post" ADD COLUMN "imageUrl" TEXT;
