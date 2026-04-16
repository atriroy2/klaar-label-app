import { TranscriptLine, MeetingBrief } from './types';

/**
 * Parse a transcript markdown file content into TranscriptLine[]
 * Handles format: "Speaker Name: dialogue text"
 * Extracts trigger comments: <!-- TRIGGER: NAME -->
 */
export function parseTranscript(content: string): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  const contentLines = content.split('\n');

  let currentTrigger: string | undefined;
  let currentSpeaker: string | undefined;
  let currentText = '';
  let insideMultiLineComment = false;

  for (const line of contentLines) {
    // Skip markdown frontmatter and empty lines
    if (line.startsWith('---') || line.trim() === '') {
      continue;
    }

    // Handle multi-line HTML comments (e.g. <!-- MEETING_BRIEF ... -->)
    if (insideMultiLineComment) {
      if (line.includes('-->')) {
        insideMultiLineComment = false;
      }
      continue;
    }
    if (line.trim().startsWith('<!--') && !line.includes('-->')) {
      insideMultiLineComment = true;
      continue;
    }

    // Skip single-line HTML comments
    if (line.trim().startsWith('<!--') || line.trim() === '-->') {
      continue;
    }

    // Check for trigger comment
    const triggerMatch = line.match(/<!--\s*TRIGGER:\s*(\w+)\s*-->/);
    if (triggerMatch) {
      currentTrigger = triggerMatch[1];
      continue;
    }

    // Check for speaker line (Speaker Name: text)
    const speakerMatch = line.match(/^([A-Za-z\s&]+?):\s*(.*)$/);
    if (speakerMatch) {
      // If we have accumulated text from previous speaker, save it
      if (currentSpeaker && currentText.trim()) {
        lines.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          triggerBefore: currentTrigger,
        });
      }

      // Start new speaker line
      currentSpeaker = speakerMatch[1].trim();
      currentText = speakerMatch[2];
      currentTrigger = undefined;
    } else if (currentSpeaker) {
      // Continuation of current speaker's text (multi-line dialogue)
      currentText += ' ' + line;
    }
  }

  // Don't forget the last accumulated line
  if (currentSpeaker && currentText.trim()) {
    lines.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
      triggerBefore: currentTrigger,
    });
  }

  return lines;
}

/**
 * Split transcript into segments for Tier 1 processing
 * Default segment size: 3-minute equivalents (roughly 8-10 lines)
 * Larger segments are better for maintaining context
 */
export function splitIntoSegments(
  lines: TranscriptLine[],
  segmentSize: number = 10
): TranscriptLine[][] {
  const segments: TranscriptLine[][] = [];

  for (let i = 0; i < lines.length; i += segmentSize) {
    segments.push(lines.slice(i, i + segmentSize));
  }

  return segments.length > 0 ? segments : [lines];
}

/**
 * Get list of all available transcripts from the data folder
 * Maps to the NovaBuild org structure (15 pairs x 4 months = 60 transcripts)
 */
export function getAvailableTranscripts(): Array<{
  pairId: number;
  folder: string;
  month: string;
  path: string;
}> {
  const meetings = ['jan-2026', 'feb-2026', 'mar-2026', 'apr-2026'];
  const pairs = [
    { id: 1, folder: '01-arjun-kavita' },
    { id: 2, folder: '02-arjun-sanjay' },
    { id: 3, folder: '03-arjun-neha' },
    { id: 4, folder: '04-arjun-vikram-skip' },
    { id: 5, folder: '05-kavita-vikram' },
    { id: 6, folder: '06-kavita-deepa' },
    { id: 7, folder: '07-kavita-rohan' },
    { id: 8, folder: '08-kavita-priya-skip' },
    { id: 9, folder: '09-vikram-amit' },
    { id: 10, folder: '10-vikram-ravi' },
    { id: 11, folder: '11-deepa-ananya' },
    { id: 12, folder: '12-sanjay-meera' },
    { id: 13, folder: '13-meera-farah' },
    { id: 14, folder: '14-meera-dev' },
    { id: 15, folder: '15-sanjay-farah-skip' },
  ];

  const transcripts: Array<{
    pairId: number;
    folder: string;
    month: string;
    path: string;
  }> = [];

  for (const pair of pairs) {
    for (const meeting of meetings) {
      transcripts.push({
        pairId: pair.id,
        folder: pair.folder,
        month: meeting,
        path: `transcripts/${pair.folder}/${meeting}.md`,
      });
    }
  }

  return transcripts;
}

