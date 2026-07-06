-- Create AnalyticsRecord for storing platform performance metrics
CREATE TABLE "AnalyticsRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT,
    "postId" TEXT,
    "platform" TEXT NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "followerDelta" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsRecord_workspaceId_date_idx" ON "AnalyticsRecord"("workspaceId", "date");
CREATE INDEX "AnalyticsRecord_workspaceId_platform_date_idx" ON "AnalyticsRecord"("workspaceId", "platform", "date");
CREATE INDEX "AnalyticsRecord_brandId_date_idx" ON "AnalyticsRecord"("brandId", "date");
CREATE INDEX "AnalyticsRecord_postId_idx" ON "AnalyticsRecord"("postId");

ALTER TABLE "AnalyticsRecord" ADD CONSTRAINT "AnalyticsRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;

-- Create WorkspaceBilling for subscription/usage tracking
CREATE TABLE "WorkspaceBilling" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "seatsTotal" INTEGER NOT NULL DEFAULT 5,
    "seatsUsed" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "nextBillingAt" TIMESTAMPTZ,
    "paymentMethod" TEXT,
    "paymentLast4" TEXT,
    "paymentBrand" TEXT,
    "aiGenerationLimit" INTEGER NOT NULL DEFAULT 1000,
    "aiGenerationUsed" INTEGER NOT NULL DEFAULT 0,
    "apiCallLimit" INTEGER NOT NULL DEFAULT 50000,
    "apiCallUsed" INTEGER NOT NULL DEFAULT 0,
    "storageLimitMb" INTEGER NOT NULL DEFAULT 5000,
    "storageUsedMb" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "WorkspaceBilling_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceBilling_workspaceId_key" ON "WorkspaceBilling"("workspaceId");

ALTER TABLE "WorkspaceBilling" ADD CONSTRAINT "WorkspaceBilling_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;

-- Create BrandMemoryDocument for document ingestion
CREATE TABLE "BrandMemoryDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "embedded" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "BrandMemoryDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandMemoryDocument_workspaceId_brandId_idx" ON "BrandMemoryDocument"("workspaceId", "brandId");
CREATE INDEX "BrandMemoryDocument_brandId_embedded_idx" ON "BrandMemoryDocument"("brandId", "embedded");

ALTER TABLE "BrandMemoryDocument" ADD CONSTRAINT "BrandMemoryDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "BrandMemoryDocument" ADD CONSTRAINT "BrandMemoryDocument_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE;
