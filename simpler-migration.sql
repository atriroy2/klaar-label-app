-- 1. Add createdById column as nullable first
ALTER TABLE "TestCase" ADD COLUMN "createdById" TEXT;

-- 2. Get a valid user ID
SELECT id FROM "User" LIMIT 1;

-- Note: After seeing the ID, manually update the records
-- Run this line after replacing USER_ID with an actual ID:
-- UPDATE "TestCase" SET "createdById" = 'USER_ID' WHERE "createdById" IS NULL;

-- 3. Once records are updated, make the column NOT NULL
-- ALTER TABLE "TestCase" ALTER COLUMN "createdById" SET NOT NULL;

-- 4. Add index and foreign key
CREATE INDEX "TestCase_createdById_idx" ON "TestCase"("createdById");
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdById_fkey" 
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 