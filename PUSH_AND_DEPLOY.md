# Push to GitHub and Deploy to Vercel

Complete guide to push your code to GitHub and deploy to Vercel.

## Step 1: Fix vercel.json ✅

I've already fixed the API key inconsistency in `vercel.json`. All three cron jobs now use the same key: `D7vgROOroA0C9io+2sEAFsPypaQxTxZq/xrz+7SdloU=`

---

## Step 2: Prepare Your Code

### 2.1 Check What Files to Commit

Make sure you're NOT committing sensitive files:

```bash
# Check .gitignore exists and has these entries
cat .gitignore | grep -E "(\.env|node_modules)"
```

**Important**: `.env.local` and `.env` should be in `.gitignore` (they contain secrets!)

### 2.2 Check Current Git Status

```bash
git status
```

This shows what files have changed.

---

## Step 3: Push to GitHub

### 3.1 If This is a New Repository

If you haven't initialized Git yet:

```bash
# Initialize Git (if not already done)
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Leave app setup"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

**Replace**:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO_NAME` with your repository name

### 3.2 If Repository Already Exists

If you already have a Git repository:

```bash
# Check current branch
git branch

# Add all changes
git add .

# Commit changes
git commit -m "Prepare for Vercel deployment"

# Push to GitHub
git push
```

### 3.3 If You Need to Create a New GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click **"+"** → **"New repository"**
3. Name it (e.g., `leaveapp` or `leaveapp-new`)
4. Choose **Private** or **Public**
5. **Don't** initialize with README, .gitignore, or license (you already have these)
6. Click **"Create repository"**
7. Copy the repository URL
8. Then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Vercel

### 4.1 Create Vercel Project

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New" → "Project"**

3. **Import from Git**:
   - If not connected, click "Import Git Repository"
   - Select your Git provider (GitHub)
   - Authorize Vercel if needed
   - Find and select your repository (`leaveapp` or whatever you named it)
   - Click **"Import"**

4. **Configure Project**:
   - **Project Name**: Choose a name (e.g., `leaveapp-new`)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default - includes Prisma)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

5. **Note your app URL**: Vercel will show something like `https://leaveapp-new.vercel.app`
   - **Save this URL!** You'll need it for Google OAuth

6. **DO NOT click Deploy yet!** We need to set environment variables first.

---

## Step 5: Set Environment Variables in Vercel

Before deploying, add all your environment variables:

### 5.1 In Vercel Project Setup

1. Scroll down to **"Environment Variables"** section

2. **Add each variable** (click "Add" for each):

### Required Variables:

```bash
# Application URLs (use your actual Vercel URL from Step 4.1)
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXTAUTH_URL=https://your-app-name.vercel.app

# NextAuth Secret (from your .env.local)
NEXTAUTH_SECRET=your_nextauth_secret_here

# Google OAuth (from your .env.local)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Database (from your .env.local - use the same Supabase URL)
DATABASE_URL=postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require

# API Keys (from your .env.local)
SCHEDULER_API_KEY=D7vgROOroA0C9io+2sEAFsPypaQxTxZq/xrz+7SdloU=
NEXT_PUBLIC_SCHEDULER_API_KEY=<check-your-.env.local>
TEST_RESULTS_API_KEY=<check-your-.env.local>
```

3. **For each variable**, select environments:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development** (optional)

4. **Important**: 
   - Replace `your-app-name` with your actual Vercel app name
   - Make sure `SCHEDULER_API_KEY` matches what's in `vercel.json`
   - Use the connection pooling port (6543) for Supabase

---

## Step 6: Update Google OAuth Redirect URI

Before deploying, add your Vercel URL to Google OAuth:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Navigate to**: APIs & Services → Credentials

3. **Click on your OAuth 2.0 Client ID**

4. **Add Authorized redirect URI**:
   ```
   https://your-actual-vercel-app-name.vercel.app/api/auth/callback/google
   ```
   (Use the URL from Step 4.1)

5. **Click Save**

---

## Step 7: Deploy!

1. **Click "Deploy"** button in Vercel