/**
 * Extract MEETING_BRIEF JSON from HTML comment block in transcript.
 * Format: <!-- MEETING_BRIEF { ... } -->
 * Returns parsed MeetingBrief or null if not found.
 */
export function extractMeetingBrief(content: string): MeetingBrief | null {
  const match = content.match(/<!--\s*MEETING_BRIEF\s*\n([\s\S]*?)\n\s*-->/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]);
    return {
      agenda: Array.isArray(parsed.agenda) ? parsed.agenda : [],
      priorActionItems: Array.isArray(parsed.priorActionItems) ? parsed.priorActionItems : [],
      newActionItems: Array.isArray(parsed.newActionItems) ? parsed.newActionItems : [],
    };
  } catch (e) {
    console.error('Failed to parse MEETING_BRIEF JSON:', e);
    return null;
  }
}

/**
 * Extract metadata from transcript frontmatter
 * Returns: { pair, type, date, month, triggers_present, trigger_moments }
 */
export function extractMetadata(
  content: string
): {
  pair: string;
  type: string;
  date: string;
  month: string;
  triggersPresent: string[];
  triggerMoments: string;
} | null {
  const frontmatterMatch = content.match(/^---([\s\S]*?)---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const pair = (frontmatter.match(/pair:\s*(.+)/)?.[1] || '').trim();
  const type = (frontmatter.match(/type:\s*(.+)/)?.[1] || '').trim();
  const date = (frontmatter.match(/date:\s*(.+)/)?.[1] || '').trim();
  const month = (frontmatter.match(/month:\s*(.+)/)?.[1] || '').trim();

  const triggersMatch = frontmatter.match(/triggers_present:\s*\[([^\]]+)\]/);
  const triggersPresent = triggersMatch
    ? triggersMatch[1]
        .split(',')
        .map((t) => t.trim())
        .map((t) => t.replace(/['"]/g, ''))
    : [];

  const triggerMoments = (frontmatter.match(/trigger_moments:\s*"([^"]+)"/)?.[1] || '').trim();

  return {
    pair,
    type,
    date,
    month,
    triggersPresent,
    triggerMoments,
  };
}

/**
 * Calculate speaking ratio for manager vs employee
 * Useful for detecting MANAGER_DOMINATING trigger
 */
export function calculateSpeakingRatio(
  lines: TranscriptLine[],
  managerName: string
): { managerRatio: number; employeeRatio: number } {
  let managerWords = 0;
  let employeeWords = 0;

  for (const line of lines) {
    const wordCount = line.text.split(/\s+/).length;
    if (line.speaker.includes(managerName)) {
      managerWords += wordCount;
    } else {
      employeeWords += wordCount;
    }
  }

  const totalWords = managerWords + employeeWords;
  return {
    managerRatio: totalWords > 0 ? managerWords / totalWords : 0,
    employeeRatio: totalWords > 0 ? employeeWords / totalWords : 0,
  };
}

/**
 * Count questions asked by a speaker
 * Useful for detecting CLOSED_QUESTIONS_ONLY vs open questions
 */
export function analyzeQuestions(lines: TranscriptLine[], speakerName: string) {
  const questions = lines
    .filter((line) => line.speaker.includes(speakerName))
    .filter((line) => line.text.includes('?'));

  const openQuestions = questions.filter(
    (q) =>
      q.text.match(/\b(what|how|why|tell me|walk me through|describe|explain)\b/i)
  );

  const closedQuestions = questions.filter((q) => {
    const text = q.text.toLowerCase();
    return (
      text.match(/\b(are|do|did|can|could|would|will|have|has)\b\s*.*\?/) ||
      (text.includes('?') && !openQuestions.includes(q))
    );
  });

  return {
    totalQuestions: questions.length,
    openQuestions: openQuestions.length,
    closedQuestions: closedQuestions.length,
    openQuestionRatio: questions.length > 0 ? openQuestions.length / questions.length : 0,
  };
}
