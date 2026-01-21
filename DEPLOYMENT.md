# Deployment Guide

This guide covers deploying the SaaS boilerplate to production.

## Prerequisites

- GitHub repository with your code
- Vercel account (recommended) or another hosting platform
- Production Supabase project
- Production Google OAuth credentials

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest way to deploy Next.js applications.

#### Step 1: Prepare Your Repository

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

#### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

#### Step 3: Add Environment Variables

In Vercel project settings, add all environment variables:

```
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:6543/postgres?sslmode=require
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
```

**Important**: 
- Use production Supabase database URL
- Generate a new `NEXTAUTH_SECRET` for production
- Update Google OAuth redirect URI to: `https://your-domain.vercel.app/api/auth/callback/google`

#### Step 4: Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be live at `https://your-project.vercel.app`

### Option 2: Other Platforms

The application can be deployed to any platform that supports Next.js:

- **Netlify**: Similar to Vercel, supports Next.js
- **Railway**: Easy PostgreSQL + Next.js deployment
- **Render**: Full-stack platform with PostgreSQL
- **AWS/DigitalOcean**: Self-hosted with more control

## Post-Deployment Steps

### 1. Update Google OAuth Settings

1. Go to Google Cloud Console
2. Edit your OAuth client
3. Add production redirect URI:
   ```
   https://your-domain.com/api/auth/callback/google
   ```

### 2. Run Database Migrations

If you haven't already:

```bash
# Set production DATABASE_URL
export DATABASE_URL="your_production_database_url"

# Run migrations
npx prisma migrate deploy
```

### 3. Initialize Production Database

```bash
# Set production DATABASE_URL
export DATABASE_URL="your_production_database_url"

# Initialize first tenant
npx tsx scripts/init-first-tenant.ts
```

### 4. Verify Deployment

1. Visit your production URL
2. Test login flow
3. Verify all features work:
   - User authentication
   - Tenant management (super admin)
   - User management (tenant admin)

## Environment Variables for Production

| Variable | Production Value |
|----------|------------------|
| `DATABASE_URL` | Production Supabase connection string |
| `NEXTAUTH_SECRET` | New secret (different from dev) |
| `NEXTAUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `GOOGLE_CLIENT_ID` | Production OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Production OAuth client secret |

## Database Considerations

### Supabase Production Setup

1. Create a new Supabase project for production
2. Use connection pooling (port 6543)
3. Enable SSL mode
4. Set up database backups
5. Monitor database usage

### Migration Strategy

1. **Development**: Use `prisma migrate dev` (allows reset)
2. **Production**: Use `prisma migrate deploy` (safe, no reset)

## Security Checklist

- [ ] Use strong, unique `NEXTAUTH_SECRET`
- [ ] Enable SSL/TLS (HTTPS)
- [ ] Use production database (separate from dev)
- [ ] Restrict Google OAuth to production domain
- [ ] Enable Supabase database backups
- [ ] Set up monitoring and error tracking
- [ ] Review and restrict CORS settings
- [ ] Enable rate limiting (if needed)

## Monitoring

### Recommended Tools

- **Vercel Analytics**: Built-in for Vercel deployments
- **Sentry**: Error tracking
- **Supabase Dashboard**: Database monitoring
- **Google Analytics**: User analytics

## Troubleshooting Production Issues

### Database Connection Errors

- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Verify network access (firewall rules)

### Authentication Not Working

- Verify `NEXTAUTH_URL` matches your domain
- Check Google OAuth redirect URI is correct
- Verify test users are added in Google Console

### Build Errors

- Check Node.js version matches (v18+)
- Verify all environment variables are set
- Review build logs for specific errors

---

**Ready to deploy?** Follow the steps above and your SaaS application will be live! 🚀
