# Frontend Spec: Huddle Transcripts UI

## Context

Build three new pages in the existing Klaar Label app (`/Users/atriroy/klaar-label-app`) for viewing Slack huddle transcripts, participant timelines, and AI-powered chat. The backend already exists in a separate project (`/Users/atriroy/klaar-earl-code`) deployed on Vercel. The frontend will call these APIs over HTTP.

---

## Existing App Patterns (MUST Follow)

The Klaar Label app uses:
- **Next.js 14 App Router** with `'use client'` pages
- **Tailwind CSS** + **shadcn/ui** components (Card, Dialog, Badge, Button, Table, etc.)
- **lucide-react** icons
- **NextAuth.js** (Google OAuth, JWT sessions) — `useSession()` for auth
- **`cn()` utility** from `@/lib/utils` for conditional classNames
- **`useToast()`** from `@/components/ui/use-toast` for notifications

**Layout:** Fixed left NavBar (w-64) + TopNav (h-16). Main content is `pt-16` with `marginLeft: 16rem`. All pages are under `app/(app)/`.

**Data fetching pattern:**
```tsx
'use client'
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await fetch('/api/...')
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

**Loading state:** `<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />`

**Page structure:** `<div className="space-y-6">` wrapping an h1 heading + Card sections.

---

## Backend Connection & Auth

The huddle APIs live on a separate Vercel deployment. The two apps have **different** `NEXTAUTH_SECRET` values, so session cookies can't be shared. Instead, auth uses a **shared API key** with user identity headers.

### Environment Variables (add to `.env.local`)

```bash
HUDDLE_API_URL=https://klaar-earl-code.vercel.app   # Backend URL (server-side only, NOT NEXT_PUBLIC)
HUDDLE_API_KEY=<same value as backend's HUDDLE_API_KEY>  # Shared secret
```

Generate the key once: `openssl rand -base64 32` — set the same value in **both** apps.

### API Proxy Routes

Create proxy API routes in this app that forward requests to the huddle backend. Each proxy route must:

1. Get the NextAuth session server-side (`getServerSession(authOptions)`)
2. Forward the request to the backend URL with these headers:
   - `X-API-Key`: `process.env.HUDDLE_API_KEY`
   - `X-User-Email`: `session.user.email`
   - `X-User-Id`: `session.user.id`
   - `X-User-Name`: `session.user.name`
   - `Content-Type`: forwarded from original request
3. Forward query params (for GET) or request body (for POST)
4. Return the backend's response directly

**Example proxy implementation pattern:**

```typescript
// app/api/huddles/route.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const HUDDLE_API_URL = process.env.HUDDLE_API_URL!
const HUDDLE_API_KEY = process.env.HUDDLE_API_KEY!

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${HUDDLE_API_URL}/api/huddles${searchParams ? `?${searchParams}` : ''}`

  const res = await fetch(url, {
    headers: {
      'X-API-Key': HUDDLE_API_KEY,
      'X-User-Email': session.user.email,
      'X-User-Id': session.user.id || '',
      'X-User-Name': session.user.name || '',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

| Klaar Label Proxy Route | Forwards To (Huddle Backend) |
|---|---|
| `GET /api/huddles` | `GET {HUDDLE_API_URL}/api/huddles` |
| `GET /api/huddles/[id]` | `GET {HUDDLE_API_URL}/api/huddles/[id]` |
| `GET /api/huddles/[id]/transcript` | `GET {HUDDLE_API_URL}/api/huddles/[id]/transcript` |
| `POST /api/huddles/[id]/share` | `POST {HUDDLE_API_URL}/api/huddles/[id]/share` |
| `POST /api/huddles/[id]/unshare` | `POST {HUDDLE_API_URL}/api/huddles/[id]/unshare` |
| `POST /api/huddles/chat` | `POST {HUDDLE_API_URL}/api/chat` |
| `POST /api/huddles/admin/retry/[id]` | `POST {HUDDLE_API_URL}/api/admin/retry/[id]` |

The frontend pages just call `/api/huddles/...` like any other local API. They never see the backend URL or API key.

---

## Navigation Changes

**ALREADY DONE.** `components/NavBar.tsx` has been updated with:
- "Huddles" link (`MessageSquare` icon) → `/huddles` (active when `pathname.startsWith("/huddles") && !pathname.startsWith("/huddles/chat")`)
- "AI Search" link (`Bot` icon) → `/huddles/chat` (active when `pathname === "/huddles/chat"`)

Both appear between "Leaderboard" and the Admin section. No further NavBar changes needed.

---

## Routes to Create

All pages live under `app/(app)/huddles/`:

```
app/(app)/huddles/page.tsx          → Huddle list
app/(app)/huddles/[id]/page.tsx     → Huddle detail
app/(app)/huddles/chat/page.tsx     → AI chat
```

---

## Page 1: Huddle List — `/huddles`

**File:** `app/(app)/huddles/page.tsx`

### API

```
GET /api/huddles?page=1&limit=20&search=...&from=...&to=...&channel=...
```

**Response shape:**
```typescript
{
  huddles: Array<{
    id: string
    slack_channel_name: string | null
    started_at: string | null       // ISO timestamp
    ended_at: string | null         // ISO timestamp
    duration_seconds: number | null
    status: 'recording' | 'transcribing' | 'processing' | 'ready' | 'failed'
    summary_english: string | null
    key_topics: string[]
    action_items: Array<{ text: string; assignee?: string }>
    participant_count: number
    participants: Array<{ name: string; email: string | null }>
    is_shared: boolean
  }>
  total: number
  page: number
  limit: number
}
```

### Layout

1. **Header:** `<h1>` "Huddle Transcripts" with `MessageSquare` icon
2. **Filter bar** (inside a Card or as a sticky row):
   - Search input (searches summary text — maps to `?search=`)
   - Date range: two date inputs for `from` and `to`
   - Channel dropdown (populate from unique `slack_channel_name` values in fetched huddles, or just a text input)
   - Debounce search by 300ms before calling API
3. **Huddle cards** — each huddle renders as a Card:

```
┌─────────────────────────────────────────────────────────┐
│ #product-standup                        Feb 7, 2026     │
│                                         11:00–11:30 AM  │
│                                         (30 min)        │
│                                                         │
│ 👤 Atri Roy, Shruti, Rahul (+2 more)                    │
│                                                         │
│ Discussed the new goals module design and decided to    │
│ move forward with the single-input approach...          │
│                                                         │
│ Topics: goals · OKRs · AI features                      │
│                                                         │
│ ✅ Ready                          🔗 Shared             │
└─────────────────────────────────────────────────────────┘
```

**Card fields:**
- **Channel name** (`slack_channel_name`) — bold, top-left. Show "Unknown Channel" if null.
- **Date/time** — format `started_at` and `ended_at` into readable date and time. Use `duration_seconds` to show "(X min)".
- **Participants** — show first 3 names, then "+N more" if `participant_count > 3`.
- **Summary** — `summary_english` truncated to 2 lines with CSS `line-clamp-2`. Null → "Processing..."
- **Topics** — render `key_topics` as `<Badge variant="secondary">` tags.
- **Status badge** — use `<Badge>`:
  - `ready` → green Badge "Ready"
  - `recording` → red Badge with pulse animation "Recording"
  - `transcribing` → yellow Badge "Transcribing"
  - `processing` → yellow Badge "Processing"
  - `failed` → destructive Badge "Failed"
- **Shared indicator** — small text or icon if `is_shared === true`
- **Click** → navigate to `/huddles/[id]`

4. **Pagination:** Simple "Previous / Page X of Y / Next" buttons at the bottom. Calculate total pages from `total` and `limit`.

5. **Empty state:** "No huddle recordings yet. Huddles will appear here once recorded."

6. **Loading state:** Show 3–4 skeleton cards (div with `animate-pulse bg-muted rounded`).

7. **Polling for in-progress huddles:** If any huddle has status `recording`, `transcribing`, or `processing`, poll the list API every 15 seconds until all are `ready` or `failed`.

---

## Page 2: Huddle Detail — `/huddles/[id]`

**File:** `app/(app)/huddles/[id]/page.tsx`

### APIs

```
GET  /api/huddles/[id]                    → huddle details + participants
GET  /api/huddles/[id]/transcript?format=both  → full transcript
POST /api/huddles/[id]/share              → share huddle
POST /api/huddles/[id]/unshare            → unshare huddle
POST /api/huddles/admin/retry/[id]        → retry failed processing
```

**Huddle detail response:**
```typescript
{
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: 'recording' | 'transcribing' | 'processing' | 'ready' | 'failed'
  summary_english: string | null
  action_items: Array<{ text: string; assignee?: string }>
  key_topics: string[]
  is_shared: boolean
  shared_by: string | null    // user UUID
  participants: Array<{
    name: string
    email: string | null
    joined_at: string | null
    left_at: string | null
    is_host: boolean
  }>
}
```

**Transcript response:**
```typescript
{
  huddle_id: string
  utterances: Array<{
    id: string
    speaker_name: string
    speaker_email: string | null
    text_original: string
    text_english: string | null
    start_time_seconds: number
    end_time_seconds: number
    sequence_number: number
  }>
}
```

### Layout

Fetch huddle detail and transcript in parallel on mount. Display sections vertically:

#### Section 1: Header

- Back button → `router.push('/huddles')` — use `ArrowLeft` icon
- Channel name as `<h1>`
- Date and time range + duration
- Status badge (same as list page)
- **Share button:**
  - If `!is_shared`: `<Button variant="outline">` "Share with Everyone". On click → show a `<Dialog>` confirmation: "This will make the huddle transcript visible to all users in your organization. Continue?" → call `POST /api/huddles/[id]/share` → toast success → refetch huddle
  - If `is_shared`: Show "Shared ✓" text. If current user is the sharer or a host participant → show "Unshare" button → confirmation dialog → call `POST /api/huddles/[id]/unshare`
- **Retry button** (only show if `status === 'failed'`): `<Button variant="destructive">` "Retry Processing" → call `POST /api/huddles/admin/retry/[id]` → toast → refetch

#### Section 2: AI Summary (Card)

Only show if `status === 'ready'`.

- `<Card>` with `<CardHeader>`: title "Summary" with `FileText` icon
- `<CardContent>`: render `summary_english` as plain text (or simple markdown with `<MarkdownPreview>` if available, otherwise just `<p>` with `whitespace-pre-wrap`)
- **Action Items** sub-section:
  - Heading: "Action Items" with `CheckCircle` icon
  - Render each action item as a bullet: `• {assignee}: {text}` (or just `• {text}` if no assignee)
  - If no action items, don't show this sub-section
- **Topics** sub-section:
  - Render `key_topics` as `<Badge variant="secondary">` inline

#### Section 3: Participants Timeline (Card)

- `<Card>` with title "Participants ({count})" and `Users` icon
- **Timeline visualization:** A horizontal bar chart showing each participant's presence during the huddle.
  - The huddle spans from `started_at` to `ended_at` — this is the full width.
  - Each participant gets a row with:
    - Name (and "Host" badge if `is_host`)
    - Email in smaller muted text
    - A horizontal bar showing their `joined_at` to `left_at` as a filled segment
  - Calculate position: `left% = (joined_at - huddle_start) / huddle_duration * 100`, `width% = (left_at - joined_at) / huddle_duration * 100`
  - Use Tailwind `bg-primary` for the filled bar, `bg-muted` for the background track
  - Show time labels at the start and end of the timeline (e.g., "11:00 AM" ... "11:30 AM")
  - **Tooltip on hover** (use `title` attribute or shadcn Tooltip): "Joined 11:00:05 · Left 11:28:45"

#### Section 4: Transcript (Card)

Only show if `status === 'ready'` and utterances exist.

- `<Card>` with title "Transcript" and `MessageSquare` icon
- **Language toggle** — three buttons (toggle group or tabs):
  - "Original" — show `text_original`
  - "English" — show `text_english`
  - "Side by Side" — two columns
  - Default to "English". Store in `useState`.
- **Search within transcript:**
  - Text input at top: "Search transcript..."
  - Client-side filter: highlight matching text in utterances using `<mark>` tags
  - Show match count: "X matches found"
- **Utterance list:**
  - Each utterance renders as a row:
    ```
    0:32  Atri Roy
    अरे मैं ऐसे ही सोचा तुम laptop पर नहीं होगी...
    ```
  - **Timestamp:** Format `start_time_seconds` as `m:ss` (e.g., 32 seconds → "0:32", 125 seconds → "2:05")
  - **Speaker name:** Bold text. Assign a consistent color per unique speaker. Use a predefined palette of 6-8 Tailwind colors (`text-blue-600`, `text-emerald-600`, `text-violet-600`, `text-orange-600`, `text-pink-600`, `text-teal-600`, etc.) and assign by index of unique speakers.
  - **Speaker initial avatar:** A small circle with the first letter of the speaker's name, background matching their color.
  - **Text:** Show `text_original`, `text_english`, or both side-by-side depending on toggle.
  - **Side-by-side mode:** Use a 2-column grid: `grid grid-cols-2 gap-4`. Left column = original, right column = English.
- **Performance:** If there are >100 utterances, consider CSS `max-h-[600px] overflow-y-auto` on the utterance container rather than full virtual scroll (keep it simple).

#### If huddle is not ready:

Show a message based on status:
- `recording`: "This huddle is still being recorded..."
- `transcribing`: "Transcript is being generated. This usually takes 1-2 minutes."
- `processing`: "AI is analyzing the transcript..."
- `failed`: "Processing failed. {status_detail}" + Retry button

Poll every 10 seconds if status is not `ready` or `failed`.

---

## Page 3: AI Chat — `/huddles/chat`

**File:** `app/(app)/huddles/chat/page.tsx`

### API

```
POST /api/huddles/chat
```

**Request:**
```typescript
{
  message: string
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
}
```

**Response:**
```typescript
{
  response: string
  sources: Array<{
    huddle_id: string
    channel_name: string | null
    date: string              // e.g., "2026-02-07"
    start_time_seconds: number
    end_time_seconds: number
    text_snippet: string      // first 200 chars of matching chunk
  }>
}
```

### Layout

Full-height chat interface. Override the default page padding — this page should fill the available viewport height.

```tsx
<div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
  {/* Messages area - scrollable */}
  <div className="flex-1 overflow-y-auto p-6 space-y-4">
    ...messages...
  </div>
  {/* Input bar - fixed at bottom */}
  <div className="border-t p-4">
    ...input...
  </div>
