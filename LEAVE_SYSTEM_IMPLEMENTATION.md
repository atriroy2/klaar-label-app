# Leave Management System - Implementation Summary

## ✅ What Has Been Implemented

### 1. Database Schema Updates
- **LeaveRequest Model**: Tracks leave applications with status (PENDING, APPROVED, REJECTED, CANCELLED)
- **Relations**: Connected to User and LeaveType models
- **Indexes**: Optimized for queries by user, leave type, status, and date ranges

### 2. Automatic Credit Event Generation
- **Scheduled Job**: `/app/api/cron/process-credit-events/route.ts`
  - Runs daily at midnight (configured in `vercel.json`)
  - Finds active policies and assigned users
  - Calculates if today is a credit event date based on:
    - `ONE_TIME`: Credits on policy start date
    - `MONTHLY`: Credits on 1st of month (START) or last day (END)
    - `QUARTERLY`: Credits on quarter start/end dates
  - Creates `CreditEvent` records automatically
  - Prevents duplicate credits for the same day

### 3. Leave Requests API
- **GET**: List leave requests (users see their own, admins see all)
- **POST**: Create new leave request
  - Validates dates and leave type
  - All requests start as PENDING (requires admin approval)
  - Calculates working days (excludes weekends)
- **PATCH**: Update leave request status
  - Users can cancel their own pending requests
  - Admins can approve/reject requests

### 4. Leave Balances API
- **GET**: Calculate and return leave balances
  - Sums all non-reverted credit events by leave type
  - Subtracts approved leave requests
  - Returns current balance, credits, and leaves taken
  - Includes credit history and leave history

### 5. User Leaves Dashboard
- **Page**: `/app/(app)/leaves/page.tsx`
- **Features**:
  - **Balances Tab**: Shows current balances by leave type
  - **History Tab**: Shows credit history and leave request history
  - **Request Leave**: Dialog to submit new leave requests
  - **Recent Activity**: Quick view of recent credits and leaves

### 6. Navigation Updates
- Added "My Leaves" menu item in the main navigation
- Visible to all authenticated users

## 🔄 How It Works (Hybrid Approach)

### Automatic Credit Events
1. **Daily Cron Job** runs at midnight
2. Finds all active policies (not archived, within effective dates)
3. For each policy configuration:
   - Checks if today matches the credit schedule (frequency + creditAt)
   - Gets all users assigned to the policy
   - Creates `CreditEvent` records for each user
4. Events are stored in the database with exact dates

### Balance Calculation
1. **On-Demand**: When user views their dashboard
2. **Calculation**:
   - Credits = Sum of non-reverted `CreditEvent` records
   - Leaves Taken = Sum of approved `LeaveRequest` days
   - Balance = Credits - Leaves Taken
3. **Real-time**: Always reflects current state

### Leave Request Flow
1. User submits leave request
2. Request is created with `PENDING` status
3. Admin can approve/reject from admin panel (to be implemented)
4. Approved leaves are deducted from balance

## 📋 Next Steps

### 1. Run Database Migration
```bash
npx prisma migrate dev --name add_leave_requests
npx prisma generate
```

### 2. Set Up Cron Secret (for Vercel)
Add to Vercel environment variables:
- `CRON_SECRET`: A random string for securing the cron endpoint

### 3. Test the System
1. Create a leave policy with monthly credits
2. Assign users to the policy
3. Wait for the cron job to run (or trigger manually)
4. Check credit events are created
5. Submit a leave request
6. View balances on the user dashboard

### 4. Future Enhancements (Optional)
- Admin panel to approve/reject leave requests
- Email notifications for leave requests
- Carry-forward logic implementation
- Holiday calendar integration
- Leave request cancellation by users
- Manager approval workflow

## 🔐 Security Notes

- Cron job endpoint should be protected with `CRON_SECRET`
- Users can only see their own leave requests (unless admin)
- All operations are tenant-scoped
- Leave requests validate user belongs to same tenant

## 📊 Data Flow

```
Policy Created → Users Assigned → Cron Job Runs → Credit Events Created
                                                          ↓
User Views Dashboard → Balance Calculated (Credits - Leaves Taken)
                                                          ↓
User Requests Leave → Request Created → Admin Approves → Balance Updated
```

## 🎯 Key Features

✅ Automatic credit event generation  
✅ Real-time balance calculation  
✅ Leave request management  
✅ Credit and leave history  
✅ User-friendly dashboard  
✅ Tenant isolation  

