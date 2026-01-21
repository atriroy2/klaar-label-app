# NextJS Boilerplate - Multi-tenant Application Documentation

## Overview

This application is a multi-tenant platform built with Next.js that provides various features including user authentication, banner management, todo list functionality, role-based access control, and a comprehensive test automation system. The application is designed to support multiple tenants, each with their own isolated data, users, and test cases.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication System](#authentication-system)
3. [Multi-tenant Structure](#multi-tenant-structure)
4. [Key Features](#key-features)
   - [Banner Management](#banner-management)
   - [Banner Widget](#banner-widget)
   - [Todo List](#todo-list)
   - [API Key Management](#api-key-management)
   - [Test Automation System](#test-automation-system)
5. [Database Schema](#database-schema)
6. [Frontend Components](#frontend-components)
7. [API Routes](#api-routes)
8. [Middleware](#middleware)
9. [Scheduled Jobs](#scheduled-jobs)
10. [Deployment](#deployment)

## Architecture

The application is built using the following technologies:

- **Frontend**: Next.js 14, React 18
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth provider
- **State Management**: React hooks and context
- **Scheduling**: Vercel Cron Jobs

The application follows Next.js App Router structure with the following main directories:

- `app/`: Contains all pages and API routes
- `components/`: Reusable UI components
- `lib/`: Utility functions and configurations
- `prisma/`: Database schema and migrations
- `public/`: Static assets

## Authentication System

The authentication system is built using NextAuth.js with Google OAuth provider. It supports:

- Sign in with Google
- Session management
- JWT handling
- Role-based access control

### User Roles

The application has three user roles:

1. **USER**: Regular users who can access basic features
2. **TENANT_ADMIN**: Administrators of a specific tenant who can manage users and settings for their tenant
3. **SUPER_ADMIN**: System administrators who can manage all tenants and users

### Authentication Flow

1. Users sign in with Google OAuth
2. The system checks if the user exists in the database
3. If the user is new, they are created with the USER role
4. The user's role and tenant information are added to the JWT token
5. The middleware checks the user's authentication status and tenant status for protected routes

## Multi-tenant Structure

The application supports multiple tenants, each with their own:

- Users
- Banners
- Todo items
- API keys
- Test cases and test runs

### Tenant Isolation

Data isolation is achieved through database relationships. Each record (banner, todo item, test case, etc.) is associated with a tenant ID, ensuring that users can only access data from their own tenant.

## Key Features

### Banner Management

The banner management system allows tenants to create and manage announcement banners that can be displayed on their websites.

#### Banner Features:

- Create, edit, and delete banners
- Set start and end dates for banners
- Define URL patterns where banners should be displayed
- Customize banner appearance (background color, font color)
- Choose display mode (overlay, inline)

### Banner Widget

The application includes a banner widget that can be embedded in other websites to display the tenant's banners.

#### Widget Features:

- JavaScript widget that can be included in any website
- Fetches banners based on the tenant's API key
- Displays banners that match the current URL pattern
- Respects banner start and end dates
- Customizable appearance

### Todo List

A simple todo list application that demonstrates the multi-tenant functionality.

#### Todo List Features:

- Create, update, and delete todo items
- Mark todo items as completed
- Todo items are associated with users and tenants
- Real-time updates

### API Key Management

Tenants can manage API keys for accessing the banner widget and other API endpoints.

#### API Key Features:

- Generate new API keys
- View existing API keys
- Revoke API keys

### Test Automation System

The application includes a comprehensive test automation system that allows tenants to create, schedule, and execute automated tests.

#### Test Automation Features:

- **Test Case Management**: Create, update, and delete test cases with specific steps
- **Test Execution**: Run tests manually or on a schedule
- **Test Results**: View detailed test execution results
- **Scheduling**: Configure tests to run on hourly, daily, weekly, or custom schedules
- **Monitoring**: Track test status and historical performance
- **Recording**: Store and view recordings of test executions

#### Test Case Configuration:

- **Test ID**: Unique identifier for each test
- **Name**: Descriptive name for the test
- **Start URL**: Initial URL where the test begins
- **Steps**: JSON-formatted steps that define the test procedure
- **Frequency**: Schedule for running the test (hourly, daily, weekly, custom)
- **Schedule Settings**: Time configuration for the selected frequency
- **Timeout**: Maximum duration allowed for test execution

#### Test Execution Flow:

1. A test is triggered (manually or by scheduler)
2. A test run record is created with status "RUNNING"
3. The test execution engine processes the test steps
4. Results are recorded and the test run is marked as "COMPLETED", "FAILED", or another appropriate status
5. Recordings and detailed results are stored for later review

## Database Schema

The database schema is defined using Prisma and includes the following models:

### User

```prisma
model User {
  id            String     @id @default(cuid())
  name          String?
  email         String?    @unique
  emailVerified DateTime?
  image         String?
  tenantId      String?
  role          Role       @default(USER)
  isActive      Boolean    @default(true)
  accounts      Account[]
  sessions      Session[]
  todos         TodoItem[]
  testCases     TestCase[]
  tenant        Tenant?    @relation(fields: [tenantId], references: [id])
}
```

### Tenant

```prisma
model Tenant {
  id        String     @id @default(cuid())
  name      String
  domain    String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  isActive  Boolean    @default(true)
  apiConfig ApiConfig?
  apiKey    ApiKey?
  banners   Banner[]
  testCases TestCase[]
  testRuns  TestRun[]
  todos     TodoItem[]
  users     User[]
}
```

### Banner

```prisma
model Banner {
  id              String   @id @default(cuid())
  title           String
  content         String
  startDate       DateTime
  endDate         DateTime
  urlPatterns     String[]
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  createdById     String
  tenantId        String
  displayMode     String   @default("overlay")
  backgroundColor String?
  fontColor       String?
  name            String?
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### ApiKey

```prisma
model ApiKey {
  id        String   @id @default(cuid())
  key       String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenantId  String   @unique
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### TodoItem

```prisma
model TodoItem {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  userId    String
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### TestCase

```prisma
model TestCase {
  id             String    @id @default(cuid())
  testId         String    @unique
  name           String
  startUrl       String
  steps          Json
  frequency      Frequency
  hourlyMinute   Int?
  dailyHour      Int?
  weeklyDay      Int?
  weeklyHour     Int?
  customSchedule Json?
  isActive       Boolean   @default(true)
  timeoutMinutes Int       @default(10)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  tenantId       String
  createdById    String
  tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  createdBy      User      @relation(fields: [createdById], references: [id])
  testRuns       TestRun[]

  @@unique([tenantId, name])
}
```

### TestRun

```prisma
model TestRun {
  id            String    @id @default(cuid())
  testCaseId    String
  startTime     DateTime
  endTime       DateTime?
  status        RunStatus
  overallResult Boolean?
  results       Json?
  tenantId      String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  recordings    String?
  tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  testCase      TestCase  @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
}
```

### ApiConfig

```prisma
model ApiConfig {
  id        String   @id @default(cuid())
  apiUrl    String
  tenantId  String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### Enums

```prisma
enum Role {
  USER
  TENANT_ADMIN
  SUPER_ADMIN
}

enum Frequency {
  HOURLY
  DAILY
  WEEKLY
  CUSTOM
}

enum RunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  ABORTED
  TIMEOUT
}
```

## Frontend Components

The application uses a combination of custom components and shadcn/ui components for the UI.

### Main Layout Components

- **RootLayout**: The main layout component that wraps the entire application
- **AppLayout**: Layout for authenticated pages with navigation
- **NavBar**: Side navigation bar with links to different sections
- **TopNav**: Top navigation bar with user profile and actions

### Page Components

- **Dashboard**: Home page for authenticated users
- **BannersPage**: Page for managing banners
- **TodoListPage**: Page for managing todo items
- **ApiKeyDisplayPage**: Page for managing API keys
- **TestCasesPage**: Page for managing test cases
- **TestRunsPage**: Page for viewing test execution results
- **TestSchedulesPage**: Page for viewing and managing test schedules
- **LoginPage**: Page for user authentication

### UI Components

The application uses shadcn/ui components for UI elements such as:

- Buttons
- Forms
- Cards
- Dialogs
- Tabs
- Toasts
- Dropdowns

### Clock Component

The application includes a Clock component that displays the current time, date, and timezone. This component is displayed at the bottom of the navigation bar and provides users with a convenient way to track time while using the application.

Features of the Clock component:
- Real-time display of current time in HH:MM:SS format
- Current date in DD-MMM-YYYY format
- Current timezone display
- Automatic updates every second
- Responsive design that fits within the navigation layout

## API Routes

The application includes several API routes for handling data operations:

### Authentication

- `/api/auth/*`: NextAuth.js authentication routes

### Banners

- `/api/banners`: CRUD operations for banners
- `/api/banners/[id]`: Operations for a specific banner

### Todos

- `/api/todos`: CRUD operations for todo items

### Users

- `/api/users`: Operations for user management

### Tenants

- `/api/tenants`: Operations for tenant management
- `/api/tenants/status`: Check tenant status

### API Keys

- `/api/api-keys`: Operations for API key management

### Banner Widget

- `/banner-widget`: Serves the banner widget script

### Test Automation

- `/api/test-cases`: CRUD operations for test cases
- `/api/test-cases/[id]`: Operations for a specific test case
- `/api/test-cases/[id]/run`: Execute a specific test case
- `/api/test-runs`: Operations for retrieving test runs
- `/api/test-runs/[id]`: Operations for a specific test run
- `/api/scheduler`: Scheduled job endpoint for running tests based on their frequency settings

## Middleware

The application uses middleware for:

- Authentication checks
- Role-based access control
- Tenant status verification
- Redirects for unauthenticated users

The middleware is defined in `middleware.ts` and handles:

- Redirecting unauthenticated users to the login page
- Checking tenant status for authenticated users
- Restricting access to admin routes based on user roles
- Handling API routes authentication

## Scheduled Jobs

The application includes a scheduling system to run automated tests at configured intervals:

### Scheduler Implementation

The scheduler is implemented using Vercel Cron Jobs, which trigger an API endpoint at regular intervals:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/scheduler?key=YOUR_SCHEDULER_API_KEY",
      "schedule": "*/30 * * * *"
    }
  ],
  "functions": {
    "api/scheduler": {
      "maxDuration": 60
    }
  }
}
```

### Test Scheduling Process

1. The cron job runs every 30 minutes and calls the `/api/scheduler` endpoint with an API key
2. The scheduler identifies all active test cases and calculates their previous scheduled run time based on frequency
3. For each test case, it checks if a completed test run exists after the previous scheduled time
4. If no completed run exists, it adds the test case to a queue for execution
5. Tests in the queue are executed sequentially with a 2-second delay between each execution

### Scheduler API

The scheduler API (`/api/scheduler`) handles:

1. **Authentication**: Validates the API key provided by the cron job
2. **Test Selection**: Identifies tests that need to be run based on their schedules
3. **Execution**: Triggers test executions for selected tests
4. **Logging**: Records detailed logs of the scheduling process

### Frequency Calculation

The scheduler calculates the previous scheduled run time for each test based on its frequency:

- **Hourly**: Runs at a specific minute of each hour
- **Daily**: Runs at a specific hour each day
- **Weekly**: Runs on a specific day and hour each week
- **Custom**: Runs according to a custom schedule defined in JSON format

## Deployment

The application is designed to be deployed on Vercel, but can be deployed on any platform that supports Next.js applications.

### Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: PostgreSQL database connection string
- `NEXTAUTH_URL`: URL of the application
- `NEXTAUTH_SECRET`: Secret for NextAuth.js
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `SCHEDULER_API_KEY`: Secret key for authenticating the scheduler API

### Build and Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Start the application
npm start
```

### Vercel Deployment

For Vercel deployment, the following steps are required:

1. Connect your GitHub repository to Vercel
2. Configure the necessary environment variables
3. Deploy the application
4. Set up the Vercel Cron Job for the scheduler

## Conclusion

This multi-tenant application provides a solid foundation for building SaaS applications with Next.js. It includes essential features such as authentication, role-based access control, multi-tenant data isolation, test automation with scheduling, and example features like banner management and todo lists to demonstrate the architecture. 