</div>
```

#### Header

- Title: "Huddle Knowledge Base" with `Bot` icon
- "Clear Chat" button (top-right) — resets messages to empty

#### Message Area

State:
```typescript
const [messages, setMessages] = useState<Array<{
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}>>([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
```

**Welcome state** (when `messages.length === 0`):
- Centered welcome text: "Ask me anything about your past huddles. I can search across all transcripts you have access to."
- 3 suggested questions as clickable `<Button variant="outline">`:
  - "What did we decide about the goals module?"
  - "Summarize all discussions from last week"
  - "What action items came out of recent huddles?"
- Clicking a suggestion sets it as input and submits

**User messages:** Right-aligned bubble with `bg-primary text-primary-foreground rounded-lg p-3`

**Assistant messages:** Left-aligned with `bg-muted rounded-lg p-3`. Render the `content` as markdown (use `<MarkdownPreview>` if the component exists, or render with `whitespace-pre-wrap` and basic formatting).

**Source citations** (shown below each assistant message that has sources):
- For each source, render a small clickable card:
  ```
  📎 #product-standup · Feb 7, 2026 · 0:32–0:55
  "अरे मैं ऐसे ही सोचा तुम laptop पर..."
  [View Transcript →]
  ```
- Use `<Card className="p-3 cursor-pointer hover:bg-accent">` for each source
- Format `start_time_seconds` and `end_time_seconds` as `m:ss`
- "View Transcript" link → `router.push('/huddles/{huddle_id}')`
- Truncate `text_snippet` to ~100 chars

**Loading state:** Show a typing indicator (three animated dots or `<Loader2>` spinner) below the last message while waiting for response.

#### Input Bar

- `<div className="flex gap-2">`
  - `<Input>` (or `<Textarea rows={1}>`) with placeholder "Ask about your huddles..."
  - `<Button>` with `Send` icon (from lucide-react)
- Submit on Enter key (not Shift+Enter). Shift+Enter = newline.
- Disable send while `loading === true`

#### Submit Flow

```typescript
const handleSend = async () => {
  if (!input.trim() || loading) return

  const userMessage = { role: 'user', content: input.trim() }
  setMessages(prev => [...prev, userMessage])
  setInput('')
  setLoading(true)

  try {
    // Build conversation_history from previous messages (last 10 exchanges = 20 messages)
    const history = messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }))

    const res = await fetch('/api/huddles/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input.trim(),
        conversation_history: history
      })
    })

    if (!res.ok) throw new Error('Chat failed')
    const data = await res.json()

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.response,
      sources: data.sources
    }])
  } catch {
    toast({ title: 'Failed to get response', variant: 'destructive' })
  } finally {
    setLoading(false)
  }
}
```

Auto-scroll to bottom of message area after each new message using `useRef` + `scrollIntoView`.

---

## Components to Create

Create these in `/Users/atriroy/klaar-label-app/components/huddles/`:

| Component | Purpose |
|---|---|
| `HuddleCard.tsx` | Single huddle card for the list view |
| `StatusBadge.tsx` | Reusable status badge (ready/recording/transcribing/processing/failed) |
| `ParticipantTimeline.tsx` | Horizontal timeline visualization for participants |
| `TranscriptViewer.tsx` | Full transcript viewer with language toggle + search |
| `TranscriptUtterance.tsx` | Single utterance row with speaker color + timestamp |
| `ChatMessage.tsx` | Single chat message bubble (user or assistant) |
| `SourceCitation.tsx` | Single source reference card below chat responses |

---

## TypeScript Interfaces

Create in `/Users/atriroy/klaar-label-app/lib/huddle-types.ts`:

```typescript
export type HuddleStatus = 'recording' | 'transcribing' | 'processing' | 'ready' | 'failed'

