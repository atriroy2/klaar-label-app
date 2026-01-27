-- CreateEnum
CREATE TYPE "ModelProvider" AS ENUM ('OPENAI', 'GEMINI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "ConfigurationStatus" AS ENUM ('DRAFT', 'READY', 'EXECUTING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GenerationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PromptInstanceStatus" AS ENUM ('PENDING', 'GENERATING', 'READY_FOR_RATING', 'RATED');

-- CreateEnum
CREATE TYPE "RatingOutcome" AS ENUM ('A_BETTER', 'B_BETTER', 'BOTH_GOOD', 'NEITHER_GOOD');

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigTag" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ConfigTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "promptTemplate" TEXT NOT NULL,
    "modelProvider" "ModelProvider" NOT NULL DEFAULT 'OPENAI',
    "modelName" TEXT NOT NULL DEFAULT 'gpt-4',
    "apiKey" TEXT,
    "generationsPerInstance" INTEGER NOT NULL DEFAULT 2,
    "rubric" TEXT,
    "status" "ConfigurationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVariable" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptInstance" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "PromptInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RejectionReason" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectionReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "status" "GenerationRunStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" "ModelProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "totalInstances" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Completion" (
    "id" TEXT NOT NULL,
    "promptInstanceId" TEXT NOT NULL,
    "generationRunId" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "provider" "ModelProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingMatch" (
    "id" TEXT NOT NULL,
    "promptInstanceId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "optionACompletionId" TEXT NOT NULL,
    "optionBCompletionId" TEXT NOT NULL,
    "winnerCompletionId" TEXT,
    "outcome" "RatingOutcome",
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingResponse" (
    "id" TEXT NOT NULL,
    "ratingMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" "RatingOutcome" NOT NULL,
    "reasons" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalWinner" (
    "id" TEXT NOT NULL,
    "promptInstanceId" TEXT NOT NULL,
    "winningCompletionId" TEXT NOT NULL,
    "determinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_tenantId_idx" ON "Tag"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_tenantId_name_key" ON "Tag"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ConfigTag_configurationId_idx" ON "ConfigTag"("configurationId");

-- CreateIndex
CREATE INDEX "ConfigTag_tagId_idx" ON "ConfigTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigTag_configurationId_tagId_key" ON "ConfigTag"("configurationId", "tagId");

-- CreateIndex
CREATE INDEX "Configuration_tenantId_idx" ON "Configuration"("tenantId");

-- CreateIndex
CREATE INDEX "Configuration_status_idx" ON "Configuration"("status");

-- CreateIndex
CREATE INDEX "PromptVariable_configurationId_idx" ON "PromptVariable"("configurationId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVariable_configurationId_key_key" ON "PromptVariable"("configurationId", "key");

-- CreateIndex
CREATE INDEX "PromptInstance_configurationId_idx" ON "PromptInstance"("configurationId");

-- CreateIndex
CREATE INDEX "PromptInstance_status_idx" ON "PromptInstance"("status");

-- CreateIndex
CREATE INDEX "RejectionReason_configurationId_idx" ON "RejectionReason"("configurationId");

-- CreateIndex
CREATE INDEX "GenerationRun_configurationId_idx" ON "GenerationRun"("configurationId");

-- CreateIndex
CREATE INDEX "GenerationRun_status_idx" ON "GenerationRun"("status");

-- CreateIndex
CREATE INDEX "Completion_promptInstanceId_idx" ON "Completion"("promptInstanceId");

-- CreateIndex
CREATE INDEX "Completion_generationRunId_idx" ON "Completion"("generationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Completion_promptInstanceId_generationRunId_index_key" ON "Completion"("promptInstanceId", "generationRunId", "index");

-- CreateIndex
CREATE INDEX "RatingMatch_promptInstanceId_idx" ON "RatingMatch"("promptInstanceId");

-- CreateIndex
CREATE INDEX "RatingMatch_configurationId_idx" ON "RatingMatch"("configurationId");

-- CreateIndex
CREATE INDEX "RatingMatch_isComplete_idx" ON "RatingMatch"("isComplete");

-- CreateIndex
CREATE INDEX "RatingResponse_ratingMatchId_idx" ON "RatingResponse"("ratingMatchId");

-- CreateIndex
CREATE INDEX "RatingResponse_userId_idx" ON "RatingResponse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RatingResponse_ratingMatchId_userId_key" ON "RatingResponse"("ratingMatchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalWinner_promptInstanceId_key" ON "FinalWinner"("promptInstanceId");

-- CreateIndex
CREATE INDEX "FinalWinner_winningCompletionId_idx" ON "FinalWinner"("winningCompletionId");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigTag" ADD CONSTRAINT "ConfigTag_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigTag" ADD CONSTRAINT "ConfigTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVariable" ADD CONSTRAINT "PromptVariable_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptInstance" ADD CONSTRAINT "PromptInstance_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RejectionReason" ADD CONSTRAINT "RejectionReason_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_promptInstanceId_fkey" FOREIGN KEY ("promptInstanceId") REFERENCES "PromptInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Completion" ADD CONSTRAINT "Completion_generationRunId_fkey" FOREIGN KEY ("generationRunId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingMatch" ADD CONSTRAINT "RatingMatch_promptInstanceId_fkey" FOREIGN KEY ("promptInstanceId") REFERENCES "PromptInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingMatch" ADD CONSTRAINT "RatingMatch_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "Configuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingMatch" ADD CONSTRAINT "RatingMatch_optionACompletionId_fkey" FOREIGN KEY ("optionACompletionId") REFERENCES "Completion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingMatch" ADD CONSTRAINT "RatingMatch_optionBCompletionId_fkey" FOREIGN KEY ("optionBCompletionId") REFERENCES "Completion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingMatch" ADD CONSTRAINT "RatingMatch_winnerCompletionId_fkey" FOREIGN KEY ("winnerCompletionId") REFERENCES "Completion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingResponse" ADD CONSTRAINT "RatingResponse_ratingMatchId_fkey" FOREIGN KEY ("ratingMatchId") REFERENCES "RatingMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingResponse" ADD CONSTRAINT "RatingResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalWinner" ADD CONSTRAINT "FinalWinner_promptInstanceId_fkey" FOREIGN KEY ("promptInstanceId") REFERENCES "PromptInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalWinner" ADD CONSTRAINT "FinalWinner_winningCompletionId_fkey" FOREIGN KEY ("winningCompletionId") REFERENCES "Completion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
