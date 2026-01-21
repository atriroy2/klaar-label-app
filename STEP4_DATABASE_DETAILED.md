# Step 4: Detailed Database Setup Guide

This guide provides detailed instructions for setting up a PostgreSQL database for your application.

## Prerequisites

Before starting, make sure you have:
- ✅ Created your Vercel project (Step 2)
- ✅ Set up Google OAuth (Step 3)
- ✅ A Vercel account (for Vercel Postgres option)
- ✅ Or an account with another PostgreSQL provider

**Note**: This database setup is **required** for the app to work. Unlike GCP (which is only needed for test automation features), the database is essential for user management, authentication, and all core features.

---

## Database Options

You have several options for hosting your PostgreSQL database. Choose the one that best fits your needs:

### Option A: Vercel Postgres (Recommended - Easiest Integration)
- ✅ Seamless integration with Vercel
- ✅ Automatic connection string management
- ✅ Free tier available
- ✅ Easy to set up

### Option B: Supabase (Popular Alternative)
- ✅ Free tier with generous limits
- ✅ Built-in dashboard and tools
- ✅ Easy to use

### Option C: Other PostgreSQL Providers
- Railway, Neon, AWS RDS, etc.
- More control, but requires more setup

---

## Option A: Vercel Postgres (Recommended)

### A.1 Create Vercel Postgres Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project (the one you created in Step 2)
3. Navigate to the **Storage** tab
4. Click **Create Database**
5. Select **Postgres** from the options
6. Choose a plan:
   - **Hobby** (Free): Good for development and small apps
   - **Pro**: For production apps with more resources
7. Select a region:
   - Choose the region closest to your users
   - Or the same region as your Vercel deployment
8. Click **Create**
9. Wait for the database to be created (usually takes 1-2 minutes)

### A.2 Get Connection String

1. Once created, you'll see your database in the Storage tab
2. Click on the database name
3. Go to the **.env.local** tab (or **Settings** tab)
4. You'll see your connection string in this format:
   ```
   postgres://default:password@host.region.aws.neon.tech:5432/database?sslmode=require
   ```
5. **Copy this connection string** - you'll use it as `DATABASE_URL`
6. **Important**: This connection string is automatically added to your Vercel environment variables, but you'll need it for local development too

### A.3 Verify Database Connection

1. In the Vercel database dashboard, you should see:
   - Database name
   - Region
   - Connection status (should be "Connected")
2. You can test the connection using the Vercel dashboard

---

## Option B: Supabase

### B.1 Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Sign up or log in
3. Click **New Project**
4. Fill in the project details:
   - **Name**: Enter a project name (e.g., "Leave App")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine to start
5. Click **Create new project**
6. Wait for project creation (takes 1-2 minutes)

### B.2 Get Connection String

1. Once your project is created, go to **Settings** (gear icon in left sidebar)
2. Click **Database** in the settings menu
3. Scroll down to **Connection string**
4. Click on **URI** tab
5. You'll see a connection string like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. **Replace `[YOUR-PASSWORD]`** with the password you created in B.1
7. **Copy the complete connection string** - this is your `DATABASE_URL`

### B.3 Get Connection Pooling String (Optional but Recommended)

For better performance, Supabase also provides a connection pooling string:

1. In the same Database settings page
2. Look for **Connection pooling** section
3. Select **Session mode** or **Transaction mode**
4. Copy the connection string (it will have a different port, usually 6543)
5. Use this for production if you expect high traffic

---

## Option C: Other PostgreSQL Providers

### C.1 Create Database

The exact steps depend on your provider, but generally:

1. Sign up for a PostgreSQL hosting service (Railway, Neon, AWS RDS, etc.)
2. Create a new database
3. Note down:
   - Host
   - Port (usually 5432)
   - Database name
   - Username
   - Password

### C.2 Build Connection String

Format your connection string as:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Example:
```
postgresql://myuser:mypassword@db.example.com:5432/mydatabase?schema=public
```

**Important**: 
- Replace all placeholders with actual values
- URL-encode special characters in password if needed
- Add `?sslmode=require` if SSL is required

---

## Part 2: Run Database Migrations Locally

Now that you have your database connection string, let's set up the database schema.

### 2.1 Set Up Local Environment

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Create `.env.local` file**:
   ```bash
   # In your project root directory
   cp .env.example .env.local
   ```

3. **Update `.env.local` with your database URL**:
   ```bash
   # Open .env.local in your editor
   DATABASE_URL="your-connection-string-here"
   ```
   
   **Important**: 
   - Use the connection string you got from your database provider
   - Keep the quotes around the connection string
   - Make sure there are no extra spaces

### 2.2 Run Prisma Migrations

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```
   This creates the Prisma client based on your schema.

2. **Run migrations to create database schema**:
   ```bash
   npx prisma migrate dev
   ```
   
   This will:
   - Create a new migration file
   - Apply it to your database
   - Create all the tables defined in `prisma/schema.prisma`
   
3. **If prompted for a migration name**, enter something descriptive like:
   ```
   init
   ```
   or
   ```
   initial_schema
   ```

4. **Verify the migration succeeded**:
   - You should see output like "Migration applied successfully"
   - No error messages

### 2.3 Verify Database Schema

1. **Open Prisma Studio** (visual database browser):
   ```bash
   npx prisma studio
   ```
   
2. This will:
   - Open a browser window (usually at `http://localhost:5555`)
   - Show all your database tables
   - Allow you to browse and edit data

