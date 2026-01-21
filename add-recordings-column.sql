-- Add recordings column to the TestRun table
ALTER TABLE "TestRun" ADD COLUMN IF NOT EXISTS "recordings" TEXT; 