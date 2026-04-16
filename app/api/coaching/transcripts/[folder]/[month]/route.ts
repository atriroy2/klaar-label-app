import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { TranscriptLine, TranscriptMeeting, MeetingBrief } from '@/lib/coaching/types';

// Force dynamic — this route reads from the filesystem and must not be cached
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    folder: string;
    month: string;
  };
}

interface TranscriptResponse extends TranscriptMeeting {
  lines: TranscriptLine[];
}

function parseTranscriptMarkdown(content: string): TranscriptResponse {
  const lines = content.split('\n');
  let currentIndex = 0;

  // Parse YAML frontmatter
  let frontmatter: Record<string, unknown> = {};
  if (lines[0] === '---') {
    currentIndex = 1;
    while (currentIndex < lines.length && lines[currentIndex] !== '---') {
      const line = lines[currentIndex];
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();

        // Parse arrays like [MANAGER_DOMINATING, NO_ACTION_ITEMS]
        if (value.startsWith('[') && value.endsWith(']')) {
          const arrayContent = value.substring(1, value.length - 1);
          frontmatter[key] = arrayContent
            .split(',')
            .map((v) => v.trim());
        } else if (value.startsWith('"') && value.endsWith('"')) {
          frontmatter[key] = value.substring(1, value.length - 1);
        } else {
          frontmatter[key] = value;
        }
      }
      currentIndex++;
    }
    currentIndex++; // Skip closing ---
  }

  // Skip empty lines
  while (currentIndex < lines.length && lines[currentIndex].trim() === '') {
    currentIndex++;
  }

  // Parse transcript lines
  const transcriptLines: TranscriptLine[] = [];
  let currentTrigger: string | undefined;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();

    // Check for trigger comments
    if (line.startsWith('<!-- TRIGGER:')) {
      const triggerMatch = line.match(/<!-- TRIGGER:\s*(\w+)\s*-->/);
      if (triggerMatch) {
        currentTrigger = triggerMatch[1];
      }
      currentIndex++;
      continue;
    }

    // Skip multi-line HTML comments (e.g. <!-- MEETING_BRIEF ... -->)
    if (line.startsWith('<!--') && !line.includes('-->')) {
      // This is the start of a multi-line comment — skip until closing -->
      currentIndex++;
      while (currentIndex < lines.length && !lines[currentIndex].includes('-->')) {
        currentIndex++;
      }
      currentIndex++; // skip the closing --> line
      continue;
    }

    // Skip single-line HTML comments and empty lines
    if (line.startsWith('<!--') || line === '' || line === '-->') {
      currentIndex++;
      continue;
    }

    // Parse speaker lines (Speaker: text)
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const speaker = line.substring(0, colonIndex).trim();
      const text = line.substring(colonIndex + 1).trim();

      if (speaker && text) {
        transcriptLines.push({
          speaker,
          text,
          triggerBefore: currentTrigger,
        });
        currentTrigger = undefined; // Reset trigger after using it
      }
    }

    currentIndex++;
  }

  // Extract key info from frontmatter
  const pairId = parseInt(
    ((frontmatter.pair as string) || '').match(/\d+/)?.[0] || '0',
    10,
  );
  const date = (frontmatter.date as string) || '';
  const month = (frontmatter.month as string) || '';
  const triggersPresent = (frontmatter.triggers_present as string[]) || [];
  const triggerMoments = (frontmatter.trigger_moments as string) || '';

  // Extract MEETING_BRIEF from HTML comment block
  let meetingBrief: MeetingBrief | undefined;
  const hasMeetingBriefText = content.includes('MEETING_BRIEF');
  const briefMatch = content.match(/<!--\s*MEETING_BRIEF\s*\n([\s\S]*?)\n\s*-->/);
  console.log('[API transcript] MEETING_BRIEF text present:', hasMeetingBriefText, 'regex matched:', !!briefMatch, 'content length:', content.length);
  if (briefMatch) {
    try {
      const parsed = JSON.parse(briefMatch[1]);
      meetingBrief = {
        agenda: Array.isArray(parsed.agenda) ? parsed.agenda : [],
        priorActionItems: Array.isArray(parsed.priorActionItems) ? parsed.priorActionItems : [],
        newActionItems: Array.isArray(parsed.newActionItems) ? parsed.newActionItems : [],
      };
    } catch (e) {
      console.error('Failed to parse MEETING_BRIEF:', e);
    }
  }

  return {
    pairId: pairId || 0,
    date,
    month,
    triggersPresent,
    triggerMoments,
    lines: transcriptLines,
    ...(meetingBrief && { meetingBrief }),
  };
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { folder, month } = params;

    // Validate inputs
    if (!folder || !month) {
      return NextResponse.json(
        { error: 'folder and month parameters are required' },
        { status: 400 },
      );
    }

    // Construct file path — check inside app first, then sibling folder
    let transcriptsPath = process.env.TRANSCRIPTS_PATH || '';
    if (!transcriptsPath) {
      const inApp = path.join(process.cwd(), 'data', 'transcripts');
      transcriptsPath = fs.existsSync(inApp)
        ? inApp
        : path.join(process.cwd(), '..', 'Cluely for HR', 'transcripts');
    }

    const filePath = path.join(transcriptsPath, folder, `${month}.md`);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const normalizedBase = path.normalize(transcriptsPath);
    if (!normalizedPath.startsWith(normalizedBase)) {
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 },
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: `Transcript not found: ${folder}/${month}` },
        { status: 404 },
      );
    }

    // Read and parse file
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log('[API GET] Reading file:', filePath, 'length:', content.length, 'has MEETING_BRIEF:', content.includes('MEETING_BRIEF'));
    const transcript = parseTranscriptMarkdown(content);
    console.log('[API GET] Parsed result has meetingBrief:', !!transcript.meetingBrief, 'lines:', transcript.lines?.length);

    return NextResponse.json(transcript);
  } catch (error) {
    console.error('Error reading transcript:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
