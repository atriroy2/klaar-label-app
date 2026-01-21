-- 1. Add createdById column as nullable first
ALTER TABLE "TestCase" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- 2. Find a user ID to use for existing records (preferably an admin)
-- This will store the user ID in a variable to update existing records
DO $$
DECLARE
    admin_id TEXT;
BEGIN
    -- Try to find a super admin first
    SELECT id INTO admin_id FROM "User" WHERE role = 'SUPER_ADMIN' LIMIT 1;
    
    -- If no super admin, try to find a tenant admin
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM "User" WHERE role = 'TENANT_ADMIN' LIMIT 1;
    END IF;
    
    -- If still no admin, just use any user
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM "User" LIMIT 1;
    END IF;
    
    -- Update existing records with the found user ID
    IF admin_id IS NOT NULL THEN
        UPDATE "TestCase" SET "createdById" = admin_id WHERE "createdById" IS NULL;
        RAISE NOTICE 'Updated existing test cases with user ID: %', admin_id;
    ELSE
        RAISE EXCEPTION 'No users found in the database to set as creator';
    END IF;
END $$;

-- 3. Now that all records have a value, make the column NOT NULL
ALTER TABLE "TestCase" ALTER COLUMN "createdById" SET NOT NULL;

-- 4. Add index and foreign key
CREATE INDEX IF NOT EXISTS "TestCase_createdById_idx" ON "TestCase"("createdById");
ALTER TABLE "TestCase" ADD CONSTRAINT IF NOT EXISTS "TestCase_createdById_fkey" 
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 