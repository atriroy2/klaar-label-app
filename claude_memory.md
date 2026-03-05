# Claude Memory — klaar-label-app (Frontend)

> Last updated: 2026-03-05
> This file is a persistent memory store for Claude across sessions. Update it when significant context is established.

---

## Product Overview

This is the frontend for **Klaar Huddles** — a meeting intelligence platform built as part of the Klaar HR tech SaaS (klaarhq.com). It records meetings (Zoom + Google Meet), transcribes them, generates AI summaries, action items, and key topics, and lets users chat with meeting content via AI.

The product is built by Atri Roy and his co-founder. Atri handles product, engineering, finance, and operations. The company is a Google shop (Google Drive, Google Workspace).

---

## Tech Stack

- **Framework**: Next.js 14, App Router, TypeScript
- **Auth**: NextAuth with Google OAuth — roles: `USER`, `TENANT_ADMIN`, `SUPER_ADMIN` (defined in `lib/auth.ts`)
- **Database**: Prisma ORM (for labeling system)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **State**: React hooks (no Redux/Zustand)
- **Backend communication**: Fetch calls to `klaar-earl-code` backend, proxied through `app/api/huddles/backend-headers.ts` which adds auth headers including `X-User-Role`

---

## Directory Structure

```
app/
  (app)/
    huddles/          — Personal huddles list + detail pages
      [id]/page.tsx   — Huddle detail (recording, transcript, summary, chat, participant mapping)
    admin/
      huddles/        — Admin "All Huddles" view (no access filtering, role-gated)
        [id]/page.tsx — Re-exports the standard huddle detail page
    dashboard/        — Dashboard
    google-meet/      — Google Meet integration pages
    zoom/             — Zoom integration pages
    leaderboard/      — Leaderboard feature
    rating/           — Rating feature
    layout.tsx        — App shell layout
  api/
    huddles/          — API proxy routes to backend (backend-headers.ts handles proxying)
    auth/             — NextAuth config
components/
  huddles/
    ParticipantMapper.tsx  — Map meeting participants to Klaar users (fuzzy matching)
    ParticipantTimeline.tsx — Timeline of participant join/leave events
    RecordingPlayer.tsx    — Audio/video recording player
    TranscriptViewer.tsx   — Transcript display with utterances
    TranscriptUtterance.tsx — Individual transcript utterance
    ChatMessage.tsx        — AI chat message component
    HuddleCard.tsx         — Huddle list card
    StatusBadge.tsx        — Processing status badge
    SourceCitation.tsx     — Citation for AI-generated content
  ui/                — shadcn/ui components (accordion, button, card, collapsible, command, popover, etc.)
lib/
  auth.ts            — Role enum, auth utilities
  fuzzy-match.ts     — Fuzzy matching algorithm (findBestMatch) for participant name matching
  huddle-types.ts    — TypeScript types (HuddleDetail, ParticipantDetail, AppUser, etc.)
  utils.ts           — cn() and other utilities
```

---

## Key Types (from lib/huddle-types.ts)

```typescript
interface ParticipantDetail {
  id: string
  user_id: string | null      // null = unmapped
  name: string
  email: string | null
  joined_at: string | null
  left_at: string | null
  is_host: boolean
}

interface HuddleDetail {
  id: string
  meeting_platform: 'zoom' | 'google_meet'
  participants: ParticipantDetail[]
  is_creator: boolean
  created_by: string | null
  // ... summary, action_items, key_topics, etc.
}
```

---

## Important Patterns & Decisions

### Auth & Access Control
- Frontend sends `X-User-Role` header to backend via `backend-headers.ts`
- Admin pages at `/admin/huddles` use role checks (TENANT_ADMIN or SUPER_ADMIN)
- Admin huddle detail page re-exports the standard detail page: `export { default } from '@/app/(app)/huddles/[id]/page'`
- The standard detail page checks both `is_creator` and admin roles for features like ParticipantMapper

