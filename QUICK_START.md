# Quick Start Guide - klaar-label-app

Follow these steps to get your new app up and running.

## Prerequisites
- Node.js installed (v18 or higher)
- A new Supabase project created
- Google OAuth credentials (reuse from your existing app)

---

## Step 1: Open the Project in Cursor

1. Open Cursor
2. File → Open Folder (or `Cmd+O` / `Ctrl+K Ctrl+O`)
3. Navigate to and select: `/Users/atriroy/klaar-label-app`

---

## Step 2: Get Your Supabase Database Connection String

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your new project
3. Navigate to: **Project Settings** (cog icon) → **Database**
4. Under "Connection string", find the **URI**
5. **Important**: Change the port from `5432` to `6543` (connection pooling port)
6. Format should be:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?sslmode=require
   ```
7. Copy this connection string

---

## Step 3: Set Up Environment Variables

1. Create/update `.env.local` in the project root
2. Add the following variables:

```env
# Database (use your Supabase connection string from Step 2)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?sslmode=require"

# NextAuth Secret (generate a new one)
# Run this command in terminal: openssl rand -base64 32
NEXTAUTH_SECRET="paste_your_generated_secret_here"

# Application URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (reuse from your existing app)
GOOGLE_CLIENT_ID="your_existing_google_client_id"
GOOGLE_CLIENT_SECRET="your_existing_google_client_secret"
```

3. Generate NEXTAUTH_SECRET by running in terminal:
   ```bash
   openssl rand -base64 32
   ```
   Copy the output and paste it as the value for `NEXTAUTH_SECRET`

---

## Step 4: Install Dependencies

Open terminal in Cursor and run:

```bash
npm install
```

Wait for all packages to install.

---

## Step 5: Generate Prisma Client

```bash
npx prisma generate
```

This generates the Prisma client based on your schema.

---

## Step 6: Remove Old Migrations (if any exist)

```bash
rm -rf prisma/migrations
```

This ensures we start with a clean migration history.

---

## Step 7: Create Initial Database Migration

```bash
npx prisma migrate dev --name init
```

This will:
- Create all necessary tables in your Supabase database
- Create tables: `User`, `Tenant`, `Account`, `Session`, `VerificationToken`

When prompted, confirm that you want to create the migration.

---

## Step 8: Initialize First Tenant and Super Admin

```bash
npx ts-node scripts/init-first-tenant.ts
```

**OR** if `ts-node` doesn't work:

```bash
npx tsx scripts/init-first-tenant.ts
```

This script will:
- Create a tenant named "Default Tenant"
- Create a super admin user with email: `atri@klaarhq.com`
- Link the user to the tenant

You should see output like:
```
✓ Created tenant: Default Tenant (ID: ...)
✓ Created super admin user: atri@klaarhq.com (ID: ...)
✓ Initialization complete!
```

---

## Step 9: Verify Database Setup (Optional)

You can inspect your database using Prisma Studio:

```bash
npx prisma studio
```

This opens a web interface where you can see:
- The `Tenant` table with your default tenant
- The `User` table with your super admin user

Press `Ctrl+C` to exit when done.

---

## Step 10: Start the Development Server

```bash
npm run dev
```

The app will start at: `http://localhost:3000`

---

## Step 11: Log In

1. Open your browser and go to: `http://localhost:3000`
2. You'll be redirected to the login page
3. Click "Sign in with Google"
4. Use the email: `atri@klaarhq.com` (or any email configured in your Google OAuth project)
5. **Important**: Make sure `atri@klaarhq.com` is added as a test user in your Google Cloud Console OAuth settings

---

## What You Should See After Login

- **Dashboard**: A blank welcome page (ready for your new features)
- **Super Admin** (in sidebar): Manage tenants
- **Admin Settings → User List** (for tenant admins): Manage users

---

## Troubleshooting

### "User not found" error on login
- Make sure you ran Step 8 (init script) successfully
- Verify the user exists in the database using Prisma Studio

### "Cannot connect to database" error
- Check your `DATABASE_URL` in `.env.local`
- Ensure you're using port `6543` (not `5432`)
- Verify your Supabase project is active

### Migration errors
- Make sure you removed old migrations (Step 6)
- Check that your database is empty or you're okay with resetting it
- Verify `DATABASE_URL` is correct

### Prisma client errors
- Run `npx prisma generate` again
- Restart your dev server

---

## Next Steps

Once everything is running:
1. Start building your new features on the blank dashboard
2. Add more tenants via the Super Admin page
3. Create users via Admin Settings → User List

---

## Summary of What Was Removed

- Leave management (requests, policies, types, balances)
- Holidays and holiday schedules
- Locations
- Todo lists
- Test cases and test runs
- Banners
- API keys and API configs
- Queue management
- Manager/team/department features

## What Remains

- Multi-tenant architecture
- User management (create, edit, activate/deactivate)
- Role-based access control (USER, TENANT_ADMIN, SUPER_ADMIN)
- Google OAuth authentication
- Tenant management for super admins

---

**You're all set!** 🎉
