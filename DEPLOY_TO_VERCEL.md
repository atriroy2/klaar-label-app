# Deploy to Vercel - Quick Guide

Follow these steps to deploy your app to Vercel.

## Prerequisites Checklist

Before deploying, make sure you have:

- [x] ✅ App working locally
- [ ] ✅ Updated `vercel.json` with your API key (not placeholder)
- [ ] ✅ All environment variables ready
- [ ] ✅ Database accessible from Vercel
- [ ] ✅ Google OAuth redirect URI includes your Vercel URL

---

## Step 1: Update vercel.json

**IMPORTANT**: Before deploying, you must update the API keys in `vercel.json`.

1. **Open `vercel.json`** in your editor

2. **Find your SCHEDULER_API_KEY**:
   - Check your `.env.local` file for `SCHEDULER_API_KEY`
   - Or generate a new one: `openssl rand -base64 32`

3. **Replace all 3 instances** of `YOUR_SCHEDULER_API_KEY_HERE` with your actual key:
   ```json
   {
     "crons": [
       {
         "path": "/api/scheduler?key=YOUR_ACTUAL_KEY_HERE",
         "schedule": "*/15 * * * *"
       },
       {
         "path": "/api/queue/process-batch?key=YOUR_ACTUAL_KEY_HERE",
         "schedule": "* * * * *"
       },
       {
         "path": "/api/queue/cleanup-stuck-tests?key=YOUR_ACTUAL_KEY_HERE",
         "schedule": "*/2 * * * *"
       }
     ]
   }
   ```

4. **Save the file**

---

## Step 2: Prepare Your Code

1. **Commit your changes** (if using Git):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push
   ```

2. **Make sure these files are ready**:
   - ✅ `vercel.json` - Updated with real API keys
   - ✅ `package.json` - Has build scripts
   - ✅ `prisma/schema.prisma` - Database schema

---

## Step 3: Create Vercel Project

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New" → "Project"**

3. **IMPORTANT**: Do NOT import from your existing project - create a NEW one

4. **Import your repository**:
   - Connect your Git provider (GitHub/GitLab/Bitbucket) if not already connected
   - Select this repository (`leaveapp`)
   - Click **Import**

5. **Configure project**:
   - **Project Name**: Choose a unique name (e.g., `leaveapp-new` or `leaveapp-production`)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default - this includes `prisma generate`)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

6. **DO NOT click Deploy yet** - we need to set environment variables first!

7. **Note your app URL**: Vercel will show you the URL (e.g., `https://leaveapp-new.vercel.app`)
   - **Save this URL** - you'll need it for Google OAuth!

---

## Step 4: Update Google OAuth Redirect URI

Before setting environment variables, update Google OAuth:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**

2. **Navigate to**: APIs & Services → Credentials

3. **Click on your OAuth 2.0 Client ID**

4. **Add Authorized redirect URI**:
   ```
   https://your-actual-vercel-app-name.vercel.app/api/auth/callback/google
   ```
   Replace `your-actual-vercel-app-name` with your actual Vercel app name from Step 3

5. **Click Save**

---

## Step 5: Set Environment Variables in Vercel

1. **In Vercel project setup page**, scroll to **Environment Variables** section

2. **Add each variable** (click "Add" for each one):

### Required Variables:

```bash
# Application URLs (use your actual Vercel app URL)
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXTAUTH_URL=https://your-app-name.vercel.app

# NextAuth Secret (from your .env.local)
NEXTAUTH_SECRET=<your-nextauth-secret>

# Google OAuth (from your .env.local)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Database (from your .env.local)
DATABASE_URL=<your-database-url>

# API Keys (from your .env.local)
SCHEDULER_API_KEY=<same-key-from-vercel.json>
NEXT_PUBLIC_SCHEDULER_API_KEY=<your-public-scheduler-key>
TEST_RESULTS_API_KEY=<your-test-results-key>
```

### Optional Variables:

```bash
# Optional
APP_SOURCE_NAME=leaveapp
NODE_ENV=production
```

3. **For each variable**, select environments:
   - ✅ **Production**
   - ✅ **Preview** 
   - ✅ **Development** (optional)

