# Complete Deployment Guide: Setting Up as a New Vercel App

This is a comprehensive step-by-step guide to deploy this app as a completely new application on Vercel.

## Prerequisites

- A Vercel account
- A Google Cloud Platform account
- A PostgreSQL database (Vercel Postgres, Supabase, or any PostgreSQL provider)
- Git repository access

---

## Step 1: Prepare Your Repository

### 1.1 Update vercel.json

**IMPORTANT**: Before deploying, you must update the API keys in `vercel.json`:

1. Open `vercel.json` in your editor
2. Generate a secure API key for your scheduler:
   ```bash
   openssl rand -base64 32
   ```
3. Replace all three instances of `YOUR_SCHEDULER_API_KEY_HERE` with your generated key
4. Save the file

**Note**: Save this key - you'll need it for the `SCHEDULER_API_KEY` environment variable later.

---

## Step 2: Create Vercel Project (Get Your App URL First!)

**IMPORTANT**: Create the Vercel project first to get your app URL, then we'll configure Google OAuth with the correct URL.

### 2.1 Create Project in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **IMPORTANT**: Do NOT import from your existing project
4. Import your Git repository (GitHub/GitLab/Bitbucket)
5. Select this repository
6. Configure project:
   - **Project Name**: Choose a unique name (e.g., `leaveapp-new`)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
7. **DO NOT deploy yet** - we need to set environment variables first
8. **Note your app URL**: Vercel will show you the URL (e.g., `https://leaveapp-new.vercel.app`)
   - Save this URL - you'll need it for Google OAuth setup!

### 2.2 Prepare for Environment Variables

At this point, you have your Vercel app URL. We'll set up Google OAuth next, then come back to add environment variables.

---

## Step 3: Set Up Google OAuth (Google Login)

Now that you have your Vercel app URL, let's set up Google OAuth with the correct redirect URI.

**📖 For detailed, step-by-step instructions with screenshots descriptions and troubleshooting, see: [`STEP3_GOOGLE_OAUTH_DETAILED.md`](./STEP3_GOOGLE_OAUTH_DETAILED.md)**

### Quick Summary:

1. **Configure OAuth Consent Screen**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **OAuth consent screen**
   - Choose **External** user type
   - Fill in app name, support email, developer contact
   - Add scopes: `email` and `profile`
   - Add test users (your email) if in testing mode

