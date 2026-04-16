import { Employee, MeetingPair, TranscriptMeeting } from './types';

export const employees: Employee[] = [
  // LEADERSHIP
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    gender: 'M',
    role: 'CEO & Founder',
    department: 'Leadership',
    managerId: null,
    reviewScore: null,
    reviewSummary: 'Founder',
    recentFeedback:
      'Board feedback — "Strong product vision but needs to delegate more and build out the leadership bench"',
    idpFocus: 'Executive delegation, board communication, scaling leadership team',
    signaturePatterns: ['MANAGER_DOMINATING', 'VAGUE_FEEDBACK'],
  },

  // ENGINEERING
  {
    id: 'kavita',
    name: 'Kavita Reddy',
    gender: 'F',
    role: 'VP Engineering',
    department: 'Engineering',
    managerId: 'arjun',
    reviewScore: 4.2,
    reviewSummary:
      'Excellent technical leadership, strong team culture. Gap: cross-functional communication with Sales could improve.',
    recentFeedback:
      '"Kavita shields the team well but sometimes over-shields — Sales doesn\'t get enough visibility into what\'s coming"',
    idpFocus: 'Cross-functional stakeholder management, strategic communication',
    signaturePatterns: ['VAGUE_FEEDBACK'],
  },

  {
    id: 'vikram',
    name: 'Vikram Desai',
    gender: 'M',
    role: 'Engineering Manager — Backend',
    department: 'Engineering',
    managerId: 'kavita',
    reviewScore: 3.8,
    reviewSummary:
      'Solid technical decisions, reliable delivery. Gap: tends to solve problems himself instead of coaching his reports to solve them.',
    recentFeedback:
      '"Vikram is the go-to person when things break, but his team doesn\'t grow because he fixes everything himself"',
    idpFocus: 'Coaching and delegation, letting the team fail safely and learn',
    signaturePatterns: ['JUMPING_TO_SOLUTIONS', 'MANAGER_DOMINATING', 'CLOSED_QUESTIONS_ONLY'],
  },

  {
    id: 'deepa',
    name: 'Deepa Nair',
    gender: 'F',
    role: 'Engineering Manager — Frontend & Design',
    department: 'Engineering',
    managerId: 'kavita',
    reviewScore: 4.0,
    reviewSummary:
      'Creative leader, team loves working with her. Gap: sometimes prioritizes polish over shipping.',
    recentFeedback:
      '"Deepa\'s team produces beautiful work but occasionally misses deadlines because they\'re perfecting details"',
    idpFocus: 'Shipping discipline, timeboxing, ruthless prioritization',
    signaturePatterns: ['NO_ACTION_ITEMS'],
  },

  {
    id: 'rohan',
    name: 'Rohan Gupta',
    gender: 'M',
    role: 'Staff Engineer',
    department: 'Engineering',
    managerId: 'kavita',
    reviewScore: 4.5,
    reviewSummary:
      'Exceptional architect, goes deep on hard problems. Gap: can be dismissive of simpler solutions.',
    recentFeedback:
      '"Rohan\'s designs are brilliant but sometimes over-engineered for what we need at this stage"',
    idpFocus: 'Pragmatic engineering trade-offs, influencing without authority',
    signaturePatterns: [],
  },

  {
    id: 'priya',
    name: 'Priya Sharma',
    gender: 'F',
    role: 'Senior Software Engineer — Backend',
    department: 'Engineering',
    managerId: 'vikram',
    reviewScore: 3.5,
    reviewSummary:
      'Strong coder, improving steadily. Gap: doesn\'t speak up enough in design discussions.',
    recentFeedback:
      '"Priya has great ideas but tends to wait for others to voice them first"',
    idpFocus: 'Technical confidence, speaking up in design reviews, owning proposals end-to-end',
    signaturePatterns: [],
  },

  {
    id: 'amit',
    name: 'Amit Joshi',
    gender: 'M',
    role: 'Software Engineer — Backend',
    department: 'Engineering',
    managerId: 'vikram',
    reviewScore: 3.2,
    reviewSummary:
      'Good fundamentals, learning fast. Gap: time management and estimations are often off.',
    recentFeedback:
      '"Amit underestimates tasks consistently — a 2-day estimate becomes a week. Needs help breaking work down"',
    idpFocus: 'Task decomposition, estimation accuracy, time management',
    signaturePatterns: ['ACCOUNTABILITY_DEFLECTION'],
  },

  {
    id: 'ravi',
    name: 'Ravi Kumar',
    gender: 'M',
    role: 'Software Engineer — Backend',
    department: 'Engineering',
    managerId: 'vikram',
    reviewScore: 3.0,
    reviewSummary:
      'First year at company, solid potential. Gap: asks for help too late when stuck.',
    recentFeedback:
      '"Ravi goes silent for days when blocked instead of asking for help — by the time we find out, the sprint is impacted"',
    idpFocus: 'Asking for help early, communication when blocked, on-call readiness',
    signaturePatterns: ['EMPLOYEE_DISENGAGED'],
  },

  {
    id: 'ananya',
    name: 'Ananya Krishnan',
    gender: 'F',
    role: 'Senior Product Designer',
    department: 'Engineering',
    managerId: 'deepa',
    reviewScore: 4.1,
    reviewSummary:
      'Excellent design thinking, user empathy. Gap: specs sometimes miss technical edge cases.',
    recentFeedback:
      '"Ananya\'s designs are intuitive but developers frequently discover undefined states during implementation"',
    idpFocus: 'Technical specification depth, edge case thinking, developer collaboration',
    signaturePatterns: [],
  },

  {
    id: 'ishaan',
    name: 'Ishaan Patel',
    gender: 'M',
    role: 'Software Engineer — Frontend',
    department: 'Engineering',
    managerId: 'deepa',
    reviewScore: 3.6,
    reviewSummary:
      'Fast executor, ships reliably. Gap: code quality drops under deadline pressure.',
    recentFeedback:
      '"Ishaan delivers on time but his PRs have more issues when he\'s rushing — needs to maintain quality even under pressure"',
    idpFocus: 'Code quality under pressure, sustainable pace, test-driven development',
    signaturePatterns: [],
  },

  {
    id: 'pooja',
    name: 'Pooja Verma',
    gender: 'F',
    role: 'Junior Software Engineer — Full Stack',
    department: 'Engineering',
    managerId: 'deepa',
    reviewScore: null,
    reviewSummary: 'Joined 3 weeks ago',
    recentFeedback: 'N/A — Too new for feedback',
    idpFocus: 'Onboarding, codebase familiarity, development workflow, asking good questions',
    signaturePatterns: [],
  },

  // SALES
  {
    id: 'sanjay',
    name: 'Sanjay Iyer',
    gender: 'M',
    role: 'VP Sales',
    department: 'Sales',
    managerId: 'arjun',
    reviewScore: 3.9,
    reviewSummary:
      'Strong closer, energetic leader. Gap: pipeline management is reactive — relies too much on hero deals instead of building predictable pipeline.',
    recentFeedback:
      '"Sanjay closes big deals but the team\'s pipeline visibility is poor — hard to forecast accurately"',
    idpFocus: 'Pipeline discipline, forecasting accuracy, coaching AEs on process',
    signaturePatterns: ['MISSED_GOAL_REFERENCE', 'NO_FOLLOW_UP', 'NO_ACTION_ITEMS'],
  },

  {
    id: 'meera',
    name: 'Meera Rao',
    gender: 'F',
    role: 'Sales Manager',
    department: 'Sales',
    managerId: 'sanjay',
    reviewScore: 4.0,
    reviewSummary:
      'Excellent at developing reps, structured thinker. Gap: sometimes too focused on process at the expense of urgency.',
    recentFeedback:
      '"Meera runs great pipeline reviews but occasionally her reps feel over-managed on methodology"',
    idpFocus: 'Balancing process with autonomy, situational leadership',
    signaturePatterns: ['CLOSED_QUESTIONS_ONLY', 'ALL_CRITICISM_NO_RECOGNITION'],
  },

  {
    id: 'anil',
    name: 'Anil Saxena',
    gender: 'M',
    role: 'Account Executive',
    department: 'Sales',
    managerId: 'meera',
    reviewScore: 3.4,
    reviewSummary:
      'Good relationship builder, persistent. Gap: discovery calls are surface-level — doesn\'t dig into the real pain points.',
    recentFeedback:
      '"Anil builds great rapport but his deals stall because he doesn\'t uncover the compelling event early enough"',
    idpFocus: 'Deep discovery skills, MEDDPICC qualification, identifying compelling events',
    signaturePatterns: [],
  },

  {
    id: 'farah',
    name: 'Farah Sheikh',
    gender: 'F',
    role: 'Account Executive',
    department: 'Sales',
    managerId: 'meera',
    reviewScore: 4.2,
    reviewSummary:
      'Top performer, creative deal-maker. Gap: doesn\'t document her process well — hard for others to learn from her success.',
    recentFeedback:
      '"Farah closes deals that nobody else could, but she works in a black box — the team can\'t replicate what she does"',
    idpFocus: 'Process documentation, knowledge sharing, mentoring junior reps',
    signaturePatterns: [],
  },

  {
    id: 'dev',
    name: 'Dev Chatterjee',
    gender: 'M',
    role: 'Sales Development Rep (SDR)',
    department: 'Sales',
    managerId: 'meera',
    reviewScore: 3.1,
    reviewSummary:
      'Hardworking, high volume activity. Gap: outreach is generic — doesn\'t personalize enough.',
    recentFeedback:
      '"Dev sends a lot of emails but they all sound the same — prospects can tell it\'s a template"',
    idpFocus: 'Personalized outreach, research-before-reach, understanding buyer personas',
    signaturePatterns: [],
  },

  {
    id: 'simran',
    name: 'Simran Bhatia',
    gender: 'F',
    role: 'Business Development Rep (BDR)',
    department: 'Sales',
    managerId: 'sanjay',
    reviewScore: 3.6,
    reviewSummary:
      'Great at building relationships, proactive. Gap: follow-through on partner commitments sometimes slips.',
    recentFeedback:
      '"Simran opens doors with partners wonderfully but some partners have mentioned delays in getting materials they were promised"',
    idpFocus: 'Follow-through discipline, project management, setting realistic timelines',
    signaturePatterns: [],
  },

  // PEOPLE & OPS
  {
    id: 'neha',
    name: 'Neha Kapoor',
    gender: 'F',
    role: 'Head of People & Operations',
    department: 'People & Ops',
    managerId: 'arjun',
    reviewScore: 4.3,
    reviewSummary:
      'Trusted advisor to the CEO, culture champion. Gap: sometimes avoids difficult conversations about underperformers.',
    recentFeedback:
      '"Neha is amazing at culture-building but can be slow to address performance issues — she gives too many chances before acting"',
    idpFocus: 'Having difficult performance conversations, decisive action on underperformance',
    signaturePatterns: [],
  },

  {
    id: 'tara',
    name: 'Tara Singh',
    gender: 'F',
    role: 'HR Business Partner',
    department: 'People & Ops',
    managerId: 'neha',
    reviewScore: 3.7,
    reviewSummary:
      'Empathetic, employees trust her. Gap: data and metrics are not her strength — relies too much on intuition.',
    recentFeedback:
      '"Tara has great instincts about people but struggles to make a data-backed case when presenting to leadership"',
    idpFocus: 'People analytics, data-driven HR recommendations, dashboard literacy',
    signaturePatterns: [],
  },

  {
    id: 'kiran',
    name: 'Kiran Malhotra',
    gender: 'M',
    role: 'Office Manager & Admin',
    department: 'People & Ops',
    managerId: 'neha',
    reviewScore: 3.5,
    reviewSummary:
      'Dependable, keeps things running smoothly. Gap: doesn\'t proactively flag issues — waits until asked.',
    recentFeedback:
      '"Kiran does what\'s asked reliably but rarely comes forward with suggestions for improvement — he could be more proactive"',
    idpFocus: 'Proactive communication, suggesting improvements, taking initiative',
    signaturePatterns: [],
  },
];