4. **Important Notes**:
   - Replace `your-app-name` with your actual Vercel app name
   - Use the **same** `SCHEDULER_API_KEY` that you put in `vercel.json`
   - For `DATABASE_URL`, use your Supabase connection string (same as local, or use production connection string if different)

---

## Step 6: Deploy!

1. **Click "Deploy"** button

2. **Wait for build to complete** (usually 2-5 minutes)

3. **Watch the build logs**:
   - You should see `prisma generate` running
   - Then `next build`
   - Look for any errors

---

## Step 7: Run Database Migrations on Vercel

After deployment, you need to run migrations on your production database.

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```
   Select your project when prompted

4. **Run migrations**:
   ```bash
   vercel env pull .env.production
   npx prisma migrate deploy
   ```

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Run the migration SQL manually (from `prisma/migrations` folder)

### Option C: Use Prisma Studio (if accessible)

Since your database is accessible, you can run:
```bash
# Make sure DATABASE_URL in .env points to production
npx prisma migrate deploy
```

---

## Step 8: Create Your First User

After deployment, create a user in your production database:

### Option A: Using Prisma Studio

1. **Set production DATABASE_URL** in your local `.env`
2. **Open Prisma Studio**:
   ```bash
   npx prisma studio
   ```
3. **Create a User**:
   - Email: Your Google account email
   - Role: `SUPER_ADMIN`
   - isActive: `true`

### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard → Table Editor
2. Select `User` table
3. Insert a new row with:
   - `email`: Your Google account email
   - `role`: `SUPER_ADMIN`
   - `isActive`: `true`

---

## Step 9: Test Your Deployment

1. **Visit your app**: `https://your-app-name.vercel.app`

2. **Test Google Login**:
   - Click "Login with Google"
   - Sign in with the email you added to the database
   - You should be logged in!

3. **Check for errors**:
   - Open browser console (F12)
   - Check Vercel logs: Dashboard → Your Project → Logs

---

## Step 10: Verify Cron Jobs

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Cron Jobs**

2. **Verify the 3 cron jobs are configured**:
   - `/api/scheduler?key=...` (every 15 minutes)
   - `/api/queue/process-batch?key=...` (every minute)
   - `/api/queue/cleanup-stuck-tests?key=...` (every 2 minutes)

3. **Check that API keys match** your `SCHEDULER_API_KEY` environment variable

---

## Troubleshooting

### Build Fails

**Check**:
- All environment variables are set
- `vercel.json` has correct API keys (not placeholders)
- Database is accessible from Vercel
- Build logs for specific errors

### "User not found" on Login

**Solution**:
- Create a user in the production database
- Email must match your Google account exactly
- User must have `isActive = true`

### "Redirect URI mismatch"

**Solution**:
- Add `https://your-app-name.vercel.app/api/auth/callback/google` to Google OAuth
- Verify `NEXTAUTH_URL` matches your app URL exactly

### Database Connection Errors

**Solution**:
- Verify `DATABASE_URL` is set in Vercel
- Check database allows connections from Vercel
- For Supabase, use connection pooling port (6543) if needed

### Cron Jobs Not Running

**Solution**:
- Verify API keys in `vercel.json` match `SCHEDULER_API_KEY`
- Check Vercel cron job logs
- Ensure cron jobs are enabled in Vercel settings

---

## Quick Checklist

Before deploying:
- [ ] Updated `vercel.json` with real API keys
- [ ] All environment variables ready
- [ ] Google OAuth redirect URI updated
- [ ] Code committed and pushed (if using Git)

After deploying:
- [ ] Build completed successfully
- [ ] Database migrations run
- [ ] First user created in database
- [ ] Google login works
- [ ] Cron jobs configured

---

## Next Steps

Once deployed and working:

1. ✅ Set up custom domain (optional)
2. ✅ Configure monitoring/analytics
3. ✅ Set up error tracking (Sentry, etc.)
4. ✅ Create additional users as needed
5. ✅ Configure tenants (if using multi-tenant features)

---

**Congratulations!** Your app should now be live on Vercel! 🎉

For detailed information, see `DEPLOYMENT_GUIDE.md`.

