# Vercel Environment Variables Checklist

Use this to verify all required environment variables are set in Vercel for login to work.

## Required for Google Login

### 1. Google OAuth Credentials

```bash
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

**How to verify in Vercel:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. Make sure they match your local `.env.local` values

### 2. NextAuth Configuration

```bash
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-actual-vercel-app-name.vercel.app
```

**Important**: 
- `NEXTAUTH_URL` must match your actual Vercel app URL exactly
- No trailing slash
- Must be `https://` (not `http://`)

### 3. Application URL

```bash
NEXT_PUBLIC_APP_URL=https://your-actual-vercel-app-name.vercel.app
```

**Important**: Must match your actual Vercel app URL

### 4. Database Connection

```bash
DATABASE_URL=postgresql://postgres:8bQpsCJKvpx4vY06@db.otytgxdfzqgavawohysu.supabase.co:6543/postgres?sslmode=require
```

**Note**: Use connection pooling port (6543) for Supabase

---

## How to Check/Set in Vercel

### Step 1: Go to Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**

### Step 2: Verify Each Variable

Check that these are set for **Production** environment:

- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (must be your exact Vercel URL)
- [ ] `NEXT_PUBLIC_APP_URL` (must be your exact Vercel URL)
- [ ] `DATABASE_URL`

### Step 3: Add Missing Variables

If any are missing:

1. Click **"Add New"**
2. Enter the **Key** (variable name)
3. Enter the **Value** (from your `.env.local`)
4. Select **Production** (and Preview/Development if needed)
5. Click **Save**

### Step 4: Redeploy

After adding/updating variables:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger a new deployment

---

## Common Login Issues

### Issue: "Redirect URI mismatch"

**Symptoms**: Google shows error about redirect URI

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. APIs & Services → Credentials
3. Click on your OAuth Client ID
4. Add redirect URI: `https://your-actual-vercel-url.vercel.app/api/auth/callback/google`
5. Make sure `NEXTAUTH_URL` in Vercel matches this URL exactly

### Issue: "User not found"

**Symptoms**: Login redirects but shows "User not found" error

**Solution**:
1. Create a user in your production database:
   - Email must match your Google account email exactly
   - Role: `SUPER_ADMIN`
   - `isActive`: `true`

2. You can use Prisma Studio locally pointing to production:
   ```bash
   # Make sure DATABASE_URL in .env points to production
   npx prisma studio
   ```

### Issue: "Invalid credentials" or "Configuration error"

**Solution**:
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check they match what's in Google Cloud Console
- Make sure there are no extra spaces or quotes in Vercel

### Issue: Session not working

**Solution**:
- Verify `NEXTAUTH_SECRET` is set (should be a long random string)
- Make sure `NEXTAUTH_URL` matches your app URL exactly
- Check `NEXT_PUBLIC_APP_URL` also matches

---

## Quick Verification Commands

If you have Vercel CLI installed:

```bash
# Pull environment variables to verify
vercel env pull .env.vercel

# Check what's set
cat .env.vercel | grep -E "(NEXTAUTH|GOOGLE|DATABASE_URL)"
```

---

## Your Current Local Values (for reference)

From your `.env.local`:

```bash
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
DATABASE_URL=your_database_url_here
```

**Important**: For Vercel, change:
- `NEXTAUTH_URL` to your actual Vercel URL (not localhost)
- `NEXT_PUBLIC_APP_URL` to your actual Vercel URL (not localhost)

---

## Step-by-Step Fix

1. **Get your Vercel app URL**:
   - Go to Vercel Dashboard → Your Project
   - Copy the URL (e.g., `https://leaveapp-new.vercel.app`)

2. **Set environment variables in Vercel**:
   - Go to Settings → Environment Variables
   - Add/update:
     ```
     NEXTAUTH_URL=https://your-actual-url.vercel.app
     NEXT_PUBLIC_APP_URL=https://your-actual-url.vercel.app
     GOOGLE_CLIENT_ID=your_google_client_id_here
     GOOGLE_CLIENT_SECRET=your_google_client_secret_here
     NEXTAUTH_SECRET=your_nextauth_secret_here
     DATABASE_URL=your_database_url_here
     ```

3. **Update Google OAuth redirect URI**:
   - Add: `https://your-actual-url.vercel.app/api/auth/callback/google`

4. **Redeploy**:
   - Redeploy your app in Vercel

5. **Create user in database** (if not already done):
   - Use Prisma Studio or Supabase dashboard
   - Create user with your Google email

6. **Test login**:
   - Visit your Vercel app URL
   - Try logging in with Google

---

**Most Common Issue**: `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` not matching the actual Vercel URL, or Google OAuth redirect URI not added.

