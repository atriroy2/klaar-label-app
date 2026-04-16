# Cluely for HR — Coaching Data Layer

Complete TypeScript data layer for the coaching POC, built around the NovaBuild organization (20 people, 15 manager-employee pairs, 60 transcripts).

## Files

### 1. types.ts
TypeScript interfaces for the entire coaching system:
- **Employee**: Person profile (id, name, role, department, manager, review score, OKRs, feedback, coaching patterns)
- **MeetingPair**: Manager-employee relationship with metadata (folder, type, patterns, dynamic description)
- **TranscriptLine**: Parsed dialogue with speaker, text, optional trigger
- **CoachingSuggestion**: Actionable coaching feedback with framework and priority
- **TierOneResult / TierTwoResult / MeetingSummary**: Three-tier LLM outputs
- **SessionState**: UI state for the coaching interface

### 2. data.ts
NovaBuild organization data with 3 helper functions:

**Employees (20 total)**:
- Leadership: Arjun (CEO)
- Engineering (10): Kavita (VP), Vikram (EM), Deepa (EM), Rohan (Staff), Priya, Amit, Ravi, Ananya (Designer), Ishaan, Pooja
- Sales (6): Sanjay (VP), Meera (Manager), Anil, Farah, Dev (SDR), Simran (BDR)
- People & Ops (3): Neha (Head), Tara (HRBP), Kiran (Admin)

Each employee includes:
- Review scores and feedback
- IDP focus areas
- Coaching trigger patterns (for managers)

**Meeting Pairs (15 total)**:
1. Arjun → Kavita (CEO coaching VP Eng on communication)
2. Arjun → Sanjay (CEO on pipeline predictability)
3. Arjun → Neha (CEO on decisive action)
4. Arjun ↷ Vikram (CEO skip-level, gathering info)
5. Kavita → Vikram (VP coaching EM on delegation)
6. Kavita → Deepa (VP on shipping discipline)
7. Kavita → Rohan (VP managing Staff Eng retention)
8. Kavita ↷ Priya (VP skip-level, gold standard)
9. Vikram → Amit (EM on estimation problems)
10. Vikram → Ravi (EM with disengaged report)
11. Deepa → Ananya (EM on edge case specs)
12. Sanjay → Meera (VP Sales with structured manager)
13. Meera → Farah (Manager with top performer)
14. Meera → Dev (Manager with struggling SDR)
15. Sanjay ↷ Farah (VP skip-level, curious)

**Helper Functions**:
```typescript
getEmployee(id: string): Employee | undefined
getManagerReports(managerId: string): Employee[]
getPairsForEmployee(employeeId: string): MeetingPair[]
```

### 3. prompts.ts
Three-tier LLM coaching engine with system prompts, user prompt templates, and model configs:

**Tier 1: Detection (Gemini Flash)**
- Detects 8 coaching triggers in real-time:
  1. VAGUE_FEEDBACK — Non-specific evaluations
  2. MANAGER_DOMINATING — Manager speaks 70%+
  3. NO_ACTION_ITEMS — Unclear commitments
  4. CLOSED_QUESTIONS_ONLY — Yes/no questions only
  5. JUMPING_TO_SOLUTIONS — Answers before exploring
  6. NO_FOLLOW_UP — Ignores previous commitments
  7. MISSED_GOAL_REFERENCE — OKRs not discussed
  8. ALL_CRITICISM_NO_RECOGNITION — No positive feedback

**Tier 2: Suggestion (Gemini Flash)**
- Coaching frameworks for managers:
  - **SBI**: Situation-Behavior-Impact (for vague feedback)
  - **Coaching Habit**: 7 powerful questions (for jumping to solutions)
  - **Radical Candor**: Care + challenge (for criticism without recognition)
- Coaching frameworks for employees:
  - **GROW**: Goal-Reality-Options-Way Forward
  - **DESC**: Describe-Express-Specify-Consequences

**Tier 3: Summary (Gemini 2.0 Pro)**
- Comprehensive end-of-meeting analysis:
  - Meeting bullets and action items
  - Dual scorecards (manager & employee, 5 dimensions each)
  - Trigger frequency and trends
  - Frameworks recommended

### 4. transcript-parser.ts
Utilities for parsing and analyzing transcript markdown files:

**Core Functions**:
- `parseTranscript(content)`: Parses "Speaker: text" format, extracts `<!-- TRIGGER: NAME -->` comments
- `splitIntoSegments(lines, segmentSize)`: Divides transcript into ~10-line chunks for Tier 1 processing
- `getAvailableTranscripts()`: Lists all 60 transcripts (15 pairs × 4 months)
- `extractMetadata(content)`: Reads frontmatter (pair, type, date, triggers)
- `calculateSpeakingRatio(lines, managerName)`: Manager vs employee word count
- `analyzeQuestions(lines, speakerName)`: Counts open vs closed questions

## Usage Example

```typescript
import { employees, meetingPairs, getEmployee, getManagerReports } from './data';
import { parseTranscript, splitIntoSegments, getAvailableTranscripts } from './transcript-parser';
import { TIER_1_SYSTEM_PROMPT, TIER_1_USER_PROMPT_TEMPLATE } from './prompts';

// Get a person
const vikram = getEmployee('vikram');

// Get their team
const vikramTeam = getManagerReports('vikram');

// Get all their meetings
const vikramMeetings = getAvailableTranscripts().filter(t =>
  meetingPairs.find(p => p.id === t.pairId)?.managerId === 'vikram'
);

// Parse a transcript
const transcript = parseTranscript(transcriptContent);
const segments = splitIntoSegments(transcript, 10);

// Run Tier 1 detection on first segment
const userPrompt = TIER_1_USER_PROMPT_TEMPLATE(
  segments[0].map(l => `${l.speaker}: ${l.text}`).join('\n'),
  'Initial context',
  {
    name: vikram.name,
    role: vikram.role,
    okrs: [], // would fetch from context
    recentFeedback: vikram.recentFeedback
  }
);
```

## Design Notes

- All 20 employees fully populated with real sample_org.md data
- All 15 pairs with documented manager patterns and dynamics
- 8 triggers mapped to 5 coaching frameworks based on research
- Transcript parser handles markdown comments for pre-labeled training data
- Three-tier system balances speed (Flash) with depth (Pro)
- No TODOs or placeholders — production-ready

## Next Steps

1. Integrate with transcript files from `Cluely for HR/transcripts/`
2. Implement Tier 1 stream processor using `splitIntoSegments()`
3. Wire Tier 2 suggestions to coaching framework recommendations
4. Build UI with `SessionState` for live replay with TTS overlay