export const meetingPairs: MeetingPair[] = [
  {
    id: 1,
    folder: '01-arjun-kavita',
    type: 'direct',
    managerId: 'arjun',
    reportId: 'kavita',
    managerPatterns: ['MANAGER_DOMINATING', 'VAGUE_FEEDBACK'],
    dynamic:
      'CEO pushing VP on cross-functional communication with Sales and SSO delays. Arjun tends to monologue about strategy.',
  },
  {
    id: 2,
    folder: '02-arjun-sanjay',
    type: 'direct',
    managerId: 'arjun',
    reportId: 'sanjay',
    managerPatterns: ['MANAGER_DOMINATING', 'VAGUE_FEEDBACK'],
    dynamic:
      'CEO pressing VP Sales on pipeline predictability. Sanjay is charismatic and deflects with optimism. Arjun says "pipeline needs to be better" without naming specific deals.',
  },
  {
    id: 3,
    folder: '03-arjun-neha',
    type: 'direct',
    managerId: 'arjun',
    reportId: 'neha',
    managerPatterns: ['VAGUE_FEEDBACK'],
    dynamic:
      'CEO nudging Head of People to be more decisive on underperformers. Neha is warm and empathetic but avoids hard conversations. Arjun\'s feedback is vague — "be more decisive" without naming who.',
  },
  {
    id: 4,
    folder: '04-arjun-vikram-skip',
    type: 'skip-level',
    managerId: 'arjun',
    reportId: 'vikram',
    managerPatterns: [],
    dynamic:
      'CEO skip-level with EM. Arjun is more curious here (gathering info, not directing). Vikram is candid about his struggles. Arjun sees the delegation problem from above.',
  },
  {
    id: 5,
    folder: '05-kavita-vikram',
    type: 'direct',
    managerId: 'kavita',
    reportId: 'vikram',
    managerPatterns: ['VAGUE_FEEDBACK'],
    dynamic:
      'VP coaching EM to stop being the hero and start developing his team. Kavita sees the pattern but her feedback on soft skills is vague because she\'s not in his 1:1s.',
  },
  {
    id: 6,
    folder: '06-kavita-deepa',
    type: 'direct',
    managerId: 'kavita',
    reportId: 'deepa',
    managerPatterns: [],
    dynamic:
      'VP coaching EM on shipping discipline vs perfectionism. Kavita is direct but empathetic. Deepa is self-aware but struggles to change the pattern.',
  },
  {
    id: 7,
    folder: '07-kavita-rohan',
    type: 'direct',
    managerId: 'kavita',
    reportId: 'rohan',
    managerPatterns: [],
    dynamic:
      'VP managing Staff Engineer — retention risk + over-engineering tendency. Rohan is brilliant and knows it. Kavita needs to challenge him on pragmatism while keeping him engaged and retained.',
  },
  {
    id: 8,
    folder: '08-kavita-priya-skip',
    type: 'skip-level',
    managerId: 'kavita',
    reportId: 'priya',
    managerPatterns: [],
    dynamic:
      'Gold standard meeting. Kavita asks great open questions, Priya opens up about not speaking up and Vikram presenting her work. Kavita coaches without undermining Vikram.',
  },
  {
    id: 9,
    folder: '09-vikram-amit',
    type: 'direct',
    managerId: 'vikram',
    reportId: 'amit',
    managerPatterns: ['JUMPING_TO_SOLUTIONS', 'MANAGER_DOMINATING'],
    dynamic:
      'EM addressing chronic estimation problems. Vikram tells Amit how to estimate instead of coaching him. Amit deflects with external factors. Classic bad 1:1.',
  },
  {
    id: 10,
    folder: '10-vikram-ravi',
    type: 'direct',
    managerId: 'vikram',
    reportId: 'ravi',
    managerPatterns: ['JUMPING_TO_SOLUTIONS', 'MANAGER_DOMINATING', 'CLOSED_QUESTIONS_ONLY'],
    dynamic:
      'Worst combination. Vikram dominates, Ravi goes silent. Vikram asks "are you blocked?" (closed), Ravi says "no" (lying). The 2-week silence incident happens between Feb and Mar meetings.',
  },
  {
    id: 11,
    folder: '11-deepa-ananya',
    type: 'direct',
    managerId: 'deepa',
    reportId: 'ananya',
    managerPatterns: ['NO_ACTION_ITEMS'],
    dynamic:
      'Good relationship, creative discussions. Deepa gives thoughtful feedback but meetings end without firm commitments on timeline. Ananya\'s edge-case gap is the recurring topic.',
  },
  {
    id: 12,
    folder: '12-sanjay-meera',
    type: 'direct',
    managerId: 'sanjay',
    reportId: 'meera',
    managerPatterns: ['MISSED_GOAL_REFERENCE', 'NO_FOLLOW_UP', 'NO_ACTION_ITEMS'],
    dynamic:
      'VP Sales is charismatic but unstructured. Meetings with Meera devolve into strategy brainstorming — never ties back to OKRs. Meera is more structured and subtly tries to steer the conversation back.',
  },
  {
    id: 13,
    folder: '13-meera-farah',
    type: 'direct',
    managerId: 'meera',
    reportId: 'farah',
    managerPatterns: ['CLOSED_QUESTIONS_ONLY'],
    dynamic:
      'Manager coaching top performer to document her process. Farah pushes back on bureaucracy. Meera reverts to checklist questions when challenged. Interesting tension between process and autonomy.',
  },
  {
    id: 14,
    folder: '14-meera-dev',
    type: 'direct',
    managerId: 'meera',
    reportId: 'dev',
    managerPatterns: ['CLOSED_QUESTIONS_ONLY', 'ALL_CRITICISM_NO_RECOGNITION'],
    dynamic:
      'Manager increasingly frustrated with SDR\'s generic outreach. Meera starts balanced but by March it\'s all criticism. Dev is trying but not improving fast enough. PIP trajectory.',
  },
  {
    id: 15,
    folder: '15-sanjay-farah-skip',
    type: 'skip-level',
    managerId: 'sanjay',
    reportId: 'farah',
    managerPatterns: ['NO_FOLLOW_UP'],
    dynamic:
      'VP skip-level with top AE. Farah is candid with Sanjay about why she doesn\'t document — "my process is intuitive, writing it down kills it." Sanjay relates because he\'s the same way. Interesting mirror.',
  },
];

