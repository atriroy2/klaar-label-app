import { NextResponse } from 'next/server';
import { getSessionCostSummary, resetCostLog } from '@/lib/coaching/cost-logger';

// GET: return current session cost summary
export async function GET(): Promise<NextResponse> {
  const summary = getSessionCostSummary();
  return NextResponse.json(summary);
}

// DELETE: reset the cost log (e.g. when starting a new session)
export async function DELETE(): Promise<NextResponse> {
  resetCostLog();
  return NextResponse.json({ ok: true });
}
