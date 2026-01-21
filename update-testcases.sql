-- Update existing test cases with the provided user ID
UPDATE "TestCase" SET "createdById" = 'cm59wu3dw00018z77ud7gybk7' WHERE "createdById" IS NULL;

-- Once records are updated, make the column NOT NULL
ALTER TABLE "TestCase" ALTER COLUMN "createdById" SET NOT NULL; 