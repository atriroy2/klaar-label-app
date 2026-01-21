# Calendar View Dashboard Feature

## Overview
Replace the existing dashboard page with a comprehensive calendar view showing all users' leave status across a horizontally scrollable calendar. The calendar will show availability status with color coding and support infinite scroll pagination.

## Current State
- Dashboard page: `app/(app)/dashboard/page.tsx` - Currently shows a poem
- Users API: `app/api/users/route.ts` - Returns all users for tenant
- Leave Requests API: `app/api/leave-requests/route.ts` - Returns leave requests with user and leave type info
- Holidays API: `app/api/holidays/route.ts` - Returns holidays (admin only, needs to be accessible to all users)

## Requirements

### 1. Calendar Display
- Horizontal scrollable calendar at the center of the page
- Default view: Current date visible
- Initial load: Previous 2 months + current month + next 6 months (9 months total)
- Infinite scroll: Load more months as user scrolls right
- Each day is a thin column
- User names on the left side (sticky column)

### 2. Color Coding
- **Green**: User is available (no leave)
- **Red**: User has approved leave
- **Orange**: User has pending leave request
- Multi-day leaves: Color spans across all days in the range

### 3. Visual Indicators
- Weekends: Gray background
- Holidays: Gray background
- Tooltips: Show leave type, dates, status on hover

### 4. User Visibility
- Show all users in the tenant (visibility across all users)
- Basic filter: Toggle to show/hide inactive users

### 5. Data Requirements
- Need to fetch all users (with location info for holiday checking)
- Need to fetch all leave requests (PENDING and APPROVED status)
- Need to fetch holidays for all years in the visible range
- Need to determine weekends based on user's location work schedule

## Implementation Plan

### Step 1: Create Calendar Data API Endpoint
**File:** `app/api/calendar/route.ts` (new file)

Create a new API endpoint that:
- Fetches all users in the tenant (with location info)
- Fetches all leave requests (PENDING and APPROVED) for date range
- Fetches holidays for the date range
- Returns structured data optimized for calendar display:
  ```typescript
  {
    users: Array<{
      id: string
      name: string
      email: string
      isActive: boolean
      location: { id: string, name: string } | null
    }>
    leaves: Array<{
      id: string
      userId: string
      startDate: string
      endDate: string
      status: 'PENDING' | 'APPROVED'
      leaveType: { id: string, name: string }
    }>
    holidays: Array<{
      date: string
      year: number
      holidayLocations: Array<{
        locationId: string
        name: string
        type: 'MANDATORY' | 'RESTRICTED'
      }>
    }>
  }
  ```

### Step 2: Update Holidays API Access
**File:** `app/api/holidays/route.ts`

Modify the GET endpoint to allow all authenticated users (not just admins) to read holidays, as they need this for the calendar view.

### Step 3: Create Calendar Component
**File:** `app/(app)/dashboard/components/CalendarView.tsx` (new file)

Create a reusable calendar component with:
- Horizontal scroll container
- Sticky left column for user names
- Date columns with proper width
- Color-coded cells based on leave status
- Weekend/holiday gray background
- Tooltip component for leave details
- Infinite scroll detection and loading

### Step 4: Create Calendar Utilities
**File:** `app/(app)/dashboard/utils/calendar.ts` (new file)

Helper functions:
- `generateDateRange(startDate, endDate)`: Generate array of dates
- `isWeekend(date, userLocation)`: Check if date is weekend for user's location
- `isHoliday(date, holidays, userLocation)`: Check if date is holiday for user's location
- `getLeaveStatusForDate(userId, date, leaves)`: Get leave status (available/pending/approved) for a user on a date
- `loadMoreMonths(currentEndDate)`: Calculate next batch of months to load

### Step 5: Replace Dashboard Page
**File:** `app/(app)/dashboard/page.tsx`

Replace the entire content with:
- Calendar view component
- Filter toggle for active/inactive users
- Loading states
- Error handling
- Month navigation (optional - for jumping to specific months)

### Step 6: Implement Infinite Scroll
**File:** `app/(app)/dashboard/components/CalendarView.tsx`

- Use Intersection Observer API to detect when user scrolls near the end
- Load next batch of months (e.g., 3 months at a time)
- Append new date columns to the right
- Maintain scroll position

### Step 7: Implement Tooltips
**File:** `app/(app)/dashboard/components/LeaveTooltip.tsx` (new file)

Create a tooltip component that shows:
- Leave type name
- Start date
- End date
- Status (PENDING/APPROVED)
- Days count (optional)

Use Radix UI Tooltip component or custom implementation.

### Step 8: Styling and Responsiveness
- Ensure calendar is horizontally scrollable
- Sticky left column for user names
- Proper column widths for dates
- Responsive design for different screen sizes
- Smooth scrolling experience

## Data Flow

```
User opens dashboard
  ↓
Fetch initial data (users, leaves, holidays) for date range (2 months back, 6 months forward)
  ↓
Render calendar with:
  - User names (left column, sticky)
  - Date columns (horizontal scroll)
  - Color-coded cells
  ↓
User scrolls right
  ↓
Detect scroll position near end
  ↓
Fetch next batch of months
  ↓
Append new columns
```

## Technical Considerations

1. **Performance**: 
   - Virtual scrolling might be needed for large user lists
   - Lazy load holidays for months as they come into view
   - Memoize date calculations

2. **Date Handling**:
   - Use consistent timezone (UTC or user's timezone)
   - Handle date ranges properly (inclusive start, inclusive end)
   - Account for multi-day leaves spanning across months

3. **Weekend Detection**:
   - Use user's location work schedule
   - Fallback to standard weekends if no location

4. **Holiday Detection**:
   - Check if holiday is applicable to user's location
   - Handle both MANDATORY and RESTRICTED holidays (both show gray)

5. **Leave Status Logic**:
   - If user has APPROVED leave covering the date → Red
   - If user has PENDING leave covering the date → Orange
   - Otherwise → Green

6. **Multi-day Leaves**:
   - Check if date falls within leave's startDate and endDate range
   - Apply same color across all days in range

## Files to Create/Modify

### New Files:
1. `app/api/calendar/route.ts` - Calendar data API
2. `app/(app)/dashboard/components/CalendarView.tsx` - Main calendar component
3. `app/(app)/dashboard/components/LeaveTooltip.tsx` - Tooltip component
4. `app/(app)/dashboard/utils/calendar.ts` - Calendar utility functions

### Modified Files:
1. `app/api/holidays/route.ts` - Allow all users to read holidays
2. `app/(app)/dashboard/page.tsx` - Replace with calendar view

## Testing Considerations

1. Test with large number of users (100+)
2. Test with leaves spanning multiple months
3. Test infinite scroll performance
4. Test weekend/holiday detection for different locations
5. Test tooltip display and positioning
6. Test filter toggle functionality
7. Test with users having no location assigned