export interface HuddleListItem {
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: HuddleStatus
  summary_english: string | null
  key_topics: string[]
  action_items: ActionItem[]
  participant_count: number
  participants: ParticipantSummary[]
  is_shared: boolean
}

export interface HuddleDetail {
  id: string
  slack_channel_name: string | null
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  status: HuddleStatus
  summary_english: string | null
  action_items: ActionItem[]
  key_topics: string[]
  is_shared: boolean
  shared_by: string | null
  participants: ParticipantDetail[]
}

export interface ActionItem {
  text: string
  assignee?: string
}

export interface ParticipantSummary {
  name: string
  email: string | null
}

export interface ParticipantDetail {
  name: string
  email: string | null
  joined_at: string | null
  left_at: string | null
  is_host: boolean
}

export interface TranscriptUtterance {
  id: string
  speaker_name: string
  speaker_email: string | null
  text_original: string
  text_english: string | null
  start_time_seconds: number
  end_time_seconds: number
  sequence_number: number
}

export interface ChatSource {
  huddle_id: string
  channel_name: string | null
  date: string
  start_time_seconds: number
  end_time_seconds: number
  text_snippet: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
}

export interface HuddleListResponse {
  huddles: HuddleListItem[]
  total: number
  page: number
  limit: number
}

export interface TranscriptResponse {
  huddle_id: string
  utterances: TranscriptUtterance[]
}