/**
 * Get a single employee by ID
 */
export function getEmployee(id: string): Employee | undefined {
  return employees.find((emp) => emp.id === id);
}

/**
 * Get all direct reports of a manager
 */
export function getManagerReports(managerId: string): Employee[] {
  return employees.filter((emp) => emp.managerId === managerId);
}

/**
 * Get all meeting pairs involving an employee (as manager or report)
 */
export function getPairsForEmployee(employeeId: string): MeetingPair[] {
  return meetingPairs.filter(
    (pair) => pair.managerId === employeeId || pair.reportId === employeeId
  );
}

/**
 * Sample transcripts for the 15 meeting pairs across 4 months (Jan-Apr)
 * Each transcript has lines and detected triggers
 */
export const transcripts: TranscriptMeeting[] = [
  // Pair 1: Arjun -> Kavita (Jan)
  {
    pairId: 1,
    date: '2026-01-15',
    month: 'January',
    triggersPresent: ['VAGUE_FEEDBACK'],
    triggerMoments: '5:32, 8:15',
    lines: [
      { speaker: 'Arjun Mehta', text: 'Kavita, how are things going with the engineering team?', timestamp: '0:00' },
      { speaker: 'Kavita Reddy', text: 'Pretty good. We shipped the auth overhaul last week and the team is in a good place.', timestamp: '0:30' },
      { speaker: 'Arjun Mehta', text: 'That\'s awesome. Your team culture is really strong. Just keep doing what you\'re doing.', timestamp: '1:00', triggerBefore: 'VAGUE_FEEDBACK' },
      { speaker: 'Kavita Reddy', text: 'Thanks. One thing I\'ve been thinking about is the cross-functional piece. Sales keeps saying they don\'t know what\'s coming.', timestamp: '1:45' },
      { speaker: 'Arjun Mehta', text: 'Yeah, that\'s something we should work on together. Maybe a quarterly sync?', timestamp: '2:15' },
    ],
  },
  // Pair 1: Arjun -> Kavita (Feb)
  {
    pairId: 1,
    date: '2026-02-19',
    month: 'February',
    triggersPresent: ['VAGUE_FEEDBACK', 'NO_ACTION_ITEMS'],
    triggerMoments: '4:10, 6:30',
    lines: [
      { speaker: 'Arjun Mehta', text: 'How\'s the cross-functional communication going?', timestamp: '0:00' },
      { speaker: 'Kavita Reddy', text: 'Still working on it. We did one sync with Sales last month. It helped but we need to make it recurring.', timestamp: '0:45' },
      { speaker: 'Arjun Mehta', text: 'Good work. Let me know if you need help from my end.', timestamp: '1:15', triggerBefore: 'VAGUE_FEEDBACK' },
    ],
  },
  // Pair 1: Arjun -> Kavita (Mar)
  {
    pairId: 1,
    date: '2026-03-19',
    month: 'March',
    triggersPresent: [],
    triggerMoments: '',
    lines: [
      { speaker: 'Arjun Mehta', text: 'Let\'s catch up on Q1 goals.', timestamp: '0:00' },
      { speaker: 'Kavita Reddy', text: 'On track. Auth overhaul is done, cross-functional syncs are now bi-weekly, and hiring is ramping up.', timestamp: '0:30' },
      { speaker: 'Arjun Mehta', text: 'Excellent. What do you want to focus on for Q2?', timestamp: '1:00' },
      { speaker: 'Kavita Reddy', text: 'Scaling the team responsibly and shipping the new dashboard.', timestamp: '1:30' },
    ],
  },
  // Pair 1: Arjun -> Kavita (Apr)
  {
    pairId: 1,
    date: '2026-04-02',
    month: 'April',
    triggersPresent: [],
    triggerMoments: '',
    lines: [
      { speaker: 'Arjun Mehta', text: 'Quick sync on new hire onboarding?', timestamp: '0:00' },
      { speaker: 'Kavita Reddy', text: 'Smooth so far. The structured approach is working well.', timestamp: '0:45' },
    ],
  },
  // Pair 8: Kavita -> Priya (Feb - Gold standard)
  {
    pairId: 8,
    date: '2026-02-10',
    month: 'February',
    triggersPresent: [],
    triggerMoments: '',
    lines: [
      { speaker: 'Kavita Reddy', text: 'Priya, I wanted to check in on how the design review process is going for you.', timestamp: '0:00' },
      { speaker: 'Priya Sharma', text: 'Honestly, it\'s been a bit intimidating. When Vikram and I are both in the room and Vikram presents the design, I sometimes have thoughts but I hold back.', timestamp: '0:45' },
      { speaker: 'Kavita Reddy', text: 'What\'s stopping you? What happens in your head?', timestamp: '1:30' },
      { speaker: 'Priya Sharma', text: 'I guess I worry that if I disagree with Vikram it might seem like I don\'t respect him. Plus he\'s more senior.', timestamp: '2:15' },
      { speaker: 'Kavita Reddy', text: 'That makes sense. And what do you think that costs the team?', timestamp: '3:00' },
      { speaker: 'Priya Sharma', text: 'We might ship suboptimal designs sometimes.', timestamp: '3:45' },
      { speaker: 'Kavita Reddy', text: 'Right. So how could you show up differently in those meetings?', timestamp: '4:15' },
      { speaker: 'Priya Sharma', text: 'Maybe I could speak up when I have a concern, framed as a question first?', timestamp: '5:00' },
      { speaker: 'Kavita Reddy', text: 'I love that. Let\'s try it in the next design review. I\'ll be there to support you.', timestamp: '5:45' },
    ],
  },
  // Pair 9: Vikram -> Amit (Mar - Bad estimation coaching)
  {
    pairId: 9,
    date: '2026-03-12',
    month: 'March',
    triggersPresent: ['JUMPING_TO_SOLUTIONS', 'MANAGER_DOMINATING'],
    triggerMoments: '3:20, 5:45',
    lines: [
      { speaker: 'Vikram Desai', text: 'Amit, let\'s talk about your estimation. The last three tasks you said 2 days and it took a week.', timestamp: '0:00' },
      { speaker: 'Amit Joshi', text: 'Yeah, I know. The database migration was more complex than I thought.', timestamp: '0:45' },
      { speaker: 'Vikram Desai', text: 'So here\'s what you need to do. When you break down a task, add 50% buffer. And always include time for testing and integration.', timestamp: '1:30', triggerBefore: 'JUMPING_TO_SOLUTIONS' },
      { speaker: 'Amit Joshi', text: 'Okay, I\'ll try that.', timestamp: '2:15' },
      { speaker: 'Vikram Desai', text: 'And second, talk to the team before estimating. Get their input. That\'s how you learn the system better.', timestamp: '2:45', triggerBefore: 'MANAGER_DOMINATING' },
      { speaker: 'Amit Joshi', text: 'Got it. Will do.', timestamp: '3:15' },
    ],
  },
  // Pair 10: Vikram -> Ravi (Feb - Blocked silence)
  {
    pairId: 10,
    date: '2026-02-18',
    month: 'February',
    triggersPresent: ['CLOSED_QUESTIONS_ONLY', 'MANAGER_DOMINATING'],
    triggerMoments: '2:00, 4:30',
    lines: [
      { speaker: 'Vikram Desai', text: 'Ravi, you\'re quiet today. Are you blocked?', timestamp: '0:00', triggerBefore: 'CLOSED_QUESTIONS_ONLY' },
      { speaker: 'Ravi Kumar', text: 'No, no. I\'m fine.', timestamp: '0:30' },
      { speaker: 'Vikram Desai', text: 'Good. So this week you need to finish the caching layer. It\'s critical for performance.', timestamp: '1:00', triggerBefore: 'MANAGER_DOMINATING' },
      { speaker: 'Ravi Kumar', text: 'Yeah, I\'ll get it done.', timestamp: '1:45' },
      { speaker: 'Vikram Desai', text: 'Great. I\'ll check in with you Wednesday. Any questions?', timestamp: '2:15' },
      { speaker: 'Ravi Kumar', text: 'No, all good.', timestamp: '2:45' },
    ],
  },
  // Pair 11: Deepa -> Ananya (Jan - Good but no commitments)
  {
    pairId: 11,
    date: '2026-01-22',
    month: 'January',
    triggersPresent: ['NO_ACTION_ITEMS'],
    triggerMoments: '8:00',
    lines: [
      { speaker: 'Deepa Nair', text: 'How are you feeling about the design system work?', timestamp: '0:00' },
      { speaker: 'Ananya Krishnan', text: 'I love it. I\'ve been thinking about the component API and I have some ideas for making edge cases clearer in the spec.', timestamp: '0:45' },
      { speaker: 'Deepa Nair', text: 'That\'s great thinking. Edge cases are always tricky. Tell me more.', timestamp: '1:30' },
      { speaker: 'Ananya Krishnan', text: 'Like, when a disabled button is loading, what state does it show? Or a button in an error state...', timestamp: '2:30' },
      { speaker: 'Deepa Nair', text: 'Brilliant. I think that would really help the team. This could be a great design doc.', timestamp: '3:45' },
      { speaker: 'Ananya Krishnan', text: 'Yeah, maybe. I could draft something.', timestamp: '4:15' },
      { speaker: 'Deepa Nair', text: 'Awesome. Let me know if you want to bounce ideas off me.', timestamp: '5:00', triggerBefore: 'NO_ACTION_ITEMS' },
    ],
  },
  // Pair 12: Sanjay -> Meera (Feb - Unstructured brainstorming)
  {
    pairId: 12,
    date: '2026-02-24',
    month: 'February',
    triggersPresent: ['MISSED_GOAL_REFERENCE', 'NO_FOLLOW_UP'],
    triggerMoments: '3:15, 7:45',
    lines: [
      { speaker: 'Sanjay Iyer', text: 'Meera, let\'s talk strategy. Where do you think we can find the next big win this quarter?', timestamp: '0:00' },
      { speaker: 'Meera Rao', text: 'I\'ve been thinking about the healthcare segment. We have two warm leads and the TAM is huge.', timestamp: '0:45' },
      { speaker: 'Sanjay Iyer', text: 'Oh, I like that. Healthcare is hot right now. My friend at another startup crushed it in healthcare.', timestamp: '1:30' },
      { speaker: 'Meera Rao', text: 'Right? But we need to think about whether this aligns with our Q2 goals around enterprise expansion.', timestamp: '2:15', triggerBefore: 'MISSED_GOAL_REFERENCE' },
      { speaker: 'Sanjay Iyer', text: 'Yeah, totally. We should explore this more. Maybe get the product team involved?', timestamp: '3:00' },
      { speaker: 'Meera Rao', text: 'For sure. Want to schedule that together next week?', timestamp: '3:45' },
      { speaker: 'Sanjay Iyer', text: 'Sounds good. Let\'s catch up after. Good catch on the enterprise angle.', timestamp: '4:30', triggerBefore: 'NO_FOLLOW_UP' },
    ],
  },
  // Pair 13: Meera -> Farah (Mar - Process vs autonomy tension)
  {
    pairId: 13,
    date: '2026-03-05',
    month: 'March',
    triggersPresent: ['CLOSED_QUESTIONS_ONLY'],
    triggerMoments: '5:00, 7:15',
    lines: [
      { speaker: 'Meera Rao', text: 'Farah, you crushed it again this month. Your close rate is 2x the team average.', timestamp: '0:00' },
      { speaker: 'Farah Sheikh', text: 'Thanks. I\'m just doing what feels natural at this point.', timestamp: '0:45' },
      { speaker: 'Meera Rao', text: 'That\'s what I want to talk about. Can you document your process so the team can learn?', timestamp: '1:30' },
      { speaker: 'Farah Sheikh', text: 'Honestly, I\'m not sure I can. A lot of it is intuition. If I write it down, it feels formulaic and loses the magic.', timestamp: '2:30' },
      { speaker: 'Meera Rao', text: 'I hear you. But wouldn\'t it help the team? Have you thought about that?', timestamp: '3:15', triggerBefore: 'CLOSED_QUESTIONS_ONLY' },
      { speaker: 'Farah Sheikh', text: 'Maybe, but I also don\'t want to spend my time writing docs when I could be closing deals.', timestamp: '4:15' },
      { speaker: 'Meera Rao', text: 'Is the documentation really a lower priority than deals? Don\'t you agree that we need process?', timestamp: '5:00', triggerBefore: 'CLOSED_QUESTIONS_ONLY' },
    ],
  },
  // Pair 14: Meera -> Dev (Apr - PIP trajectory)
  {
    pairId: 14,
    date: '2026-04-02',
    month: 'April',
    triggersPresent: ['CLOSED_QUESTIONS_ONLY', 'ALL_CRITICISM_NO_RECOGNITION'],
    triggerMoments: '2:30, 5:00',
    lines: [
      { speaker: 'Meera Rao', text: 'Dev, your outreach numbers are up but the response rate is still low.', timestamp: '0:00' },
      { speaker: 'Dev Chatterjee', text: 'I know. I\'ve been trying to personalize more like you suggested.', timestamp: '0:45' },
      { speaker: 'Meera Rao', text: 'Are you really personalizing? Because your emails still look generic to me.', timestamp: '1:30', triggerBefore: 'CLOSED_QUESTIONS_ONLY' },
      { speaker: 'Dev Chatterjee', text: 'I am, but maybe I\'m not doing it right.', timestamp: '2:15' },
      { speaker: 'Meera Rao', text: 'Look, the other SDRs are getting 15%+ response rates. You\'re at 4%. That\'s a problem.', timestamp: '2:45', triggerBefore: 'ALL_CRITICISM_NO_RECOGNITION' },
      { speaker: 'Dev Chatterjee', text: 'I\'ll step it up.', timestamp: '3:15' },
      { speaker: 'Meera Rao', text: 'You need to. We can\'t continue like this.', timestamp: '3:45' },
    ],
  },
  // Pair 15: Sanjay -> Farah skip-level (Mar)
  {
    pairId: 15,
    date: '2026-03-20',
    month: 'March',
    triggersPresent: ['NO_FOLLOW_UP'],
    triggerMoments: '4:30',
    lines: [
      { speaker: 'Sanjay Iyer', text: 'Farah, I wanted to see how you\'re thinking about your growth here.', timestamp: '0:00' },
      { speaker: 'Farah Sheikh', text: 'I\'m happy. The org feels different from my last place. More supportive.', timestamp: '0:45' },
      { speaker: 'Sanjay Iyer', text: 'That\'s great. And why do you think you close so much?', timestamp: '1:30' },
      { speaker: 'Farah Sheikh', text: 'Honestly? Because I listen a lot. Most AEs are selling. I\'m actually trying to understand the customer.', timestamp: '2:30' },
      { speaker: 'Sanjay Iyer', text: 'That\'s exactly it. That\'s why I made it here too.', timestamp: '3:15' },
      { speaker: 'Farah Sheikh', text: 'Yeah. And Meera wants me to document it, but I think if I do, it becomes mechanical.', timestamp: '4:00' },
      { speaker: 'Sanjay Iyer', text: 'I totally get it. You and I are the same way. We just have it.', timestamp: '4:45', triggerBefore: 'NO_FOLLOW_UP' },
    ],
  },
];
