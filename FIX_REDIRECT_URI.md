# Fix Redirect URI Mismatch Error

## The Problem

Error `400: redirect_uri_mismatch` means Google OAuth doesn't recognize your redirect URI.

## Quick Fix Steps

### Step 1: Get Your Actual Vercel URL

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Copy your app URL (e.g., `https://leaveapp-new.vercel.app`)

### Step 2: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. In **Authorized redirect URIs**, add:
   ```
   https://YOUR_ACTUAL_VERCEL_URL.vercel.app/api/auth/callback/google
   ```
   **Replace `YOUR_ACTUAL_VERCEL_URL` with your actual Vercel app name**

5. Click **Save**

### Step 3: Verify Environment Variables in Vercel

Make sure these match your actual Vercel URL:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Check:
   - `NEXTAUTH_URL` = `https://your-actual-url.vercel.app` (no trailing slash!)
   - `NEXT_PUBLIC_APP_URL` = `https://your-actual-url.vercel.app` (no trailing slash!)

3. If they're wrong, update them and **Redeploy**

### Step 4: Common Mistakes to Avoid

❌ **Wrong**:
- `http://your-app.vercel.app` (using http instead of https)
- `https://your-app.vercel.app/` (trailing slash)
- `https://your-app.vercel.app/auth/callback/google` (missing /api)
- Using localhost URL in production

✅ **Correct**:
- `https://your-app.vercel.app/api/auth/callback/google` (exact format)

## Example

If your Vercel app URL is `https://leaveapp-new.vercel.app`:

**In Google OAuth**, add:
```
https://leaveapp-new.vercel.app/api/auth/callback/google
```

**In Vercel Environment Variables**, set:
```
NEXTAUTH_URL=https://leaveapp-new.vercel.app
NEXT_PUBLIC_APP_URL=https://leaveapp-new.vercel.app
```

## After Making Changes

1. **Wait 1-2 minutes** for Google OAuth changes to propagate
2. **Redeploy** your Vercel app (if you changed environment variables)
3. **Clear browser cache** or try incognito mode
4. **Try logging in again**

## Still Not Working?

1. **Double-check the exact URL**:
   - Go to your Vercel app
   - Copy the exact URL from the address bar
   - Make sure it matches exactly in both places

2. **Check for typos**:
   - No extra spaces
   - Correct spelling
   - Correct protocol (https, not http)

3. **Verify in Google Console**:
   - Go back to Google Cloud Console → Credentials
   - Click on your OAuth Client
   - Verify the redirect URI is exactly: `https://your-url.vercel.app/api/auth/callback/google`

