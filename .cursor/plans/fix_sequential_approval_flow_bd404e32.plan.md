---
name: Fix Sequential Approval Flow
overview: Debug and fix the sequential approval workflow where leave requests are being marked as approved prematurely and manager's manager isn't seeing pending tasks. The issue appears to be in both the status update logic and the task visibility filtering.
todos:
  - id: add_logging
    content: Add comprehensive logging to approval-tasks GET and PATCH handlers to trace the approval flow
    status: pending
  - id: fix_status_comparison
    content: Fix status comparison logic to use Prisma enums consistently and remove string fallbacks
    status: completed
  - id: verify_task_creation
    content: Verify and log that both level 0 and level 1 tasks are created correctly when required
    status: pending
  - id: fix_visibility_filter
    content: Fix sequential visibility filter in GET handler to correctly show level 1 tasks after level 0 approval
    status: completed
  - id: fix_status_update
    content: Fix leave request status update logic to ensure it only approves when ALL tasks are approved
    status: pending
  - id: add_db_verification
    content: Add database query verification after status updates to ensure consistency
    status: completed
  - id: test_flow
    content: Test the complete two-level approval flow and verify logs show correct behavior
    status: pending
---

# Fix Sequential Approval Flow

## Problem Analysis

The sequential approval flow is failing:

1. **Premature Approval**: Leave request shows as APPROVED in UI immediately after first manager approves (though database might still be PENDING)
2. **Missing Tasks**: Manager's manager doesn't see pending approval tasks in their dashboard
3. **Status Mismatch**: UI and database state may be out of sync

## Root Cause Investigation

Need to verify:

1. **Task Creation**: Are both level 0 and level 1 tasks being created correctly when a leave request requires manager's manager approval?
2. **Status Update Logic**: Is the PATCH handler in `app/api/approval-tasks/route.ts` correctly checking for pending tasks before updating leave request status?
3. **Task Visibility**: Is the GET handler in `app/api/approval-tasks/route.ts` correctly filtering tasks based on sequential approval (only showing level 1 tasks after level 0 is approved)?
4. **Status Enum Comparison**: Are status comparisons working correctly (enum vs string)?

## Implementation Plan

### Step 1: Add Comprehensive Logging

**File**: `app/api/approval-tasks/route.ts`

- Add detailed logging at key points:
  - When task is approved (before status check)
  - When re-fetching all tasks
  - When checking pending/approved/rejected counts
  - When deciding to update leave request status
  - Log the exact status values and types

- Add logging in GET endpoint:
  - Log all pending tasks found
  - Log which tasks pass/fail the sequential filter
  - Log the approval chain structure

### Step 2: Fix Status Comparison Logic

**File**: `app/api/approval-tasks/route.ts` (PATCH handler, lines 213-239)

**Current Issue**: Multiple defensive checks for status comparison might be causing issues. The Prisma enum should be consistent.

**Fix**:

- Use Prisma enum directly: `ApprovalTaskStatus.PENDING`, `ApprovalTaskStatus.APPROVED`, `ApprovalTaskStatus.REJECTED`
- Remove string fallback comparisons (they might mask real issues)
- Add explicit type checking to ensure status is the enum type, not a string
- Log the actual status value and type before comparison

### Step 3: Verify Task Creation

**File**: `app/api/leave-requests/route.ts` (POST handler, lines 380-404)

**Verify**:

- Both level 0 and level 1 tasks are created when `REQUIRES_MANAGER_MANAGER_APPROVAL`
- Tasks are created with status `PENDING` (not string 'PENDING')
- Approver IDs are correct for each level
- Add logging to confirm both tasks are created

### Step 4: Fix Sequential Visibility Filter

**File**: `app/api/approval-tasks/route.ts` (GET handler, lines 65-75)

**Current Logic**: Filters tasks where previous levels are approved.

**Potential Issues**:

- Status comparison might not work correctly
- The filter might be too strict or too lenient
- Need to verify the filter is actually running

**Fix**:

- Ensure status comparison uses enum: `t.status === ApprovalTaskStatus.APPROVED`
- Add detailed logging showing which tasks pass/fail the filter
- Verify the logic: for level 1, check that level 0 is APPROVED

### Step 5: Fix Leave Request Status Update

**File**: `app/api/approval-tasks/route.ts` (PATCH handler, lines 256-291)

**Current Logic**: Checks if `pendingTasks.length === 0` before approving.

**Potential Issues**:

- The re-fetch might not be getting the latest state (transaction isolation)
- Status comparison might be failing
- The condition might be evaluating incorrectly

**Fix**:

- Add explicit check: ensure we're checking ALL tasks, not just the ones we fetched
- Use database transaction or add a small delay to ensure consistency
- Add explicit validation: count total expected tasks vs actual tasks
- Log the decision-making process step by step

### Step 6: Add Database Query Verification

**Files**: `app/api/approval-tasks/route.ts`

- After updating task status, immediately query the database to verify:
  - Task status was updated correctly
  - All related tasks for the leave request
  - Leave request status
- Compare what we expect vs what's actually in the database

### Step 7: Fix UI Status Display

**Files**: Any frontend components showing leave request status

- Ensure UI is reading from the correct source (API response, not cached state)
- Add loading states to prevent showing stale data
- Verify the API endpoint being called returns the correct status

## Testing Plan

### Test Case 1: Two-Level Approval Flow

1. Create a leave request that requires manager's manager approval
2. Verify both level 0 and level 1 tasks are created in database
3. As manager (level 0), approve the task
4. **Verify**: 

   - Leave request status remains PENDING in database
   - Manager's manager (level 1) sees the pending task
   - Requester still sees PENDING status

5. As manager's manager (level 1), approve the task
6. **Verify**:

   - Leave request status changes to APPROVED
   - Both tasks are marked APPROVED
   - Requester sees APPROVED status

### Test Case 2: Check Console Logs

1. Enable browser console and server logs
2. Perform approval actions
3. **Verify logs show**:

   - Task creation with correct levels
   - Status checks showing pending task counts
   - Decision to keep PENDING or change to APPROVED
   - Task visibility filtering results

### Test Case 3: Database State Verification

1. After each approval action, query database directly:
   ```sql
   SELECT * FROM "ApprovalTask" WHERE "leaveReq	uestId" = '<id>' ORDER BY level;
   SELECT status FROM "LeaveRequest" WHERE id = '<id>';
   ```

2. Verify state matches expected state at each step

## Files to Modify

1. `app/api/approval-tasks/route.ts` - Main approval logic (GET and PATCH handlers)
2. `app/api/leave-requests/route.ts` - Task creation logic (POST handler)
3. Frontend components (if UI caching is the issue) - TBD after investigation

## Success Criteria

- Leave request stays PENDING until ALL required approval tasks are APPROVED
- Manager's manager sees their pending task after manager approves
- Status updates are atomic and consistent
- Console logs clearly show the decision-making process
- Database state matches UI state at all times