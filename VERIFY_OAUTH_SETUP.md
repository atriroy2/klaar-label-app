# Verify OAuth Setup for leaveapp-beryl.vercel.app

## Your Vercel App URL
**https://leaveapp-beryl.vercel.app**

## Step 1: Verify Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your OAuth Client ID: `your_google_client_id_here`
4. Check **Authorized redirect URIs** includes:
   ```
   https://leaveapp-beryl.vercel.app/api/auth/callback/google
   ```
5. Also make sure you have (for local dev):
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Save** if you made changes

## Step 2: Verify Vercel Environment Variables

Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Make sure these are set **exactly** (no trailing slashes):

```
NEXTAUTH_URL=https://leaveapp-beryl.vercel.app
NEXT_PUBLIC_APP_URL=https://leaveapp-beryl.vercel.app
```

**Important**: 
- Must be `https://` (not `http://`)
- No trailing slash
- Exact match with your Vercel URL

## Step 3: Other Required Environment Variables

Also verify these are set:

```
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
DATABASE_URL=your_database_url_here
```

## Step 4: After Making Changes

1. **Redeploy** your Vercel app:
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment
   - Click **"Redeploy"**

2. **Wait 1-2 minutes** for changes to propagate

3. **Clear browser cache** or try incognito mode

4. **Try logging in again**

## Common Issues

### Still getting redirect_uri_mismatch?

1. **Double-check Google OAuth**:
   - Make sure the redirect URI is **exactly**: `https://leaveapp-beryl.vercel.app/api/auth/callback/google`
   - No typos, no extra spaces
   - Make sure you clicked **Save**

2. **Check Vercel environment variables**:
   - `NEXTAUTH_URL` must be exactly: `https://leaveapp-beryl.vercel.app`
   - No quotes, no trailing slash
   - Must be set for **Production** environment

3. **Wait for propagation**:
   - Google OAuth changes can take 1-5 minutes
   - Vercel environment variable changes require a redeploy

### Getting "User not found" after OAuth?

This means OAuth worked, but you need to create a user in the database:

1. Use Prisma Studio or Supabase Dashboard
2. Create a user with:
   - Email: Your Google account email (must match exactly!)
   - Role: `SUPER_ADMIN`
   - isActive: `true`