2. **Wait for build** (2-5 minutes):
   - Watch the build logs
   - You should see `prisma generate` running
   - Then `next build`
   - Look for any errors

3. **Build should complete successfully**

---

## Step 8: Run Database Migrations

After deployment, run migrations on your production database:

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
# Select your project when prompted

# Pull environment variables
vercel env pull .env.production

# Run migrations
npx prisma migrate deploy
```

### Option B: Using Your Local Setup

Since your database is accessible, you can run migrations locally pointing to production:

```bash
# Make sure your .env has the production DATABASE_URL
# (You can use the same Supabase database for both local and production)
npx prisma migrate deploy
```

**Note**: If you already ran migrations locally and are using the same database, you might not need to run migrations again. Check if tables exist in your Supabase dashboard.

---

## Step 9: Create Your First User in Production

You need to create a user in your database before you can log in:

### Option A: Using Prisma Studio

```bash
# Make sure DATABASE_URL in .env points to your database
npx prisma studio
```

1. Open `http://localhost:5555`
2. Click on **User** table
3. Click **"Add record"**
4. Fill in:
   - `email`: Your Google account email (must match exactly!)
   - `name`: Your name
   - `role`: Select `SUPER_ADMIN`
   - `isActive`: Check ✓
5. Click **"Save 1 change"**

### Option B: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor**
4. Select **User** table
5. Click **Insert** → **Insert row**
6. Fill in:
   - `email`: Your Google account email
   - `role`: `SUPER_ADMIN`
   - `isActive`: `true`
7. Click **Save**

---

## Step 10: Test Your Deployment

1. **Visit your app**: `https://your-app-name.vercel.app`

2. **Test Google Login**:
   - Click "Login with Google"
   - Sign in with the email you added to the database
   - You should be logged in!

3. **Check for errors**:
   - Open browser console (F12)
   - Check Vercel logs: Dashboard → Your Project → Logs

---

## Step 11: Verify Cron Jobs

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Cron Jobs**

2. **Verify 3 cron jobs are configured**:
   - `/api/scheduler?key=...` (every 15 minutes)
   - `/api/queue/process-batch?key=...` (every minute)
   - `/api/queue/cleanup-stuck-tests?key=...` (every 2 minutes)

3. **Check API keys match** your `SCHEDULER_API_KEY` environment variable

---

## Quick Command Reference

```bash
# Git commands
git status                    # Check what changed
git add .                     # Add all changes
git commit -m "message"       # Commit changes
git push                      # Push to GitHub

# After deployment
vercel login                  # Login to Vercel
vercel link                   # Link project
npx prisma migrate deploy      # Run migrations
npx prisma studio             # Open database browser
```

---

## Troubleshooting

### "Repository not found" when pushing

**Solution**: 
- Check repository URL is correct
- Make sure you have access to the repository
- Verify Git is authenticated: `git config --global user.name` and `git config --global user.email`

### Build fails in Vercel

**Check**:
- All environment variables are set
- `vercel.json` has correct API keys
- Database is accessible
- Check build logs for specific errors

### "User not found" on login

**Solution**:
- Create user in production database
- Email must match Google account exactly
- User must have `isActive = true`

### "Redirect URI mismatch"

**Solution**:
- Add Vercel URL to Google OAuth redirect URIs
- Verify `NEXTAUTH_URL` matches your app URL exactly

---

## Summary Checklist

Before pushing:
- [x] ✅ `vercel.json` fixed (API keys consistent)
- [ ] `.env.local` is NOT committed (should be in .gitignore)
- [ ] Code is ready

Pushing to GitHub:
- [ ] Git repository initialized/connected
- [ ] Changes committed
- [ ] Pushed to GitHub

Deploying to Vercel:
- [ ] Vercel project created
- [ ] All environment variables set
- [ ] Google OAuth redirect URI updated
- [ ] Deployed successfully
- [ ] Database migrations run
- [ ] First user created
- [ ] Login tested
- [ ] Cron jobs verified

---

**You're all set!** Follow these steps in order and your app will be live on Vercel! 🚀