### ParticipantMapper Component
- Located at `components/huddles/ParticipantMapper.tsx`
- Receives ALL participants (both mapped and unmapped)
- Uses fuzzy matching (`lib/fuzzy-match.ts`) to suggest user mappings
- Features:
  - Entire section is collapsible (chevron on heading) to save page space — open by default
  - "Accept All" button to accept all auto-suggestions at once (shows when 2+ pending suggestions)
  - "Save (N)" button in the header bar next to Accept All for quick access (bottom save button also kept)
  - Individual accept/pick-different for each unmapped participant
  - Collapsible section for already-mapped participants with "Change" button for remapping
  - Saves mappings via `PATCH /api/huddles/{id}/participants/map`
- Parent page shows ParticipantMapper when: user is creator OR admin, platform is zoom/google_meet, and there are participants

### Personal Huddles List
- Shows huddles where user is: participant (by user_id), participant (by email), creator (created_by), or shared

---

## Changes Made (Changelog)

### 2026-03-05: Role Sync to Backend
- **Problem**: Backend now verifies admin roles from its own `users.role` DB column (security fix). When frontend admin UI changes a user's role, the backend DB needs to be updated too.
- **Fix**: Added `syncRoleToBackend()` helper to `app/api/users/route.ts`. Both PATCH (single user edit) and POST (bulk add/upgrade) now fire-and-forget call `PATCH {HUDDLE_API_URL}/api/users/sync-role` with `{ email, role }` after updating the frontend DB.
- File changed: `app/api/users/route.ts`

### 2026-03-04: Admin Page Rename & Platform Filter
- Renamed "All Huddles" to "All Meetings" in NavBar menu and page heading/description
- Added meeting platform filter (Zoom, Google Meet, Slack) as a popover with checkboxes in the filter bar
- Platform filter is client-side, same pattern as participant filter
- Updated empty state messages to say "meetings" instead of "huddles"
- Files changed: `components/NavBar.tsx`, `app/(app)/admin/huddles/page.tsx`

### 2026-03-04: ParticipantMapper UI Improvements (round 2)
- Made entire Map Participants section collapsible (chevron on heading, open by default)
- Added "Save (N)" button in header bar next to "Accept All" for quick access
- Description text hidden when section is collapsed

### 2026-03-04: ParticipantMapper UI Improvements (round 1)
- Added "Accept All" button beside "Map Participants" heading
- Added collapsible accordion for already-mapped participants with remapping capability
- Updated parent page condition from `some(p => !p.user_id)` to `participants.length > 0`
- Files changed: `components/huddles/ParticipantMapper.tsx`, `app/(app)/huddles/[id]/page.tsx`

### 2026-03-04: Admin ParticipantMapper Visibility Fix
- ParticipantMapper was only shown when `huddle.is_creator` was true
- Added `useSession` check for TENANT_ADMIN / SUPER_ADMIN roles
- File changed: `app/(app)/huddles/[id]/page.tsx`

### 2026-03-04: Admin Transcript Access Fix
- Admin couldn't see transcript on huddle detail pages
- Root cause: transcript API route in backend was missing admin role bypass
- Frontend already sends X-User-Role header; backend route needed the check
- Backend fix in `klaar-earl-code` (see backend memory file)

---

## Deployment

- Frontend is deployed separately from backend
- Deployment platform: Vercel (Atri's preferred platform)
- Frontend talks to backend via API proxy routes

---

## Deployment History

- **2026-03-05 (round 2)**: Role sync to backend deployed — `syncRoleToBackend()` in users route, fires on admin role changes via PATCH and POST
- **2026-03-05**: All frontend changes deployed and verified working — ParticipantMapper (collapsible, Accept All, Save button, remap), admin visibility fix, "All Meetings" rename, platform filter

## Known Issues

- TypeScript compilation shows some pre-existing module resolution warnings for `@/components/ui/*` paths — these are not blocking and existed before our changes
