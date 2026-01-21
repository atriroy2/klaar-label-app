# Quick Local Setup - Step by Step

Follow these steps in order to get your app running locally.

## Step 1: Install Node.js (Required First!)

You need Node.js to run this project. Let's install it:

### Check if you have Homebrew:
```bash
which brew
```

### If you have Homebrew, install Node.js:
```bash
brew install node
```

### If you DON'T have Homebrew:
1. Install Homebrew first:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Then install Node.js:
   ```bash
   brew install node
   ```

### Alternative: Download Node.js directly
1. Go to: https://nodejs.org/
2. Download the LTS version (v20.x.x recommended)
3. Run the installer
4. Restart your terminal

### Verify Installation:
```bash
node --version
npm --version
```

You should see version numbers. If you see "command not found", restart your terminal and try again.

---

## Step 2: Install Project Dependencies

Once Node.js is installed:

```bash
cd /Users/atriroy/leaveapp
npm install
```

This will take a few minutes. Wait for it to complete.

---

## Step 3: Create .env.local File

Create your local environment file:

```bash
cp .env.example .env.local
```

---

## Step 4: Update .env.local with Your Values

Open `.env.local` in your editor and update these **required** values:

### 4.1 Database URL
Replace the placeholder with your actual database connection string:
```bash
DATABASE_URL=postgresql://user:password@host:port/database?schema=public
```

**Examples:**
- If using Vercel Postgres: `postgres://default:password@host.region.aws.neon.tech:5432/db?sslmode=require`
- If using Supabase: `postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres`
- If using local PostgreSQL: `postgresql://postgres:password@localhost:5432/leaveapp?schema=public`

### 4.2 Google OAuth Credentials
Replace with your actual values from Google Cloud Console:
```bash
GOOGLE_CLIENT_ID=123456789-abc...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...
```

### 4.3 Generate Required Secrets

Generate these secrets (run each command and copy the output):

```bash
# NextAuth Secret
openssl rand -base64 32

# Scheduler API Key
openssl rand -base64 32

# Public Scheduler API Key (can be same as above)
openssl rand -base64 32

# Test Results API Key
openssl rand -base64 32
```

Add them to `.env.local`:
```bash
NEXTAUTH_SECRET=<paste-generated-secret>
SCHEDULER_API_KEY=<paste-generated-key>
NEXT_PUBLIC_SCHEDULER_API_KEY=<paste-generated-key>
TEST_RESULTS_API_KEY=<paste-generated-key>
```

### 4.4 Set Local URLs
Make sure these are set for local development:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

---

## Step 5: Set Up Database Schema

Now let's create all the database tables:

### 5.1 Generate Prisma Client
```bash
npx prisma generate
```

### 5.2 Run Migrations
```bash
npx prisma migrate dev
```

When prompted for a migration name, enter: `init`

**Expected output:**
```
✔ Migration applied successfully
```

### 5.3 Verify Tables Were Created
```bash
npx prisma studio
```

This opens a browser at `http://localhost:5555` showing your database tables.

**You should see tables like:**
- User
- Account
- Session
- Tenant
- TodoItem
- etc.

Press `Ctrl+C` to close Prisma Studio.

---

## Step 6: Create Your First User

Before you can log in, you need to create a user in the database.

### Option A: Using Prisma Studio (Easiest)

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Click on the **User** table

3. Click **"Add record"** button

4. Fill in:
   - `email`: Your Google account email (must match exactly!)
   - `name`: Your name
   - `role`: Select `SUPER_ADMIN` from dropdown
   - `isActive`: Check the box ✓

5. Click **"Save 1 change"**

6. Close Prisma Studio (Ctrl+C)

### Option B: Using SQL

If you have direct database access, run:
```sql
INSERT INTO "User" (
  id, email, name, "emailVerified", role, "isActive", "createdAt", "updatedAt"
) VALUES (
  'clx' || substr(md5(random()::text), 1, 20),
  'your-email@gmail.com',  -- Your Google email
  'Your Name',
  NOW(),
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
);
```

---

## Step 7: Start the App

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.0.0
- Local:        http://localhost:3000
✓ Ready in 2.3s
```

---

## Step 8: Test Login

1. Open browser: `http://localhost:3000`
2. Click "Login with Google"
3. Sign in with the same email you used in the database
4. You should be logged in!

---

## Troubleshooting

### "npm: command not found"
- Install Node.js (Step 1)
- Restart terminal after installing

### "Cannot connect to database"
- Check `DATABASE_URL` is correct
- Verify database is running
- Test connection with a database client

### "User not found" on login
- Make sure you created a user in the database
- Email must match your Google account exactly
- User must have `isActive = true`

### "Redirect URI mismatch"
- In Google Cloud Console, add: `http://localhost:3000/api/auth/callback/google`
- Make sure `NEXTAUTH_URL=http://localhost:3000` in `.env.local`

---

## Quick Command Reference

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open database browser
npx prisma studio

# Start app
npm run dev
```

---

**Need more details?** See `LOCAL_SETUP.md` for comprehensive guide.

