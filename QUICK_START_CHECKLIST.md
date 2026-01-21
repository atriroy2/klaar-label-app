# Quick Start Checklist

Use this checklist alongside the detailed `DEPLOYMENT_GUIDE.md`.

## Pre-Deployment

- [ ] **Generate API Key**: Run `openssl rand -base64 32` and save it
- [ ] **Update vercel.json**: Replace `YOUR_SCHEDULER_API_KEY_HERE` (3 places) with your generated key

## Vercel Setup (Do This First!)

- [ ] **Create New Project**: Don't import from existing project
- [ ] **Note Your App URL**: Save the URL Vercel gives you (e.g., `https://leaveapp-new.vercel.app`)
- [ ] **DO NOT deploy yet** - we need to set up OAuth and environment variables first

## Google OAuth Setup (After Getting Vercel URL)

- [ ] **Create Google OAuth Client**: Use your Vercel app URL in redirect URIs
- [ ] **Get Client ID and Secret**: Save these for environment variables

## Database & Other Setup

- [ ] **Set up Database**: Create PostgreSQL database and get connection string
- [ ] **Run Migrations**: `npx prisma migrate dev` locally
- [ ] **Set up GCP** (Optional - only if using test automation features): Create Pub/Sub topic and service account
- [ ] **Generate Secrets**: Create all required API keys and secrets

## Configure Vercel

- [ ] **Set Environment Variables**: Add all from `.env.example` in Vercel project settings
- [ ] **Deploy**: Click deploy and wait for build

## Post-Deployment

- [ ] **Create Super Admin User**: Insert user in database with your Google email
- [ ] **Test Google Login**: Verify authentication works
- [ ] **Verify Cron Jobs**: Check they're configured in Vercel
- [ ] **Check Logs**: Ensure no errors in Vercel logs

## Critical Environment Variables

Make sure these are set in Vercel:

```
✅ NEXT_PUBLIC_APP_URL
✅ NEXTAUTH_URL
✅ NEXTAUTH_SECRET
✅ GOOGLE_CLIENT_ID
✅ GOOGLE_CLIENT_SECRET
✅ DATABASE_URL
✅ SCHEDULER_API_KEY (must match vercel.json)
✅ NEXT_PUBLIC_SCHEDULER_API_KEY
✅ TEST_RESULTS_API_KEY
⚠️ GCP_PROJECT_ID (Optional - only if using test automation)
⚠️ PUBSUB_TOPIC (Optional - only if using test automation)
⚠️ GCS_SERVICE_ACCOUNT_KEY (Optional - only if using test automation)
```

---

**See `DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions.**