export interface ChatResponse {
  response: string
  sources: ChatSource[]
}
```

---

## Utility Helpers

Create in `/Users/atriroy/klaar-label-app/lib/huddle-utils.ts`:

```typescript
/** Format seconds as m:ss (e.g., 125 → "2:05") */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format duration in seconds as human readable (e.g., 1800 → "30 min") */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

/** Consistent speaker color from a palette */
const SPEAKER_COLORS = [
  'text-blue-600 bg-blue-100',
  'text-emerald-600 bg-emerald-100',
  'text-violet-600 bg-violet-100',
  'text-orange-600 bg-orange-100',
  'text-pink-600 bg-pink-100',
  'text-teal-600 bg-teal-100',
  'text-red-600 bg-red-100',
  'text-indigo-600 bg-indigo-100',
]

export function getSpeakerColor(speakerIndex: number): string {
  return SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]
}
```

---

## Files to Create (Summary)

```
app/(app)/huddles/page.tsx                    ← Huddle list
app/(app)/huddles/[id]/page.tsx               ← Huddle detail
app/(app)/huddles/chat/page.tsx               ← AI chat
app/api/huddles/route.ts                      ← Proxy: list huddles
app/api/huddles/[id]/route.ts                 ← Proxy: huddle detail
app/api/huddles/[id]/transcript/route.ts      ← Proxy: transcript
app/api/huddles/[id]/share/route.ts           ← Proxy: share
app/api/huddles/[id]/unshare/route.ts         ← Proxy: unshare
app/api/huddles/chat/route.ts                 ← Proxy: AI chat
app/api/huddles/admin/retry/[id]/route.ts     ← Proxy: retry
components/huddles/HuddleCard.tsx             ← Huddle card
components/huddles/StatusBadge.tsx             ← Status badge
components/huddles/ParticipantTimeline.tsx     ← Timeline viz
components/huddles/TranscriptViewer.tsx        ← Transcript viewer
components/huddles/TranscriptUtterance.tsx     ← Single utterance
components/huddles/ChatMessage.tsx             ← Chat message bubble
components/huddles/SourceCitation.tsx          ← Source card
lib/huddle-types.ts                           ← TypeScript interfaces
lib/huddle-utils.ts                           ← Helper functions
```

## Files Already Modified (no action needed)

```
components/NavBar.tsx                         ← Huddles + AI Search nav items already added
```

---

## Verification

After building, verify:

1. `/huddles` loads and shows huddle cards with real data from the backend
2. Search, date filter, and pagination work
3. Clicking a card navigates to `/huddles/[id]`
4. Huddle detail shows summary, action items, topics, participant timeline, and full transcript
5. Language toggle (Original/English/Side by Side) switches transcript text correctly
6. Transcript search highlights matching text
7. Share/unshare works with confirmation dialog
8. `/huddles/chat` shows welcome state with suggested questions
9. Sending a message returns an AI response with source citations
10. Source citation links navigate to the correct huddle
11. NavBar shows "Huddles" and "AI Search" items with correct active states
12. In-progress huddles show correct status and auto-refresh when done
