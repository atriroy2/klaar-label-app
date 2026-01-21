# Fix Prisma Client Errors

## Problem
You're seeing errors like:
- `TypeError: Cannot read properties of undefined (reading 'findMany')`
- This happens because the Prisma client hasn't been regenerated after adding new models

## Solution

Run these commands in your terminal:

```bash
# 1. Generate Prisma client (this reads the updated schema and generates TypeScript types)
npx prisma generate

# 2. Create and run the database migration (this creates the tables in your database)
npx prisma migrate dev --name add_leave_management

# 3. Restart your dev server
# Stop the current server (Ctrl+C) and then:
npm run dev
```

## What These Commands Do

1. **`npx prisma generate`**: 
   - Reads your `prisma/schema.prisma` file
   - Generates the Prisma Client with all the new models (LeaveType, LeavePolicy, etc.)
   - Creates TypeScript types for your models

2. **`npx prisma migrate dev`**:
   - Creates a migration file with SQL to create the new tables
   - Applies the migration to your database
   - Creates the tables: LeaveType, LeavePolicy, PolicyLeaveConfiguration, CreditEvent, UserPolicyAssignment

3. **Restart dev server**:
   - The new Prisma client needs to be loaded
   - Next.js needs to pick up the new types

## After Running These Commands

The errors should be resolved and you'll be able to:
- Create and view Leave Types
- Create and view Leave Policies
- View Credit Events

If you still see errors after running these commands, let me know!

