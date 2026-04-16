export interface Employee {
  id: string;
  name: string;
  gender: 'M' | 'F';
  role: string;
  department: 'Engineering' | 'Sales' | 'People & Ops' | 'Leadership';
  managerId: string | null;
  reviewScore: number | null;
  reviewSummary: string;
  recentFeedback: string;
  idpFocus: string;
  signaturePatterns: string[]; // coaching trigger patterns this person tends to exhibit as manager
}

export interface MeetingPair {
  id: number;
  folder: string;
  type: 'direct' | 'skip-level';
  managerId: string;
  reportId: string;
  managerPatterns: string[];
  dynamic: string;
}

export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp?: string;
  triggerBefore?: string; // trigger that fires on this line
}

export interface AgendaItem {
  text: string;
  owner: string; // 'shared' | manager first name | report first name
}

export interface ActionItem {
  text: string;
  owner: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'done';
  originalDeadline?: string; // for prior action items carried from previous meeting
  carriedTo?: string | null; // e.g. 'feb-2026' or null
}

export interface MeetingBrief {
  agenda: AgendaItem[];
  priorActionItems: ActionItem[];
  newActionItems: ActionItem[];
}

export interface TranscriptMeeting {
  pairId: number;
  date: string;
  month: string;
  triggersPresent: string[];
  triggerMoments: string;
  lines: TranscriptLine[];
  meetingBrief?: MeetingBrief;
}

export interface CoachingSuggestion {
  id: string;
  role: 'manager' | 'employee';
  trigger: string;
  framework: string;
  headline: string;   // plain-language summary of the coaching point (5-10 words)
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  evidence: string;
  lineStart?: number; // first transcript line index this suggestion relates to
  lineEnd?: number;   // last transcript line index (exclusive)
}

export type CoachingPerspective = 'manager' | 'employee';

export interface TierOneResult {
  flags: string[];
  evidence: Record<string, string>;
  rollingSummary: string;
}

export interface TierTwoResult {
  managerSuggestion: CoachingSuggestion;
  employeeSuggestion: CoachingSuggestion;
}

export interface MeetingSummary {
  bullets: string[];
  actionItems: { owner: string; action: string; deadline?: string }[];
  managerScorecard: {
    feedbackQuality: number;
    listeningRatio: number;
    openQuestions: number;
    goalAlignment: number;
    actionClarity: number;
    overall: number;
  };
  employeeScorecard: {
    participation: number;
    selfAdvocacy: number;
    clarityOfNeeds: number;
    goalOwnership: number;
    overall: number;
  };
  triggersDetected: { trigger: string; count: number; trend: string }[];
  frameworksUsed: string[];
}

export type CoachingTab = 'setup' | 'session' | 'transcripts';
export type ReplaySpeed = 1 | 1.5 | 2 | 2.5 | 3;

export interface SessionState {
  tab: CoachingTab;
  selectedManager: Employee | null;
  selectedReport: Employee | null;
  selectedPair: MeetingPair | null;
  isLive: boolean;
  isReplaying: boolean;
  replaySpeed: ReplaySpeed;
  currentTranscript: TranscriptLine[];
  visibleLines: number;
  suggestions: CoachingSuggestion[];
  summary: MeetingSummary | null;
}
