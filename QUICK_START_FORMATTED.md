# Quick Start - klaar-label-app

## Step-by-Step Instructions

### Step 1: Open Project in Cursor

1. Open Cursor
2. Go to **File → Open Folder**
3. Select `/Users/atriroy/klaar-label-app`

---

### Step 2: Get Supabase Connection String

1. Go to **Supabase Dashboard**
2. Navigate to **Your Project → Settings → Database**
3. Copy the **URI connection string**
4. **Important**: Change the port from `5432` to `6543`
5. Format should be:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:6543/postgres?sslmode=require
   ```

---

### Step 3: Create .env.local

Create a `.env.local` file in the project root with the following content:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?sslmode=require"
NEXTAUTH_SECRET="generate_with_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your_existing_client_id"
GOOGLE_CLIENT_SECRET="your_existing_client_secret"
```

**To generate NEXTAUTH_SECRET**, run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output and replace `"generate_with_openssl_rand_base64_32"` with the generated value.

---

### Step 4: Install Dependencies

Run in terminal:
```bash
npm install
```

---

### Step 5: Generate Prisma Client

Run in terminal:
```bash
npx prisma generate
```

---

### Step 6: Remove Old Migrations

Run in terminal:
```bash
rm -rf prisma/migrations
```

---

### Step 7: Create Initial Migration

Run in terminal:
```bash
npx prisma migrate dev --name init
```

---

### Step 8: Initialize First Tenant & Super Admin

Run in terminal (choose one):

**Option 1:**
```bash
npx ts-node scripts/init-first-tenant.ts
```

**Option 2 (if ts-node doesn't work):**
```bash
npx tsx scripts/init-first-tenant.ts
```

---

### Step 9: Start Dev Server

Run in terminal:
```bash
npm run dev
```

---

### Step 10: Log In

1. Go to `http://localhost:3000`
2. Sign in with Google using `atri@klaarhq.com`
3. **Important**: Ensure this email is added as a test user in Google Cloud Console

---

## Notes

- Full detailed guide is saved in `QUICK_START.md` in your project directory
- Follow these steps in order
- Make sure all environment variables are properly set before proceeding
