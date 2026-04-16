# Cluely for HR Coaching Engine API Routes

All 6 API routes have been created for the Next.js 14 App Router. These are localhost-only demo endpoints without authentication.

## Files Created

### 1. `/app/api/coaching/detect/route.ts`
**Tier 1 Detection Endpoint**
- Method: POST
- Purpose: Analyze transcript segments for coaching triggers
- Uses: Gemini Flash (gemini-2.0-flash)
- Request:
  ```json
  {
    "segment": "string",
    "rollingSummary": "string",
    "employeeContext": {
      "name": "string",
      "role": "string",
      "okrs": ["string"],
      "recentFeedback": "string"
    }
  }
  ```
- Response:
  ```json
  {
    "flags": ["TRIGGER_NAME"],
    "evidence": { "TRIGGER_NAME": "quote or reference" },
    "rollingSummary": "updated summary"
  }
  ```
- Detects 8 triggers: VAGUE_FEEDBACK, MANAGER_DOMINATING, NO_ACTION_ITEMS, CLOSED_QUESTIONS_ONLY, JUMPING_TO_SOLUTIONS, NO_FOLLOW_UP, MISSED_GOAL_REFERENCE, ALL_CRITICISM_NO_RECOGNITION

### 2. `/app/api/coaching/suggest/route.ts`
**Tier 2 Suggestion Endpoint**
- Method: POST
- Purpose: Generate coaching suggestions for detected triggers
- Uses: Gemini Flash (gemini-2.0-flash)
- Request:
  ```json
  {
    "flag": "string",
    "evidence": "string",
    "employeeContext": {
      "name": "string",
      "role": "string",
      "managerName": "string",
      "okrs": ["string"],
      "recentFeedback": "string"
    },
    "recentSegment": "string"
  }
  ```
- Response:
  ```json
  {
    "suggestion": "actionable coaching tip",
    "framework": "SBI|COACHING_HABIT|RADICAL_CANDOR|GROW|DESC",
    "priority": "high|medium|low"
  }
  ```
- Uses 5 coaching frameworks (SBI, COACHING_HABIT, RADICAL_CANDOR, GROW, DESC)

### 3. `/app/api/coaching/summary/route.ts`
**Tier 3 End-of-Meeting Summary**
- Method: POST
- Purpose: Generate comprehensive meeting summary with dual scorecards
- Uses: Gemini Pro (gemini-2.5-pro) for higher quality
- Request:
  ```json
  {
    "fullTranscript": "string",
    "allSuggestions": [
      {
        "trigger": "string",
        "framework": "string",
        "suggestion": "string"
      }
    ],
    "employeeContext": {
      "name": "string",
      "role": "string",
      "managerName": "string",
      "okrs": ["string"],
      "recentFeedback": "string"
    }
  }
  ```
- Response: Full `MeetingSummary` object with:
  - bullets: key discussion points
  - actionItems: with owner, action, deadline
  - managerScorecard: 5 dimensions (0-10 each)
  - employeeScorecard: 4 dimensions (0-10 each)
  - triggersDetected: with count and trend
  - frameworksUsed: list of frameworks

### 4. `/app/api/coaching/tts/route.ts`
**ElevenLabs Text-to-Speech Proxy**
- Method: POST
- Purpose: Convert text to speech for transcript replay
- Uses: ElevenLabs API via environment variable ELEVENLABS_API_KEY
- Request:
  ```json
  {
    "text": "string",
    "voice": "male|female"
  }
  ```
- Response: audio/mpeg stream (MP3 audio file)
- Voice mapping:
  - male: Adam (pNInz6obpgDQGcFmaJgB)
  - female: Rachel (21m00Tcm4TlvDq8ikWAM)
- Returns 400 if ELEVENLABS_API_KEY not configured

### 5. `/app/api/coaching/transcripts/route.ts`
**Transcript List Endpoint**
- Method: GET
- Purpose: List all available sample transcripts
- Uses: Filesystem access to Cluely for HR transcripts folder
- Response:
  ```json
  {
    "transcripts": [
      {
        "pairId": 5,
        "folder": "05-kavita-vikram",
        "manager": "Kavita Reddy",
        "report": "Vikram Desai",
        "type": "direct",
        "months": ["apr-2026", "mar-2026", "feb-2026", "jan-2026"]
      }
    ]
  }
  ```
- Reads from: `process.env.TRANSCRIPTS_PATH` or `../Cluely for HR/transcripts`
- Includes 4 meeting pairs (Pairs 5-8) with 4 months each

### 6. `/app/api/coaching/transcripts/[folder]/[month]/route.ts`
**Dynamic Transcript Reader**
- Method: GET
- Purpose: Fetch and parse a specific transcript file
- Parameters: folder (e.g., "05-kavita-vikram"), month (e.g., "jan-2026")
- Response: `TranscriptMeeting` with parsed lines
  ```json
  {
    "pairId": 5,
    "date": "2026-01-15",
    "month": "January 2026",
    "triggersPresent": ["MANAGER_DOMINATING", "NO_ACTION_ITEMS"],
    "triggerMoments": "description of trigger timing",
    "lines": [
      {
        "speaker": "Kavita",
        "text": "discussion content",
        "triggerBefore": "TRIGGER_NAME"
      }
    ]
  }
  ```
- Security: Path traversal protection via normalized path validation
- Parses YAML frontmatter and transcript lines from markdown

## Configuration

### Environment Variables Required
- `GEMINI_API_KEY`: For Tier 1, 2, 3 LLM calls
- `ELEVENLABS_API_KEY`: For TTS endpoint (optional, returns 400 if missing)
- `TRANSCRIPTS_PATH`: Optional override for transcripts folder location

### Transcript Directory Structure
Transcripts are read from: `../Cluely for HR/transcripts/`

```
transcripts/
├── 05-kavita-vikram/
│   ├── jan-2026.md
│   ├── feb-2026.md
│   ├── mar-2026.md
│   └── apr-2026.md
├── 06-kavita-deepa/
├── 07-kavita-rohan/
└── 08-kavita-priya-skip/
```

## Error Handling
- All endpoints return 400 for invalid input
- All endpoints return 500 for server errors with descriptive messages
- Tier 1 & 2 have fallback JSON responses if parsing fails
- Tier 3 has default MeetingSummary fallback (all scorecards at 5/10)
- TTS returns 400 if API key not configured

## Prompt System
Prompts are imported from `@/lib/coaching/prompts.ts`:
- `TIER_1_SYSTEM_PROMPT` & `TIER_1_USER_PROMPT_TEMPLATE`: Detection
- `TIER_2_SYSTEM_PROMPT` & `TIER_2_USER_PROMPT_TEMPLATE`: Suggestion
- `TIER_3_SYSTEM_PROMPT` & `TIER_3_USER_PROMPT_TEMPLATE`: Summary

All prompts return JSON format. System prompts define trigger types and scoring rubrics.

## Testing
All endpoints are fully functional for localhost testing. No authentication required for POC.

Example curl commands:

```bash
# Test Tier 1 Detection
curl -X POST http://localhost:3000/api/coaching/detect \
  -H "Content-Type: application/json" \
  -d '{
    "segment": "Manager: Tell me about the project status.",
    "rollingSummary": "Initial context",
    "employeeContext": {
      "name": "Vikram",
      "role": "EM Backend",
      "okrs": ["Scale platform to 1M users"],
      "recentFeedback": "Strong technical lead"
    }
  }'

# Test Transcript List
curl http://localhost:3000/api/coaching/transcripts

# Test Transcript Reader
curl http://localhost:3000/api/coaching/transcripts/05-kavita-vikram/jan-2026
```
