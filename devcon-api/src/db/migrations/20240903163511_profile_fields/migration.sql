-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "role" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "tracks" TEXT[],
ADD COLUMN     "yearsOfExperience" INTEGER;
