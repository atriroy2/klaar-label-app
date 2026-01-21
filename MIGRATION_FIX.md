# Fixing Database Migration Drift

The database schema has drifted from the migration history. Here's how to fix it:

## Current Situation

The database has:
- ✅ `HolidaySchedule` table (exists)
- ✅ `Holiday` table with `tenantId`, `year` (exists)
- ✅ `HolidayLocation` table (exists)
- ❌ `Holiday` table missing: `holidayScheduleId`, `name`, `type` columns
- ❌ `HolidaySchedule` table missing foreign key constraints

## Solution

### Option 1: Apply Migration Manually (Recommended)

Run this SQL directly on your database:

```sql
-- Add holidayScheduleId to Holiday (nullable, for holiday-schedules)
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "holidayScheduleId" TEXT;

-- Add name and type to Holiday (nullable, for holiday-schedules)
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Holiday" ADD COLUMN IF NOT EXISTS "type" "HolidayType";

-- Add foreign key for holidayScheduleId
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Holiday_holidayScheduleId_fkey'
    ) THEN
        ALTER TABLE "Holiday" 
        ADD CONSTRAINT "Holiday_holidayScheduleId_fkey" 
        FOREIGN KEY ("holidayScheduleId") 
        REFERENCES "HolidaySchedule"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for holidayScheduleId
CREATE INDEX IF NOT EXISTS "Holiday_holidayScheduleId_idx" ON "Holiday"("holidayScheduleId");

-- Ensure HolidaySchedule foreign keys exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'HolidaySchedule_locationId_fkey'
    ) THEN
        ALTER TABLE "HolidaySchedule" 
        ADD CONSTRAINT "HolidaySchedule_locationId_fkey" 
        FOREIGN KEY ("locationId") 
        REFERENCES "Location"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'HolidaySchedule_tenantId_fkey'
    ) THEN
        ALTER TABLE "HolidaySchedule" 
        ADD CONSTRAINT "HolidaySchedule_tenantId_fkey" 
        FOREIGN KEY ("tenantId") 
        REFERENCES "Tenant"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

### Option 2: Mark Migration as Applied

After running the SQL above, mark the migration as applied:

```bash
npx prisma migrate resolve --applied 20251214161350_add_calendar_system
```

Then create a new migration:

```bash
npx prisma migrate dev --name add_holiday_schedule_fields
```

### Option 3: Reset and Reapply (⚠️ Data Loss)

**WARNING: This will delete all data!**

```bash
npx prisma migrate reset
```

## For Vercel Deployment

Update your `package.json` build script to use `prisma migrate deploy` instead of `prisma migrate dev`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

Or better, use a postinstall script:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

And add a `vercel-build` script:

```json
{
  "scripts": {
    "vercel-build": "prisma migrate deploy && next build"
  }
}
```

## Verification

After applying the migration, verify the schema:

```bash
npx prisma db pull
npx prisma validate
```

The schema should now match the database structure.
