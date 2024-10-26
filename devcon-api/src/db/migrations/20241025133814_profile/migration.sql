/*
  Warnings:

  - You are about to drop the column `role` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `yearsOfExperience` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the `DiscountClaims` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "role",
DROP COLUMN "yearsOfExperience",
ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "roles" TEXT[],
ADD COLUMN     "since" INTEGER;

-- DropTable
DROP TABLE "DiscountClaims";
