/** Format seconds as m:ss (e.g., 125 → "2:05") */
export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format duration in seconds as human readable (e.g., 1800 → "30 min") */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

/** Consistent speaker color from a palette */
const SPEAKER_COLORS = [
  'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
  'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
  'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300',
  'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300',
  'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-300',
  'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300',
  'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300',
  'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
]

export function getSpeakerColor(speakerIndex: number): string {
  return SPEAKER_COLORS[speakerIndex % SPEAKER_COLORS.length]
}
