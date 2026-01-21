# Setting Up This App as a New Vercel Deployment

This guide will help you configure this repository to deploy as a completely new app on Vercel without clashing with your existing deployment.

## Overview

This repository has been configured to use environment variables for all app-specific settings. This allows you to deploy it as a new app with its own:
- Database
- Google OAuth credentials
- API keys
- Google Cloud Platform resources
- Vercel deployment

## Step 1: Environment Variables

All required environment variables are documented in `.env.example`. Copy this file to `.env.local` for local development, and configure them in your Vercel project settings for production.

### Critical Environment Variables

1. **Database Configuration**
   - `DATABASE_URL` - Your PostgreSQL connection string (create a new database for this app)

2. **NextAuth Configuration**
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your app's URL (e.g., `https://your-new-app.vercel.app`)
   - `NEXT_PUBLIC_APP_URL` - Same as NEXTAUTH_URL

3. **Google OAuth**
   - `GOOGLE_CLIENT_ID` - Create new OAuth credentials in Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From the same OAuth credentials

4. **API Keys**
   - `SCHEDULER_API_KEY` - Generate a secure random string
   - `NEXT_PUBLIC_SCHEDULER_API_KEY` - Can be the same as SCHEDULER_API_KEY
   - `TEST_RESULTS_API_KEY` - Generate a secure random string

5. **Google Cloud Platform**
   - `GCP_PROJECT_ID` - Your GCP project ID (can be same or different project)
   - `PUBSUB_TOPIC` - Format: `projects/PROJECT_ID/topics/TOPIC_NAME`
   - `GCS_SERVICE_ACCOUNT_KEY` - JSON string of service account credentials

## Step 2: Update vercel.json

**IMPORTANT**: Vercel cron jobs don't support environment variable substitution in paths. You must manually update the API keys in `vercel.json`:

1. Open `vercel.json`
2. Replace all instances of `YOUR_SCHEDULER_API_KEY_HERE` with your actual `SCHEDULER_API_KEY` value
3. This ensures the cron jobs can authenticate when they run

## Step 3: Database Setup

1. Create a new PostgreSQL database (can be on the same server or a new one)
2. Update `DATABASE_URL` in your environment variables
3. Run migrations:
   ```bash
   npx prisma migrate dev
   ```
4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

## Step 4: Google Cloud Setup

### OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create new OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-new-app.vercel.app/api/auth/callback/google` (for production)
4. Copy the Client ID and Client Secret to your environment variables

### Pub/Sub Topic (if using test automation features)
1. Create a new Pub/Sub topic in your GCP project
2. Update `PUBSUB_TOPIC` environment variable with the full topic path
3. Ensure your service account has permissions to publish to this topic

### Google Cloud Storage (if using GCS features)
1. Create a service account with Storage permissions
2. Download the JSON key
3. Set `GCS_SERVICE_ACCOUNT_KEY` to the JSON string (escape quotes properly)

## Step 5: Deploy to Vercel

1. **Create a new Vercel project**
   - Don't import from the existing project
   - Connect this repository as a new project

2. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
   - Set them for Production, Preview, and Development environments as needed

3. **Update vercel.json**
   - Before deploying, make sure you've updated the cron job API keys in `vercel.json`

4. **Deploy**
   - Push your code or deploy from Vercel dashboard
   - The build will automatically run Prisma migrations

## Step 6: Post-Deployment

1. **Verify Environment Variables**
   - Check that all environment variables are set correctly in Vercel
   - Test the app to ensure authentication works

2. **Test Cron Jobs**
   - Verify that the cron jobs in `vercel.json` are running
   - Check Vercel logs to ensure they're authenticating correctly

3. **Create Initial Users**
   - You'll need to create users in your new database
   - Super admin users can be created directly in the database or through your app's admin interface

## What's Been Changed

To make this app independent from your existing deployment, the following changes were made:

- ✅ Removed all hardcoded API keys
- ✅ Removed hardcoded deployment URLs
- ✅ Externalized Google Cloud project IDs and topics
- ✅ Made all configuration environment-variable driven
- ✅ Updated package.json name
- ✅ Added comprehensive `.env.example` file

## Troubleshooting

### Cron Jobs Not Running
- Verify API keys in `vercel.json` match `SCHEDULER_API_KEY`
- Check Vercel cron job logs
- Ensure the cron paths are correct

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your deployment URL
- Check Google OAuth redirect URIs are correct
- Ensure `NEXTAUTH_SECRET` is set

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from Vercel
- Run Prisma migrations if needed

## Notes

- This app is now completely independent from your existing deployment
- Each deployment can have its own database, users, and configuration
- The menu navigation, user management, and Google login features are reusable across deployments
- All app-specific settings are now externalized to environment variables

