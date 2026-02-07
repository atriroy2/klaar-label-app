# Huddle Backend: API Key Auth (for Klaar Label proxy)

The Klaar Label app proxies all huddle requests to your backend. When using a shared API key, it sends **headers** instead of relying on the forwarded session cookie. Your backend should accept these headers so the two apps don’t need to share `NEXTAUTH_SECRET`.

---

## 1. What the proxy sends (when `HUDDLE_API_KEY` is set)

On every request to your backend, the Klaar Label proxy sends:

| Header        | Description                          | Example / notes                    |
|---------------|--------------------------------------|------------------------------------|
| `X-API-Key`   | Shared secret (same as `HUDDLE_API_KEY`). | e.g. `a1b2c3...` (opaque string).  |
| `X-User-Email`| Signed-in user’s email in Klaar Label.| e.g. `user@example.com`.           |
| `X-User-Id`   | User’s ID in Klaar Label.            | UUID string.                       |
| `X-User-Name` | User’s display name.                | Optional.                          |
| `Cookie`      | Still forwarded (for optional cookie auth). | Can be ignored when using API key. |

The proxy only adds `X-API-Key` and `X-User-*` when **Klaar Label** has `HUDDLE_API_KEY` set in its env. So your backend can support **either**:

- API key auth (recommended), or  
- Cookie/session auth (e.g. same `NEXTAUTH_SECRET`), or  
- Both (try API key first, then cookie).

---

## 2. What the backend must do

### 2.1 Environment variable

- Add to the **backend** env (e.g. Vercel or `.env`):
  - **Name:** `HUDDLE_API_KEY`
  - **Value:** same secret as in Klaar Label’s `HUDDLE_API_KEY` (e.g. generate once with `openssl rand -base64 32` and set in **both** apps).

### 2.2 Auth logic (middleware or `requireAuth`)

Before handling any huddle API route:

1. **If `X-API-Key` is present and non-empty:**
   - Trim both the header and the env value (`.trim()`) before comparing — `.env` often has trailing newlines.
   - Compare `request.headers.get('X-API-Key')?.trim()` to `process.env.HUDDLE_API_KEY?.trim()` (constant-time if possible, e.g. `crypto.timingSafeEqual`).
   - If it **matches:**
     - Treat the request as **authenticated**.
     - Resolve the “current user” from:
       - **Primary:** `X-User-Email` (required for identity).
       - Optional: `X-User-Id`, `X-User-Name` for display or DB lookups.
     - Skip cookie/session verification for this request and continue.
   - If it **does not match:** respond with `401 Unauthorized` (invalid key).

2. **If `X-API-Key` is missing or empty:**
   - Use your existing auth (e.g. cookie/session) if you have it, or respond `401 Unauthorized`.

So: **API key present and valid → trust `X-User-Email` (and optional headers) and allow the request.** No need to verify a NextAuth cookie.

### 2.3 Routes to protect

Apply this auth to all huddle API routes the proxy calls:

- `GET /api/huddles` (list)
- `GET /api/huddles/[id]` (detail)
- `GET /api/huddles/[id]/transcript`
- `POST /api/huddles/[id]/share`
- `POST /api/huddles/[id]/unshare`
- `POST /api/chat`
- `POST /api/admin/retry/[id]`

Use the same “current user” (from `X-User-Email` or `X-User-Id`) for tenant scoping, permissions, and audit as you would with a session.

---

## 3. Example (pseudo-code)

```ts
// Middleware or requireAuth helper
function getAuthUser(req: Request): { email: string; id?: string; name?: string } | null {
  const apiKey = req.headers.get('X-API-Key')
  const expectedKey = process.env.HUDDLE_API_KEY

  if (apiKey && expectedKey && apiKey === expectedKey) {
    const email = req.headers.get('X-User-Email')
    if (!email) return null
    return {
      email,
      id: req.headers.get('X-User-Id') ?? undefined,
      name: req.headers.get('X-User-Name') ?? undefined,
    }
  }

  // Optional: fallback to cookie/session if no API key
  // const session = await getSession(req)
  // return session?.user ?? null
  return null
}

// In each route:
const user = getAuthUser(request)
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
// Proceed with user.email, user.id, etc.
```

Use a constant-time comparison in production (e.g. `crypto.timingSafeEqual(Buffer.from(apiKey, 'utf8'), Buffer.from(expectedKey, 'utf8'))`) when comparing `apiKey` and `expectedKey`.

---

## 4. Klaar Label (frontend) setup

In the Klaar Label app (this repo), set in `.env` or `.env.local`:

```bash
HUDDLE_API_KEY="same_value_as_backend"
```

Generate a single secret and set it in **both** the backend and Klaar Label. Restart the Klaar Label dev server after adding the variable.

---

## 5. Summary

- **Backend:** Add `HUDDLE_API_KEY`; for each huddle API route, if `X-API-Key` matches that value, treat the request as authenticated and use `X-User-Email` (and optionally `X-User-Id`, `X-User-Name`) as the current user; otherwise 401.
- **Klaar Label:** Already sends `X-API-Key` and `X-User-*` when `HUDDLE_API_KEY` is set; no further code changes needed.
- **Result:** No shared `NEXTAUTH_SECRET`; auth is via a single shared secret and trusted user headers from the proxy.
