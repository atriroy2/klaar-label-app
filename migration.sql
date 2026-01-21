-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'TENANT_ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "tenantId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "TodoItem_userId_idx" ON "TodoItem"("userId");

-- CreateIndex
CREATE INDEX "TodoItem_tenantId_idx" ON "TodoItem"("tenantId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add QUEUED status to RunStatus enum
ALTER TYPE "RunStatus" ADD VALUE 'QUEUED' BEFORE 'PENDING';

-- Create QueueStatus enum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Create TestQueue table
CREATE TABLE "TestQueue" (
    "id" TEXT NOT NULL,
    "testRunId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestQueue_pkey" PRIMARY KEY ("id")
);

-- Create QueueSettings table
CREATE TABLE "QueueSettings" (
    "id" TEXT NOT NULL,
    "maxParallelRuns" INTEGER NOT NULL DEFAULT 1,
    "lastProcessedAt" TIMESTAMP(3),
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockExpiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueSettings_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "TestQueue_status_queuedAt_idx" ON "TestQueue"("status", "queuedAt");
CREATE INDEX "TestQueue_position_idx" ON "TestQueue"("position");

-- Create unique constraint on testRunId
CREATE UNIQUE INDEX "TestQueue_testRunId_key" ON "TestQueue"("testRunId");

-- Add foreign key constraint
ALTER TABLE "TestQueue" ADD CONSTRAINT "TestQueue_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

