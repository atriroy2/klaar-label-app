import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PairInfo {
  id: number;
  folder: string;
  type: 'direct' | 'skip-level';
  manager: { name: string; role: string; gender: string };
  report: { name: string; role: string; gender: string };
  manager_patterns: string[];
  dynamic: string;
}

interface TranscriptInfo {
  pairId: number;
  folder: string;
  manager: string;
  report: string;
  type: 'direct' | 'skip-level';
  months: string[];
  managerPatterns: string[];
  dynamic: string;
}

function getTranscriptsPath(): string {
  if (process.env.TRANSCRIPTS_PATH) return process.env.TRANSCRIPTS_PATH;

  // Try inside the app first (data/transcripts), then sibling folder
  const inApp = path.join(process.cwd(), 'data', 'transcripts');
  if (fs.existsSync(inApp)) return inApp;

  return path.join(process.cwd(), '..', 'Cluely for HR', 'transcripts');
}

export async function GET(): Promise<NextResponse> {
  try {
    const transcriptsPath = getTranscriptsPath();

    if (!fs.existsSync(transcriptsPath)) {
      console.warn(`Transcripts directory not found at ${transcriptsPath}`);
      return NextResponse.json({ transcripts: [] }, { status: 200 });
    }

    // Read pairs_index.json for metadata
    const indexPath = path.join(transcriptsPath, 'pairs_index.json');
    let pairsIndex: PairInfo[] = [];

    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const parsed = JSON.parse(indexContent);
      pairsIndex = parsed.pairs || [];
    }

    // Build lookup by folder name
    const pairsByFolder = new Map<string, PairInfo>();
    for (const pair of pairsIndex) {
      pairsByFolder.set(pair.folder, pair);
    }

    const transcripts: TranscriptInfo[] = [];

    // Read all folders in the transcripts directory
    const folders = fs.readdirSync(transcriptsPath).filter((item) => {
      const fullPath = path.join(transcriptsPath, item);
      return fs.statSync(fullPath).isDirectory();
    });

    for (const folder of folders) {
      const match = folder.match(/^(\d+)-/);
      if (!match) continue;

      const pairId = parseInt(match[1], 10);
      const metadata = pairsByFolder.get(folder);

      // Read months from .md files in this folder
      const folderPath = path.join(transcriptsPath, folder);
      const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.md'));
      const months = files
        .map((f) => f.replace('.md', ''))
        .sort(); // chronological: apr, feb, jan, mar → sorted alphabetically which is close enough

      transcripts.push({
        pairId,
        folder,
        manager: metadata?.manager?.name || `Manager (Pair ${pairId})`,
        report: metadata?.report?.name || `Report (Pair ${pairId})`,
        type: (metadata?.type as 'direct' | 'skip-level') || 'direct',
        months,
        managerPatterns: metadata?.manager_patterns || [],
        dynamic: metadata?.dynamic || '',
      });
    }

    // Sort by pairId
    transcripts.sort((a, b) => a.pairId - b.pairId);

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('Error reading transcripts:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
