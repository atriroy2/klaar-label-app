# Verifying Vercel Cron Jobs Setup

This guide explains how to verify that your cron jobs are properly configured and running in Vercel.

## Prerequisites

1. **CRON_SECRET Environment Variable**: Make sure you have set `CRON_SECRET` in your Vercel project's environment variables. This is required for cron job authentication.

## Cron Jobs Configured

Your `vercel.json` defines 3 cron jobs, all running daily at midnight (UTC):

1. **Process Credit Events** - `/api/cron/process-credit-events`
   - Runs: `0 0 * * *` (daily at 00:00 UTC)
   - Purpose: Automatically creates credit events based on leave policies

2. **Process Reset Dates** - `/api/cron/process-reset-dates`
   - Runs: `0 0 * * *` (daily at 00:00 UTC)
   - Purpose: Handles leave balance resets based on policy configurations

3. **Validate Leave Balances** - `/api/cron/validate-leave-balances`
   - Runs: `0 0 * * *` (daily at 00:00 UTC)
   - Purpose: Validates and cancels leave requests if users don't have sufficient balance

## Verification Steps

### 1. Check Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs** (or **Functions** → **Cron Jobs**)
3. You should see all 3 cron jobs listed with their schedules
4. Check that each cron job shows:
   - ✅ Status: Active/Enabled
   - ✅ Schedule: `0 0 * * *`
   - ✅ Path: Correct API route

### 2. Check Environment Variables

1. In Vercel Dashboard, go to **Settings** → **Environment Variables**
2. Verify `CRON_SECRET` is set:
   - Should be set for **Production**, **Preview**, and **Development** (as needed)
   - Use a strong, random secret (e.g., generate with: `openssl rand -base64 32`)

### 3. Check Cron Execution Logs

1. In Vercel Dashboard, go to **Deployments**
2. Click on a recent deployment
3. Navigate to **Functions** tab
4. Look for cron job executions in the logs
5. Check for:
   - Successful executions (200 status)
   - Error messages if any
   - Execution timestamps matching the schedule

### 4. Manual Testing (Recommended)

You can manually trigger each cron job to verify they work:

#### Option A: Via Browser/API Client (Admin Only)

As an admin user, you can trigger cron jobs manually by adding `?manual=true`:

```bash
# Process Credit Events
https://your-domain.vercel.app/api/cron/process-credit-events?manual=true

# Process Reset Dates
https://your-domain.vercel.app/api/cron/process-reset-dates?manual=true

# Validate Leave Balances
https://your-domain.vercel.app/api/cron/validate-leave-balances?manual=true
```

**Note**: You must be logged in as a TENANT_ADMIN or SUPER_ADMIN to use manual triggers.

#### Option B: Via cURL with CRON_SECRET

```bash
# Replace YOUR_CRON_SECRET with your actual secret
curl -X GET "https://your-domain.vercel.app/api/cron/process-credit-events" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X GET "https://your-domain.vercel.app/api/cron/process-reset-dates" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

curl -X GET "https://your-domain.vercel.app/api/cron/validate-leave-balances" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 5. Check Function Logs

1. In Vercel Dashboard, go to **Functions**
2. Search for your cron job routes:
   - `api/cron/process-credit-events`
   - `api/cron/process-reset-dates`
   - `api/cron/validate-leave-balances`
3. Review recent invocations:
   - Check execution times
   - Review response status codes
   - Look for error messages

### 6. Verify Database Changes

After a cron job runs, verify it made the expected changes:

#### For Process Credit Events:
```sql
-- Check recent credit events created
SELECT * FROM "CreditEvent" 
WHERE "createdAt" >= CURRENT_DATE 
ORDER BY "createdAt" DESC;
```

#### For Process Reset Dates:
- Check if leave balances were reset according to policy configurations
- Review any reset-related logs or database changes

#### For Validate Leave Balances:
```sql
-- Check for cancelled leave requests
SELECT * FROM "LeaveRequest" 
WHERE status = 'CANCELLED' 
AND "updatedAt" >= CURRENT_DATE;
```

## Common Issues and Solutions

### Issue: Cron jobs not appearing in Vercel Dashboard

**Solution:**
- Ensure `vercel.json` is in the root of your project
- Verify the JSON syntax is correct
- Redeploy your application after adding/updating cron jobs
- Check that you're on a Vercel plan that supports cron jobs (Pro plan or higher)

### Issue: 401 Unauthorized errors

**Solution:**
- Verify `CRON_SECRET` is set in Vercel environment variables
- Ensure the secret matches what's expected in your code
- Check that Vercel is sending the `Authorization` header with the correct format
- For manual triggers, ensure you're logged in as an admin

### Issue: Cron jobs not executing

**Solution:**
- Verify the schedule syntax is correct (Cron format: `minute hour day month weekday`)
- Check Vercel's cron job status in the dashboard
- Ensure your deployment is successful
- Check Vercel's status page for any service issues
- Review function logs for execution attempts

### Issue: Timezone confusion

**Solution:**
- Vercel cron jobs run in UTC timezone
- `0 0 * * *` means midnight UTC, not your local timezone
- Adjust the schedule if you need a different time
- Example: For 9 AM EST (UTC-5), use `0 14 * * *` (2 PM UTC)

## Testing Schedule

To test cron jobs more frequently during development, you can temporarily change the schedule:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-credit-events",
      "schedule": "*/5 * * * *"  // Every 5 minutes (for testing only!)
    }
  ]
}
```

**⚠️ Remember to change it back to `0 0 * * *` for production!**

## Monitoring

### Set up Alerts

1. Set up Vercel webhooks or integrations to get notified of:
   - Failed cron job executions
   - Deployment status changes

### Add Logging

Consider adding more detailed logging to your cron jobs:

```typescript
console.log(`[Cron] Process Credit Events started at ${new Date().toISOString()}`)
// ... your code ...
console.log(`[Cron] Process Credit Events completed: ${eventsCreated.length} events created`)
```

### Health Check Endpoint

Consider creating a health check endpoint that reports cron job status:

```typescript
// app/api/cron/health/route.ts
export async function GET() {
  return Response.json({
    cronJobs: {
      'process-credit-events': 'configured',
      'process-reset-dates': 'configured',
      'validate-leave-balances': 'configured'
    },
    lastExecution: {
      // Add tracking for last execution times
    }
  })
}
```

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Schedule Syntax](https://crontab.guru/)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
