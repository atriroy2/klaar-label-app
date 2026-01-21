# Local Development Setup Guide

This guide will help you set up and run the app locally on your machine.

## Step 1: Install Node.js and npm

You need Node.js (which includes npm) to run this project.

### Check if Node.js is installed:
```bash
node --version
npm --version
```

If these commands don't work, install Node.js:

### Option A: Install using Homebrew (Recommended for Mac)
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

### Option B: Download from Node.js website
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Restart your terminal

### Verify Installation
After installing, verify it works:
```bash
node --version  # Should show v18.x.x or v20.x.x
npm --version   # Should show 9.x.x or 10.x.x
```

---

## Step 2: Install Project Dependencies

1. **Navigate to your project directory** (if not already there):
   ```bash
   cd /Users/atriroy/leaveapp
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```
   
   This will:
   - Download all required packages
   - Install Prisma CLI
   - Set up everything needed to run the app
   
   **Note**: This may take a few minutes the first time.

---

## Step 3: Set Up Environment Variables

1. **Create `.env.local` file** (this file is for local development and is git-ignored):
   ```bash
   cp .env.example .env.local
   ```

2. **Open `.env.local` in your editor** and update these values:

   ```bash
   # Application URL (for local development)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   
   # NextAuth Secret (generate a new one for local dev)
   # Run: openssl rand -base64 32
   NEXTAUTH_SECRET=your-generated-secret-here
   
   # Google OAuth (you already have these in .env.example)
   GOOGLE_CLIENT_ID=your-client-id-from-google
   GOOGLE_CLIENT_SECRET=your-client-secret-from-google
   
   # Database URL (you already have this in .env.example)
   DATABASE_URL=postgresql://user:password@host:port/database?schema=public
   
   # API Keys (generate these)
   SCHEDULER_API_KEY=your-scheduler-api-key
   NEXT_PUBLIC_SCHEDULER_API_KEY=your-public-scheduler-api-key
   TEST_RESULTS_API_KEY=your-test-results-api-key
   ```

3. **Generate secrets** (if you haven't already):
   ```bash
   # Generate NextAuth secret
   openssl rand -base64 32
   
   # Generate API keys (run multiple times)
   openssl rand -base64 32
   ```

4. **Important**: Make sure your `.env.local` has:
   - ✅ `DATABASE_URL` - Your PostgreSQL connection string
   - ✅ `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - ✅ `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
   - ✅ `NEXTAUTH_SECRET` - Generated secret
   - ✅ `NEXTAUTH_URL` - `http://localhost:3000`

---

## Step 4: Set Up Database Schema

Now let's create all the database tables using Prisma migrations.

### 4.1 Generate Prisma Client

First, generate the Prisma client (this reads your schema and creates the database client):
```bash
npx prisma generate
```

You should see output like:
```
✔ Generated Prisma Client (x.xx.x) to ./node_modules/@prisma/client
```

### 4.2 Run Database Migrations

This will create all the tables in your database:
```bash
npx prisma migrate dev
```

**What this does**:
- Creates a new migration file
- Applies it to your database
- Creates all tables (User, Account, Session, Tenant, etc.)

**If prompted for a migration name**, enter something like:
```
init
```

**Expected output**:
```
✔ Migration applied successfully
```

### 4.3 Verify Database Schema

Let's verify that all tables were created:

```bash
npx prisma studio
```

This will:
- Open a browser window at `http://localhost:5555`
- Show you all your database tables
- Allow you to browse and edit data

**You should see tables like**:
- `User`
- `Account`
- `Session`
- `Tenant`
- `TodoItem`
- `Banner`
- `TestCase`
- `TestRun`
- And others...

**Close Prisma Studio** when done (press `Ctrl+C` in the terminal).

---

## Step 5: Start the Development Server

Now you're ready to run the app locally!

```bash
npm run dev
```

**Expected output**:
```
▲ Next.js 14.0.0
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

### 5.1 Open the App

1. Open your browser
2. Go to: `http://localhost:3000`
3. You should see the login page

### 5.2 Test Google Login

**Important**: Before you can log in, you need to create a user in the database!

---

## Step 6: Create Your First User

You need to create a user in the database before you can log in with Google.

### Option A: Using Prisma Studio (Easiest)

1. **Open Prisma Studio**:
   ```bash
   npx prisma studio
   ```

2. **Create a User**:
   - Click on the `User` table
   - Click the **"Add record"** button (or `+` icon)
   - Fill in:
     - `email`: Your Google account email (must match exactly!)
     - `name`: Your name
     - `role`: Select `SUPER_ADMIN` from dropdown
     - `isActive`: Check the box (true)
   - Click **Save 1 change**

3. **Close Prisma Studio** (Ctrl+C)

### Option B: Using SQL (Advanced)

If you have direct database access, you can run:

```sql
INSERT INTO "User" (
  id,
  email,
  name,
  "emailVerified",
  role,
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'clx' || substr(md5(random()::text), 1, 20),  -- Generate a unique ID
  'your-email@gmail.com',  -- Your Google account email
  'Your Name',
  NOW(),
  'SUPER_ADMIN',
  true,
  NOW(),
  NOW()
);
```

**Important**: 
- The `email` must match your Google account email exactly
- The `role` should be `SUPER_ADMIN` for your first user

---

## Step 7: Test Google Login

1. **Make sure your app is running**:
   ```bash
   npm run dev
   ```

2. **Open browser**: `http://localhost:3000`

3. **Click "Login with Google"**

4. **Authorize with Google**:
   - You'll be redirected to Google
   - Sign in with the same email you used in the database
   - Authorize the app

5. **You should be redirected back** and logged in!

---

## Troubleshooting

### Issue: "npm: command not found"

**Solution**: Install Node.js (see Step 1)

### Issue: "Cannot find module" errors

**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Database connection error

**Solutions**:
1. Check your `DATABASE_URL` in `.env.local` is correct
2. Verify database is running and accessible
3. Test connection with a database client
4. Check if database allows connections from your IP

### Issue: "Migration failed" or "Schema already exists"

**Solutions**:
1. If you want to start fresh:
   ```bash
   npx prisma migrate reset
   ```
   **Warning**: This deletes all data!

2. Or push schema without migrations:
   ```bash
   npx prisma db push
   ```

### Issue: "User not found" when logging in

**Solutions**:
1. Make sure you created a user in the database
2. Verify the email matches your Google account exactly
3. Check `isActive` is `true` in the database
4. Check the user's `role` is set

### Issue: "Redirect URI mismatch" error

**Solutions**:
1. In Google Cloud Console, add this redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
2. Make sure `NEXTAUTH_URL` in `.env.local` is `http://localhost:3000`

### Issue: Port 3000 already in use

**Solutions**:
1. Find what's using port 3000:
   ```bash
   lsof -ti:3000
   ```
2. Kill the process:
   ```bash
   kill -9 $(lsof -ti:3000)
   ```
3. Or use a different port:
   ```bash
   PORT=3001 npm run dev
   ```

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open database browser
npx prisma studio

# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## Next Steps

Once everything is working locally:

1. ✅ Test all features
2. ✅ Create additional users if needed
3. ✅ Set up tenants (if using multi-tenant features)
4. ✅ Proceed with Vercel deployment when ready

---

**Need Help?** Check the detailed guides:
- Database setup: `STEP4_DATABASE_DETAILED.md`
- Google OAuth: `STEP3_GOOGLE_OAUTH_DETAILED.md`
- Deployment: `DEPLOYMENT_GUIDE.md`

