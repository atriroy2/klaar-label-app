# Step 3: Detailed Google OAuth Setup Guide

This guide provides detailed, step-by-step instructions for setting up Google OAuth authentication.

## Prerequisites

Before starting, make sure you have:
- ✅ Created your Vercel project (Step 2)
- ✅ Your Vercel app URL (e.g., `https://leaveapp-new.vercel.app`)
- ✅ A Google account with access to Google Cloud Console

---

## Part 1: Configure OAuth Consent Screen

The OAuth consent screen is what users see when they authorize your app. You need to configure this first before creating OAuth credentials.

### 1.1 Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. **Select or create a project**:
   - If you have an existing project, select it from the project dropdown at the top
   - If you need a new project:
     - Click the project dropdown
     - Click **New Project**
     - Enter a project name (e.g., "Leave App")
     - Click **Create**
     - Wait for project creation, then select it

### 1.2 Navigate to OAuth Consent Screen

1. In the left sidebar, click **APIs & Services**
2. Click **OAuth consent screen** (it's in the left menu under APIs & Services)

### 1.3 Configure Consent Screen

You'll see a form with several sections. Fill them out as follows:

#### User Type Selection

1. **Choose User Type**:
   - Select **External** (unless you have a Google Workspace account and want to restrict to your organization)
   - Click **Create**

#### App Information

2. **App name**: 
   - Enter your app name (e.g., "Leave App" or "Leave Management System")
   - This is what users will see when authorizing

3. **User support email**:
   - Select your email from the dropdown (or enter a support email)
   - This is shown to users if they need help

4. **App logo** (Optional):
   - You can upload a logo (128x128px recommended)
   - Skip this for now if you don't have one

5. **App domain** (Optional):
   - You can leave this blank for now
   - Or enter your domain if you have one

6. **Application home page** (Optional):
   - Enter your Vercel app URL: `https://your-app-name.vercel.app`
   - Or leave blank

7. **Application privacy policy link** (Optional):
   - Leave blank for now, or add if you have a privacy policy

8. **Application terms of service link** (Optional):
   - Leave blank for now

9. **Authorized domains** (Optional):
   - Leave blank for now

10. **Developer contact information**:
    - Enter your email address
    - This is required

11. Click **Save and Continue**

#### Scopes

12. **Add Scopes**:
    - Click **Add or Remove Scopes**
    - In the popup, you'll see a list of scopes
    - **Required scopes** (check these):
      - ✅ `.../auth/userinfo.email` (See your primary Google Account email address)
      - ✅ `.../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
    - Click **Update** to save
    - Click **Save and Continue**

#### Test Users (If App is in Testing Mode)

13. **Add Test Users**:
    - If your app is in "Testing" mode (which it will be initially), you need to add test users
    - Click **Add Users**
    - Enter email addresses of users who should be able to test the app
    - **Important**: Add your own email address here
    - Click **Add**
    - Click **Save and Continue**

#### Summary

14. Review your settings
15. Click **Back to Dashboard**

**Note**: If your app is in "Testing" mode, only the test users you added can sign in. To make it available to everyone, you'll need to submit your app for verification (not required for personal/internal apps).

---

## Part 2: Create OAuth 2.0 Client ID

Now that the consent screen is configured, you can create the OAuth credentials.

### 2.1 Navigate to Credentials

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. You should see a page with your API credentials

### 2.2 Create OAuth Client ID

1. Click **+ CREATE CREDENTIALS** button at the top
2. Select **OAuth client ID** from the dropdown

### 2.3 Configure OAuth Client

You'll see a form to configure your OAuth client:

1. **Application type**:
   - Select **Web application**

2. **Name**:
   - Enter a descriptive name (e.g., "Leave App - Web Client" or "Leave App Production")
   - This is just for your reference

3. **Authorized JavaScript origins** (Optional but recommended):
   - Click **+ ADD URI**
   - Add: `https://your-app-name.vercel.app`
   - Replace `your-app-name` with your actual Vercel app name
   - Click **+ ADD URI** again
   - Add: `http://localhost:3000` (for local development)

4. **Authorized redirect URIs** (REQUIRED):
   - This is the most important part!
   - Click **+ ADD URI**
   - Add your production redirect URI:
     ```
     https://your-app-name.vercel.app/api/auth/callback/google
     ```
     **Replace `your-app-name` with your actual Vercel app name from Step 2**
   - Click **+ ADD URI** again
   - Add your local development redirect URI:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
   - **Important**: The redirect URI must match exactly, including:
     - Protocol (`https://` for production, `http://` for local)
     - Domain (your exact Vercel app URL)
     - Path (`/api/auth/callback/google`)

5. Click **Create**

### 2.4 Save Your Credentials

After clicking Create, a popup will appear with your credentials:

1. **OAuth client created** popup will show:
   - **Your Client ID**: A long string like `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - **Your Client Secret**: A string like `GOCSPX-abcdefghijklmnopqrstuvwxyz`

2. **IMPORTANT**: Copy both values immediately!
   - Click the copy icon next to each value
   - Or manually select and copy
   - Save them in a secure place (password manager, notes app, etc.)
   - **You won't be able to see the Client Secret again** after closing this popup

3. Click **OK** to close the popup

### 2.5 Verify Your OAuth Client

1. You should now see your OAuth client in the **Credentials** page
2. It will be listed under **OAuth 2.0 Client IDs**
3. You can click on it to edit settings later if needed

---

## Part 3: Verify Configuration

Let's make sure everything is set up correctly:

### 3.1 Check OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Verify:
   - ✅ User type is set (External or Internal)
   - ✅ App name is filled
   - ✅ Your email is in support email
   - ✅ Required scopes are added (`email` and `profile`)
   - ✅ Your email is in test users (if in testing mode)

### 3.2 Check OAuth Client

1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth client name
3. Verify:
   - ✅ Application type is "Web application"
   - ✅ Authorized redirect URIs include:
     - `https://your-app-name.vercel.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
   - ✅ Client ID is visible
   - ✅ Client Secret shows as "••••••••" (this is normal - you can't see it again)

---

## Part 4: Common Issues and Solutions

### Issue: "Redirect URI mismatch" error

**Symptoms**: When trying to log in, you get an error about redirect URI mismatch.

**Solutions**:
1. Check that the redirect URI in Google Console exactly matches:
   - `https://your-exact-vercel-url.vercel.app/api/auth/callback/google`
   - No trailing slashes
   - Correct protocol (https, not http for production)
   - Exact domain (including any subdomains)

2. Common mistakes:
   - Using `http://` instead of `https://` for production
   - Missing `/api/auth/callback/google` path
   - Typo in the domain name
   - Extra spaces or characters

3. After fixing, wait a few minutes for changes to propagate

### Issue: "Access blocked: This app's request is invalid"

**Symptoms**: Google shows an error saying the app's request is invalid.

**Solutions**:
1. Make sure you're using a test user email (if app is in testing mode)
2. Go to OAuth consent screen → Test users
3. Add your email address if it's not there
4. Wait a few minutes after adding

### Issue: "Error 400: redirect_uri_mismatch"

**Symptoms**: Specific error about redirect URI.

**Solutions**:
1. Double-check the redirect URI in your OAuth client settings
2. Make sure `NEXTAUTH_URL` environment variable matches your app URL
3. Verify the redirect URI in your NextAuth configuration matches

### Issue: Can't see Client Secret after creation

**Solution**: 
- You can't retrieve the Client Secret after closing the popup
- You'll need to create a new OAuth client if you lost it
- Or use the existing one if you saved it

---

## Part 5: What You Need for Next Steps

After completing this step, you should have:

1. ✅ **OAuth Client ID**: 
   - Format: `123456789-abc...apps.googleusercontent.com`
   - Save this for the `GOOGLE_CLIENT_ID` environment variable

2. ✅ **OAuth Client Secret**: 
   - Format: `GOCSPX-abc...`
   - Save this for the `GOOGLE_CLIENT_SECRET` environment variable

3. ✅ **Verified Redirect URIs**:
   - Production: `https://your-app-name.vercel.app/api/auth/callback/google`
   - Local: `http://localhost:3000/api/auth/callback/google`

---

## Quick Reference: Redirect URI Format

The redirect URI must be in this exact format:

```
https://[your-vercel-app-name].vercel.app/api/auth/callback/google
```

Examples:
- ✅ `https://leaveapp-new.vercel.app/api/auth/callback/google`
- ✅ `http://localhost:3000/api/auth/callback/google`
- ❌ `https://leaveapp-new.vercel.app/api/auth/callback/google/` (trailing slash)
- ❌ `https://leaveapp-new.vercel.app/auth/callback/google` (missing `/api`)
- ❌ `http://leaveapp-new.vercel.app/api/auth/callback/google` (http instead of https)

---

## Next Steps

Once you have your Client ID and Client Secret:

1. ✅ Save them securely
2. ✅ Proceed to Step 4 (Database Setup) or Step 7 (Environment Variables)
3. ✅ You'll add these credentials to Vercel environment variables:
   - `GOOGLE_CLIENT_ID` = Your Client ID
   - `GOOGLE_CLIENT_SECRET` = Your Client Secret

---

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider Docs](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Troubleshooting Tip**: If you encounter any issues, the most common problem is the redirect URI not matching exactly. Double-check the URI in both Google Console and your environment variables!

