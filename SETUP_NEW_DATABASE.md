# Setting Up the New Database (klaar-label-app)

This app now only includes tenant management, user management, and Google-based authentication. Follow these steps to set up a fresh Supabase (or any Postgres) database for the new deployment.

## 1) Prepare environment variables

Create `.env.local` in `leaveapp/` (or update it) with:

```
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:6543/postgres?sslmode=require"
NEXTAUTH_SECRET=<generate_one>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<reuse your existing client id>
GOOGLE_CLIENT_SECRET=<reuse your existing client secret>
```

Generate a secret:

```
openssl rand -base64 32
```

## 2) Install and generate Prisma client

```
npm install
npx prisma generate
```

## 3) Run a fresh migration

There are no legacy migrations kept. Create a new initial migration:

```
npx prisma migrate dev --name init
```

This will create the tables:
- `User` (roles: USER, TENANT_ADMIN, SUPER_ADMIN)
- `Tenant`
- NextAuth tables: `Account`, `Session`, `VerificationToken`

## 4) Seed the first tenant and super admin

Run the script to create the first tenant and super admin (`atri@klaarhq.com`):

```
npx ts-node scripts/init-first-tenant.ts
# or
npx tsx scripts/init-first-tenant.ts
```

What it does:
- Creates a tenant named **"Default Tenant"** if it doesn't exist
- Creates or updates the user `atri@klaarhq.com` as `SUPER_ADMIN`
- Ensures the user is linked to the tenant and active

## 5) Start the app

```
npm run dev
```

Log in with Google using the super admin email. You should see:
- Dashboard (blank slate)
- Super Admin (manage tenants)
- Admin Settings → User List (for tenant admins)

## What was removed
- All leave management, holidays, locations, approvals, test/queue, banners, API keys/configs, todo list, and related UI/API code.

## What remains
- Multi-tenant foundation
- User management (create, edit, activate/deactivate)
- Roles: USER, TENANT_ADMIN, SUPER_ADMIN
- Google OAuth authentication
- Tenant management for super admins
