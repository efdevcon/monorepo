-- CreateTable
CREATE TABLE "rate_limit" (
    "key" VARCHAR(255) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expire" BIGINT,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);