3. **Check that tables were created**:
   - You should see tables like:
     - `User`
     - `Account`
     - `Session`
     - `Tenant`
     - `TodoItem`
     - And others from your schema

4. **Close Prisma Studio** when done (Ctrl+C in terminal)

---

## Part 3: Set Up Database for Production (Vercel)

### 3.1 If Using Vercel Postgres

If you used Vercel Postgres (Option A):
- ✅ The connection string is **automatically added** to your Vercel environment variables
- ✅ It's available as `POSTGRES_URL` or `DATABASE_URL`
- ✅ No manual setup needed!

**Just verify**:
1. Go to Vercel project → **Settings** → **Environment Variables**
2. Look for `POSTGRES_URL` or `DATABASE_URL`
3. It should be there automatically

### 3.2 If Using Other Providers

If you used Supabase or another provider:

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Add:
   - **Key**: `DATABASE_URL`
   - **Value**: Your connection string (the one you used locally)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

**Important**: 
- Use the same connection string format as local
- For Supabase, you might want to use the connection pooling string for production
- Make sure the database allows connections from Vercel's IP addresses

---

## Part 4: Common Issues and Solutions

### Issue: "Can't reach database server"

**Symptoms**: Migration fails with connection error.

**Solutions**:
1. Check your connection string is correct
2. Verify database is running and accessible
3. Check if database allows connections from your IP (some providers require IP whitelisting)
4. For Supabase: Make sure you replaced `[YOUR-PASSWORD]` in the connection string
5. Try connecting with a database client (like pgAdmin) to verify the connection string works

### Issue: "Migration failed" or "Schema already exists"

**Symptoms**: Error when running `npx prisma migrate dev`.

**Solutions**:
1. If database already has tables, you might need to reset:
   ```bash
   npx prisma migrate reset
   ```
   **Warning**: This will delete all data!
   
2. Or create a fresh database and try again

3. If you want to keep existing data, use:
   ```bash
   npx prisma db push
   ```
   This syncs schema without creating migration files

### Issue: "Environment variable not found"

**Symptoms**: Prisma can't find `DATABASE_URL`.

**Solutions**:
1. Make sure `.env.local` exists in project root
2. Check the file has `DATABASE_URL=` (no spaces around `=`)
3. Verify the connection string is in quotes if it contains special characters
4. Restart your terminal/IDE after creating `.env.local`

### Issue: Prisma Studio won't open

**Solutions**:
1. Make sure database connection is working first
2. Try a different port:
   ```bash
   npx prisma studio --port 5556
   ```
3. Check if port 5555 is already in use

---

## Part 5: Verify Everything Works

### 5.1 Test Local Connection

1. Run Prisma Studio:
   ```bash
   npx prisma studio
   ```
2. If it opens and shows tables, your local connection works!

### 5.2 Test Production Connection (After Deployment)

1. After deploying to Vercel, check the build logs
2. Look for any database connection errors
3. If you see errors, verify:
   - `DATABASE_URL` is set in Vercel environment variables
   - Database allows connections from Vercel
   - Connection string is correct

---

## Part 6: Database Security Best Practices

### 6.1 Connection String Security

- ✅ Never commit `.env.local` to Git (it should be in `.gitignore`)
- ✅ Use different databases for development and production
- ✅ Rotate passwords regularly
- ✅ Use connection pooling for production (Supabase, Vercel Postgres do this automatically)

### 6.2 Access Control

- ✅ Limit database access to only what's needed
- ✅ Use read-only users for analytics/reporting if possible
- ✅ Regularly review who has access to your database

---

## Quick Reference: Connection String Formats

### Vercel Postgres
```
postgres://default:password@host.region.aws.neon.tech:5432/database?sslmode=require
```

### Supabase
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

### Generic PostgreSQL
```
postgresql://username:password@host:port/database?schema=public
```

---

## What You Need for Next Steps

After completing this step, you should have:

1. ✅ **Database created** and running
2. ✅ **Connection string** saved securely
3. ✅ **Database schema** created (migrations run)
4. ✅ **DATABASE_URL** set in:
   - `.env.local` (for local development)
   - Vercel environment variables (for production)

---

## Next Steps

Once your database is set up:

1. ✅ Proceed to Step 5 (Generate Secrets) or Step 7 (Environment Variables)
2. ✅ You'll add `DATABASE_URL` to Vercel environment variables (if not using Vercel Postgres)
3. ✅ After deployment, you can create your first user in the database

---

**Troubleshooting Tip**: If you're having connection issues, try connecting with a database client tool first (like DBeaver, pgAdmin, or TablePlus) to verify your connection string works before running Prisma migrations.

