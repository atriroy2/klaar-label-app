# Troubleshooting Database Connection Issues

## Current Issue: Can't reach Supabase database

If you're getting `P1001: Can't reach database server`, try these solutions:

### Solution 1: Use Connection Pooling Port (Recommended)

Supabase recommends using port **6543** for connection pooling instead of 5432.

Update your `.env` file:
```bash
DATABASE_URL="postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require"
```

### Solution 2: Check Supabase Project Status

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Check if your project is **Active** (not paused)
3. Free tier projects pause after inactivity - you may need to resume it

### Solution 3: Verify Connection String from Supabase

1. Go to Supabase Dashboard → Your Project
2. Go to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Click on **URI** tab
5. Copy the **exact** connection string shown there
6. Replace `[YOUR-PASSWORD]` with your actual password
7. Update your `.env` file with this exact string

### Solution 4: Check Network/Firewall

- Make sure you're not behind a corporate firewall blocking database connections
- Try from a different network (mobile hotspot) to test
- Check if your ISP is blocking port 5432 or 6543

### Solution 5: Test Connection with psql

If you have `psql` installed, test the connection directly:

```bash
# Test direct connection (port 5432)
psql "postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:5432/postgres?sslmode=require"

# Or test connection pooling (port 6543)
psql "postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require"
```

If `psql` works, the connection string is correct and the issue might be with Prisma.

### Solution 6: Try Different Connection String Format

Sometimes the format matters. Try these variations:

**Format 1 (with quotes):**
```bash
DATABASE_URL="postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require"
```

**Format 2 (without quotes):**
```bash
DATABASE_URL=postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require
```

**Format 3 (with pgbouncer mode for connection pooling):**
```bash
DATABASE_URL="postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require&pgbouncer=true"
```

### Solution 7: Check Supabase Connection Settings

In Supabase Dashboard → Settings → Database:

1. Check **Connection Pooling** is enabled
2. Note the **Connection string** - use the one from "Connection pooling" section
3. Make sure there are no IP restrictions

### Solution 8: Use Supabase's Direct Connection String

Instead of constructing it manually, use Supabase's provided connection string:

1. Supabase Dashboard → Settings → Database
2. Under **Connection string** → **URI**
3. Copy the connection string (it will have `[YOUR-PASSWORD]` placeholder)
4. Replace `[YOUR-PASSWORD]` with: `8bQpsCJKvpx4vY06`
5. Use that exact string in your `.env`

### Solution 9: Verify Password is Correct

Double-check your Supabase database password:
1. Supabase Dashboard → Settings → Database
2. Check the password or reset it if needed
3. Make sure special characters are URL-encoded if necessary

### Solution 10: Try Prisma db push instead of migrate

If migrations fail, try pushing the schema directly:

```bash
npx prisma db push
```

This doesn't create migration files but directly syncs your schema to the database.

---

## Quick Test Commands

After updating `.env`, test the connection:

```bash
# Test if Prisma can connect
npx prisma db pull --preview-feature

# Or try generating client (this also tests connection)
npx prisma generate

# Or try the migration again
npx prisma migrate dev --name init
```

---

## Most Common Fix

**90% of the time, the issue is using port 5432 instead of 6543 for Supabase.**

Make sure your `.env` has:
```bash
DATABASE_URL="postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require"
```

Notice: **Port 6543** (not 5432) and **?sslmode=require** at the end.

