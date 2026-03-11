"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import GoalChatPanel from "@/components/goals/GoalChatPanel";

export default function GoalsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Goals &amp; OKRs</h1>
          <p className="text-sm text-gray-500 mt-1">Q4 2026 &middot; Oct - Dec 2026</p>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #6B5CE7, #9B8FE8)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Create Goals with AI
        </button>
      </div>

      {/* Empty state */}
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🎯</div>
        <p className="text-lg font-medium text-gray-500">No goals have been added yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Click &quot;Create Goals with AI&quot; to get started
        </p>
      </div>

      {/* Sheet panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          position="right"
          size="content"
          className="w-[520px] max-w-full p-0 overflow-hidden"
        >
          <GoalChatPanel onClose={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
