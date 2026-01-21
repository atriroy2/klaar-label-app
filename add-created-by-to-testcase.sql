-- Add createdById column as nullable first
ALTER TABLE "TestCase" ADD COLUMN "createdById" TEXT;

-- Get the ID of an admin user to assign as the creator for existing records
DO $$
DECLARE
    admin_id TEXT;
BEGIN
    -- Find a SUPER_ADMIN or TENANT_ADMIN user, or any user if none found
    SELECT id INTO admin_id FROM "User" WHERE role = 'SUPER_ADMIN' LIMIT 1;
    
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM "User" WHERE role = 'TENANT_ADMIN' LIMIT 1;
    END IF;
    
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM "User" LIMIT 1;
    END IF;

    -- Update existing records with the admin ID
    IF admin_id IS NOT NULL THEN
        UPDATE "TestCase" SET "createdById" = admin_id WHERE "createdById" IS NULL;
    END IF;
END $$;

-- Make the column required
ALTER TABLE "TestCase" ALTER COLUMN "createdById" SET NOT NULL;

-- Create index for createdById
CREATE INDEX "TestCase_createdById_idx" ON "TestCase"("createdById");

-- Add foreign key constraint
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 