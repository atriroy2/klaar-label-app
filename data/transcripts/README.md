# 1:1 Meeting Transcripts — NovaBuild Technologies Demo

16 realistic meeting transcripts across 4 manager-report pairs over Q1 2026 (Jan-Apr), with embedded coaching triggers for AI detection training.

## Company Context
- NovaBuild Technologies: B2B SaaS project management tool
- Series B, $12M ARR, Bangalore
- Q1 2026: SSO shipped 3 weeks late, Dashboard redesign in beta, Incidents 8→6/mo (target 4), Migration 30% (target 50%), Sprint completion 79% (target 86%)

---

## Pair 5: Vikram Desai (EM Backend) ← Kavita Reddy (VP Eng)

**Pattern**: Hero engineer learning to delegate and grow a team. Kavita coaches on changing the bottleneck dynamic.

- **Jan** (`jan-2026.md`): Q1 target-setting. Kavita emphasizes team growth angle. Minimal triggers.
- **Feb** (`feb-2026.md`): SSO delay incident debrief. VAGUE_FEEDBACK: "create a culture where people feel safe asking for help." Vikram admits 70% of incidents are his.
- **Mar** (`mar-2026.md`): Q1 review. VAGUE_FEEDBACK: "let your team fail safely" (self-corrected with concrete example). Vikram faces the delegation pattern directly.
- **Apr** (`apr-2026.md`): Q2 planning. Strong coaching, minimal triggers. Priya handling P2s independently, Amit presenting his own work.

**Character Notes**: Vikram is a good engineer becoming a reluctant manager. He wants to help but can't let go.

---

## Pair 6: Deepa Nair (EM Frontend) ← Kavita Reddy (VP Eng)

**Pattern**: Perfectionist designer learning shipping discipline. Kavita coaches on timeline commitment and design freeze governance.

- **Jan** (`jan-2026.md`): Dashboard redesign kickoff. NO_ACTION_ITEMS: "we'll aim for mid-Feb" — loose commitments. Kavita gently pins down dates.
- **Feb** (`feb-2026.md`): On track. NO_ACTION_ITEMS: bundle size audit doesn't have firm date. Good energy, but vague closure.
- **Mar** (`mar-2026.md`): Critical meeting. Late design change (chart axis labels) cost a day. NO_ACTION_ITEMS: they agree "it won't happen again" but no mechanism. Deepa is defensive then candid.
- **Apr** (`apr-2026.md`): Q2 planning. Design freeze rule introduced with pre-freeze review. Clear commitments, strong action items. Shows the arc of improvement.

**Character Notes**: Deepa is passionate about craft. Her perfectionism comes from love, not stubbornness. She responds well to structure.

---

## Pair 7: Rohan Gupta (Staff Engineer) ← Kavita Reddy (VP Eng)

**Pattern**: Brilliant but arrogant engineer, over-engineering tendency, mentoring takes a back seat to output. Kavita coaches on mentoring and handles retention risk.

- **Jan** (`jan-2026.md`): Collab engine architecture. MISSED_GOAL_REFERENCE: mentoring OKR not mentioned. Rohan dismisses OT as "crutch." Kavita pushes compromise.
- **Feb** (`feb-2026.md`): Rohan mentions recruiter calls. No major triggers. Kavita asks open questions, Rohan is candid. Retention risk emerges.
- **Mar** (`mar-2026.md`): Q1 review + mentoring feedback. VAGUE_FEEDBACK: "could be more empowering," but Kavita self-corrects with the Priya webhook example. Rohan realizes he's presenting other people's work.
- **Apr** (`apr-2026.md`): Comp adjustment ($22% raise) and retention crisis averted. Q2 mentoring goals on Priya. Rohan is receptive, retains him.

**Character Notes**: Rohan is genuinely brilliant. His arrogance is the shadow side of confidence. Responds to status recognition and technical autonomy.

---

## Pair 8: Priya Sharma (Sr SWE Backend) ← Kavita Reddy (VP Eng) [SKIP-LEVEL]

**Pattern**: Quiet engineer under-visible due to manager presenting her work. Skip-level builds trust and coaches self-advocacy. GOLD STANDARD ARC.

- **Jan** (`jan-2026.md`): First skip-level. Priya guarded, gives safe answers. Trust hasn't formed yet. Kavita is patient, doesn't force.
- **Feb** (`feb-2026.md`): Priya slightly more open. Mentions designing webhook retry system. Kavita gently probes about presentation. Coaches framing of self-advocacy. Breakthrough moment.
- **Mar** (`mar-2026.md`): **Breakthrough meeting.** Priya presented at architecture review. Now considering owning caching layer refactor. Kavita coaches on Staff Engineer path and ownership. No triggers—model coaching.
- **Apr** (`apr-2026.md`): Priya presented at sprint review. Owns caching layer project. Confident and visible. Kavita celebrates, discusses Staff Engineer trajectory. No triggers—happy ending.

**Character Notes**: Priya is technically excellent but needs help claiming her own work. By Apr, she's confident and self-advocating. Shows how good skip-level coaching builds leaders.

---

## Trigger Summary

| Pair | Jan | Feb | Mar | Apr |
|------|-----|-----|-----|-----|
| Vikram → Kavita | — | VAGUE_FEEDBACK | VAGUE_FEEDBACK | — |
| Deepa → Kavita | NO_ACTION_ITEMS | NO_ACTION_ITEMS | NO_ACTION_ITEMS | — |
| Rohan → Kavita | MISSED_GOAL_REFERENCE | — | VAGUE_FEEDBACK | — |
| Priya (skip) → Kavita | — | — | — | — |

**Highest Trigger Density**: Feb-Mar (SSO incident debrief, dashboard perfection spiral, retention risk).
**Lowest Trigger Density**: Apr (all four managers showing improved coaching).

---

## How to Use These

**For AI coaching detection system**:
- Load all 16 transcripts into training dataset
- Identify trigger moments at line level (marked with `<!-- TRIGGER: -->` comments)
- Train detection on false negatives (triggers missed by simple pattern matching)
- Validate on Pair 8 (skip-level) as positive control—minimal triggers, high-quality coaching

**For Manager coaching panels**:
- Use Vikram (Feb-Mar) as case study of unconscious over-functioning
- Use Deepa as case study of perfectionism + timeline management
- Use Rohan (Jan-Feb) as retention risk scenario
- Use Priya as ideal skip-level arc (trust → visibility → ownership → confidence)

**For Demo scenarios**:
- Jan meetings: Target-setting and vision alignment
- Feb meetings: Mid-quarter crisis, incident debrief, retention conversation
- Mar meetings: Q1 review, pattern recognition, course correction
- Apr meetings: Q2 planning, role clarity, outcomes of coaching

---

## File Structure

```
transcripts/
├── 05-kavita-vikram/
│   ├── jan-2026.md
│   ├── feb-2026.md
│   ├── mar-2026.md
│   └── apr-2026.md
├── 06-kavita-deepa/
│   ├── jan-2026.md
│   ├── feb-2026.md
│   ├── mar-2026.md
│   └── apr-2026.md
├── 07-kavita-rohan/
│   ├── jan-2026.md
│   ├── feb-2026.md
│   ├── mar-2026.md
│   └── apr-2026.md
├── 08-kavita-priya-skip/
│   ├── jan-2026.md
│   ├── feb-2026.md
│   ├── mar-2026.md
│   └── apr-2026.md
└── README.md
```

---

**Generated for**: Cluely for HR (Enhanced Note-Taker + Coaching Demo)
**Dataset Version**: v1.0
**Quality**: Natural, realistic, trainer-validated