2. **Create OAuth Client ID**:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Choose **Web application**
   - Add **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google` (for local dev)
     - `https://your-actual-vercel-app-url.vercel.app/api/auth/callback/google` (use your URL from Step 2)
   - Click **Create**
   - **IMPORTANT**: Copy and save both **Client ID** and **Client Secret** immediately (you won't see the secret again!)

3. **What you'll need for Step 7**:
   - `GOOGLE_CLIENT_ID` = Your Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Client Secret

---

## Step 4: Set Up Database

**📖 For detailed, step-by-step instructions, see: [`STEP4_DATABASE_DETAILED.md`](./STEP4_DATABASE_DETAILED.md)**

### Quick Summary:

1. **Choose a database provider**:
   - **Vercel Postgres** (Recommended - easiest integration)
   - **Supabase** (Popular free alternative)
   - **Other PostgreSQL provider** (Railway, Neon, etc.)

2. **Get your connection string** from your chosen provider

3. **Run migrations locally**:
   ```bash
   npm install
   cp .env.example .env.local
   # Add DATABASE_URL to .env.local
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Verify schema created**:
   ```bash
   npx prisma studio
   ```

**What you'll need for Step 7**:
- `DATABASE_URL` = Your PostgreSQL connection string

---

## Step 5: Generate Required Secrets

**Note**: GCP setup (Pub/Sub, GCS) is only needed if you're using test automation features. For basic app functionality (user management, Google login, etc.), you can skip GCP setup.

Generate all the secrets you'll need:

```bash
# NextAuth Secret
openssl rand -base64 32

# Scheduler API Key (use the same one from vercel.json)
# You already generated this in Step 1.1

# Public Scheduler API Key (can be same as SCHEDULER_API_KEY)
openssl rand -base64 32

# Test Results API Key
openssl rand -base64 32
```

Save all these values - you'll need them in the next step.

---

## Step 7: Configure Environment Variables in Vercel

Now that you have:
- ✅ Vercel project created (with app URL)
- ✅ Google OAuth credentials
- ✅ Database connection string
- ✅ Generated secrets

Let's add all environment variables to Vercel:

### 7.1 Add Environment Variables

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add each variable below:

#### Required Environment Variables:

```bash
# Application URLs
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXTAUTH_URL=https://your-app-name.vercel.app

# NextAuth
NEXTAUTH_SECRET=<your-generated-secret-from-step-5>

# Google OAuth
GOOGLE_CLIENT_ID=<from-step-2.2>
GOOGLE_CLIENT_SECRET=<from-step-2.2>

# Database
DATABASE_URL=<from-step-3.1>

# API Keys
SCHEDULER_API_KEY=<same-key-from-vercel.json>
NEXT_PUBLIC_SCHEDULER_API_KEY=<can-be-same-as-above>
TEST_RESULTS_API_KEY=<generated-in-step-5>

# Optional - Only needed if using test automation features
# GCP_PROJECT_ID=<your-gcp-project-id>
# PUBSUB_TOPIC=projects/<your-gcp-project-id>/topics/<your-topic-name>
# GCS_SERVICE_ACCOUNT_KEY=<single-line-json>

# Optional
APP_SOURCE_NAME=leaveapp
NODE_ENV=production
```

3. Set each variable for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional, for local testing)

4. **Important**: 
   - Replace `your-app-name` with your actual Vercel app name (from Step 2.1)
   - Replace all `<...>` placeholders with actual values
   - **GCP variables are optional** - only set them if you're using test automation features
   - If setting `GCS_SERVICE_ACCOUNT_KEY`, paste the entire JSON as a single line (no newlines)

---

## Step 8: Deploy to Vercel

### 8.1 Initial Deployment

1. In Vercel project setup, click **Deploy**
2. Wait for the build to complete
3. If build fails, check:
   - All environment variables are set
   - `vercel.json` has the correct API key (not the placeholder)
   - Database is accessible from Vercel

### 8.2 Verify Deployment

1. Visit your app URL: `https://your-app-name.vercel.app`
2. You should see the login page
3. Try logging in with Google (it should redirect to Google OAuth)

---

## Step 9: Post-Deployment Setup

### 9.1 Create Initial Super Admin User

You need to create at least one user in the database to log in. You have two options:

**Option A: Create via Database (Recommended)**

1. Go to your database (Vercel Postgres dashboard, Supabase, etc.)
2. Insert a user record in the `User` table:
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
     'clx1234567890abcdef',  -- Generate a CUID or use any unique string
     'your-email@gmail.com',  -- Your Google account email
     'Admin User',
     NOW(),
     'SUPER_ADMIN',
     true,
     NOW(),
     NOW()
   );
   ```
3. **Important**: Use the exact email address you'll use to log in with Google

**Option B: Create via Prisma Studio**

1. Run locally with database connection:
   ```bash
   npx prisma studio
   ```
2. Navigate to `User` table
3. Click **Add record**
4. Fill in:
   - `email`: Your Google account email
   - `role`: `SUPER_ADMIN`
   - `isActive`: `true`
5. Save

### 9.2 Link Google Account to User

After creating the user, when you log in with Google for the first time:

1. The system will try to link your Google account
2. If the email matches, it will create an `Account` record linking them
3. You should be able to log in successfully

### 9.3 Verify Cron Jobs

1. In Vercel dashboard, go to your project
2. Navigate to **Settings** → **Cron Jobs**
3. Verify the three cron jobs are configured:
   - `/api/scheduler?key=...` (every 15 minutes)
   - `/api/queue/process-batch?key=...` (every minute)
   - `/api/queue/cleanup-stuck-tests?key=...` (every 2 minutes)
4. Check that the API keys in the paths match your `SCHEDULER_API_KEY`

### 9.4 Test Authentication

1. Visit your app: `https://your-app-name.vercel.app`
2. Click **Login with Google**
3. You should be redirected to Google OAuth
4. After authorizing, you should be redirected back and logged in
5. If you see an error, check:
   - User exists in database with matching email
   - User `isActive` is `true`
   - OAuth redirect URI matches exactly
   - Environment variables are set correctly

---

## Step 10: Troubleshooting

### Common Issues

**Issue: "User not found" error on login**
- Solution: Create the user in the database first (Step 8.1)
- Ensure the email matches exactly

**Issue: "Unauthorized" error on cron jobs**
- Solution: Verify `SCHEDULER_API_KEY` in `vercel.json` matches the environment variable
- Check Vercel logs for the actual error

**Issue: Database connection errors**
- Solution: Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- For Vercel Postgres, this should work automatically

**Issue: Google OAuth redirect mismatch**
- Solution: Ensure redirect URI in Google Console exactly matches:
  `https://your-app-name.vercel.app/api/auth/callback/google`
- Check `NEXTAUTH_URL` environment variable matches your app URL

**Issue: Build fails**
- Solution: Check build logs in Vercel
- Verify all required environment variables are set
- Ensure `vercel.json` doesn't have JSON syntax errors

### Verify Environment Variables

Run this check in Vercel:
1. Go to **Settings** → **Environment Variables**
2. Verify all variables from Step 6.2 are present
3. Check they're enabled for **Production**

---

## Step 11: Final Checklist

Before considering setup complete, verify:

- [ ] `vercel.json` has real API key (not placeholder)
- [ ] All environment variables are set in Vercel
- [ ] Database is created and migrations run
- [ ] Google OAuth credentials created
- [ ] OAuth redirect URI matches your app URL
- [ ] At least one SUPER_ADMIN user exists in database
- [ ] App deploys successfully
- [ ] Google login works
- [ ] Cron jobs are configured in Vercel
- [ ] GCP service account has correct permissions

---

## Next Steps

Once everything is working:

1. **Create Tenants** (if using multi-tenant features)
2. **Create Regular Users** (via your app's admin interface)
3. **Configure Test Automation** (if using those features)
4. **Set up Monitoring** (Vercel Analytics, error tracking, etc.)

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for client errors
3. Verify all environment variables are set correctly
4. Ensure database schema is up to date (`npx prisma migrate deploy`)

---

**Congratulations!** Your app should now be running as a completely independent deployment on Vercel! 🎉

