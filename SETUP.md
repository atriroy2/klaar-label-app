# Setup Guide - SaaS Boilerplate

Complete step-by-step guide to set up the SaaS boilerplate from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Setup](#database-setup)
4. [Google OAuth Setup](#google-oauth-setup)
5. [Environment Configuration](#environment-configuration)
6. [Initialize Database](#initialize-database)
7. [Run the Application](#run-the-application)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Required Accounts

- **Supabase Account** ([Sign up](https://supabase.com/))
- **Google Cloud Console Account** ([Sign up](https://console.cloud.google.com/))

## Project Setup

### 1. Clone the Repository

```bash
git clone git@github.com:atriroy2/saas-boilerplate.git
cd saas-boilerplate
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, Prisma, NextAuth, and UI components.

## Database Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (2-3 minutes)

### 2. Get Database Connection String

1. In your Supabase project, go to **Settings** → **Database**
2. Scroll to "Connection string"
3. Select **URI** tab
4. Copy the connection string
5. **Important**: Change port from `5432` to `6543` (connection pooling)

**Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?sslmode=require
```

Replace `[YOUR-PASSWORD]` with your database password and `[PROJECT-REF]` with your project reference.

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name and click "Create"

### 2. Enable Google+ API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - **User Type**: External (or Internal for Google Workspace)
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click "Save and Continue"
   - Add scopes: `email`, `profile`
   - Add test users (your email for development)
   - Click "Save and Continue"
4. Create OAuth client:
   - **Application type**: Web application
   - **Name**: Your app name
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://yourdomain.com/api/auth/callback/google` (production - add later)
   - Click "Create"
5. **Save the Client ID and Client Secret** - you'll need these!

## Environment Configuration

### 1. Create `.env.local` File

In the project root, create a file named `.env.local`:

```bash
touch .env.local
```

### 2. Add Environment Variables

Open `.env.local` and add the following:

```env
# Database Connection (from Supabase)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?sslmode=require"

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="paste_generated_secret_here"

# Application URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
```

### 3. Generate NEXTAUTH_SECRET

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET` in `.env.local`.

### 4. Replace Placeholder Values

- Replace `YOUR_PASSWORD` with your Supabase database password
- Replace `YOUR_PROJECT` with your Supabase project reference
- Replace `your_google_client_id_here` with your Google Client ID
- Replace `your_google_client_secret_here` with your Google Client Secret
- Replace `paste_generated_secret_here` with the generated secret

## Initialize Database

### 1. Generate Prisma Client

```bash
npx prisma generate
```

This creates the Prisma Client based on your schema.

### 2. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Set up relationships
- Create indexes

**Note**: If you see a prompt about resetting the database, type `y` to confirm (only if the database is empty).

### 3. Initialize First Tenant and Super Admin

```bash
npx tsx scripts/init-first-tenant.ts
```

Or if `tsx` doesn't work:

```bash
npx ts-node scripts/init-first-tenant.ts
```

This script will:
- Create a default tenant
- Create a super admin user with email: `atri@klaarhq.com`
- Link the user to the tenant

**Important**: Make sure the email you use is added as a test user in Google Cloud Console OAuth settings.

## Run the Application

### 1. Start Development Server

```bash
npm run dev
```

### 2. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

### 3. Sign In

1. Click "Sign in with Google"
2. Use the email you configured as a test user
3. You should be redirected to the dashboard

## Verify Setup

### Check Database

You can verify your database setup using Prisma Studio:

```bash
npx prisma studio
```

This opens a web interface at `http://localhost:5555` where you can:
- View all tables
- See your tenant and user records
- Verify data structure

### Check Authentication

1. Sign out and sign back in
2. Verify you can access:
   - Dashboard (all users)
   - Super Admin page (if super admin)
   - Admin Settings → User List (if tenant admin or super admin with tenant)

## Troubleshooting

### Database Connection Issues

**Error**: `Can't reach database server`

- Verify `DATABASE_URL` is correct
- Ensure you're using port `6543` (not `5432`)
- Check Supabase project is active
- Verify database password is correct

### Authentication Issues

**Error**: `User not found` or redirect to login error page

- Ensure you ran `npx tsx scripts/init-first-tenant.ts`
- Verify user exists in database (use Prisma Studio)
- Check email matches what's in database
- Ensure email is added as test user in Google Cloud Console

### Migration Errors

**Error**: Migration fails or tables already exist

- If database is empty: Run `npx prisma migrate reset` (WARNING: deletes all data)
- If database has data: Check for existing tables and conflicts
- Verify `DATABASE_URL` is correct

### Port Already in Use

**Error**: `Port 3000 is already in use`

- Kill the process using port 3000:
  ```bash
  # macOS/Linux
  lsof -ti:3000 | xargs kill -9
  
  # Or use a different port
  PORT=3001 npm run dev
  ```

### Session Not Updating

If role changes aren't reflected:

- Sign out completely
- Clear browser cookies for localhost:3000
- Sign back in
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Next Steps

Once setup is complete:

1. **Customize the Dashboard** - Edit `app/(app)/dashboard/page.tsx`
2. **Add Features** - Build on the multi-tenant foundation
3. **Customize UI** - Modify components in `components/` directory
4. **Deploy** - See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment

## Getting Help

- Check the [README.md](./README.md) for overview
- Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- Check Prisma logs for database errors
- Check browser console for client-side errors
- Check server logs for API errors

---

**Setup complete?** Start building your SaaS application! 🚀
