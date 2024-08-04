-- CreateTable
CREATE TABLE "DiscountClaims" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "voucher" TEXT NOT NULL,
    "issued" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountClaims_pkey" PRIMARY KEY ("id")
);
