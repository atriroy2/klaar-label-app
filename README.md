# SaaS Boilerplate - Multi-Tenant Next.js Application

A production-ready Next.js 14 boilerplate with multi-tenant architecture, authentication, and role-based access control. Built with TypeScript, Prisma, NextAuth.js, and shadcn/ui.

## 🚀 Features

### Core Features
- **Multi-Tenant Architecture** - Complete tenant isolation with tenant-scoped data
- **Authentication** - Google OAuth integration with NextAuth.js
- **Role-Based Access Control** - Three-tier role system (USER, TENANT_ADMIN, SUPER_ADMIN)
- **User Management** - Create, edit, activate/deactivate users per tenant
- **Tenant Management** - Super admin interface for managing tenants
- **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- **Type-Safe** - Full TypeScript support with Prisma ORM

### Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v4
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- A **Supabase** account and project
- **Google Cloud Console** project with OAuth credentials

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone git@github.com:atriroy2/saas-boilerplate.git
cd saas-boilerplate
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database (Supabase connection string - use port 6543 for connection pooling)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?sslmode=require"

# NextAuth Configuration
NEXTAUTH_SECRET="generate_with_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Initialize first tenant and super admin
npx tsx scripts/init-first-tenant.ts
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Detailed Setup Guide

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## 🏗️ Project Structure

```
saas-boilerplate/
├── app/                      # Next.js App Router
│   ├── (app)/               # Protected app routes
│   │   ├── admin/           # Tenant admin routes
│   │   └── dashboard/       # Dashboard page
│   ├── (auth)/              # Auth layout
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── tenants/         # Tenant management
│   │   └── users/           # User management
│   ├── auth/                # Auth pages (login, etc.)
│   └── superadmin/          # Super admin page
├── components/              # Reusable UI components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utility functions
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   └── utils.ts             # Helper functions
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Prisma schema
├── scripts/                 # Utility scripts
│   └── init-first-tenant.ts # Initialize first tenant
└── types/                   # TypeScript type definitions
```

## 🔐 Authentication & Authorization

### Roles

- **USER**: Regular user with basic access
- **TENANT_ADMIN**: Can manage users within their tenant
- **SUPER_ADMIN**: Platform-wide access, can manage tenants and all users

### Access Control

- **Tenant Isolation**: Users can only access data from their tenant
- **Role-Based Routes**: Middleware protects routes based on user roles
- **Super Admin Flexibility**: Super admins can be assigned to tenants while retaining platform access

## 🗄️ Database Schema

### Core Models

- **Tenant**: Represents a customer organization
- **User**: User accounts with role and tenant association
- **Account**: OAuth account linking (NextAuth)
- **Session**: User sessions (NextAuth)

See `prisma/schema.prisma` for the complete schema.

## 🛠️ Available Scripts

```bash
# Development
npm run dev          # Start development server

# Build
npm run build        # Build for production
npm start            # Start production server

# Database
npx prisma generate  # Generate Prisma Client
npx prisma migrate   # Run database migrations
npx prisma studio    # Open Prisma Studio (database GUI)

# Code Quality
npm run lint         # Run ESLint
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (use port 6543 for Supabase) | Yes |
| `NEXTAUTH_SECRET` | Secret key for NextAuth (generate with `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | Your application URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public application URL | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Add test users in OAuth consent screen

### Supabase Setup

1. Create a new Supabase project
2. Get connection string from Project Settings → Database
3. **Important**: Use port `6543` (connection pooling) instead of `5432`
4. Run migrations to set up the database schema

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Architecture](./docs/ARCHITECTURE.md) - System architecture overview

## 🤝 Contributing

This is a starter boilerplate. Feel free to fork and customize for your needs!

## 📄 License

MIT License - feel free to use this for your projects.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)
- Database ORM by [Prisma](https://www.prisma.io/)

---

**Ready to build?** Start with the [Setup Guide](./SETUP.md) or jump to [Quick Start](#-quick-start).
