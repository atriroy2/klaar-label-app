import type { AppUser } from './huddle-types'

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i]
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        i === 0
          ? j
          : Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            )
    }
  }
  return matrix[a.length][b.length]
}

/**
 * Calculate similarity between two strings (0 to 1).
 * Handles case-insensitive matching, substring matching,
 * and token reordering ("John Smith" vs "Smith John").
 */
export function stringSimilarity(a: string, b: string): number {
  const al = a.toLowerCase().trim()
  const bl = b.toLowerCase().trim()

  if (!al || !bl) return 0

  // Exact match
  if (al === bl) return 1.0

  // Token-sorted match: "John Smith" vs "Smith John"
  const aTokens = al.split(/\s+/).sort()
  const bTokens = bl.split(/\s+/).sort()
  const sortedA = aTokens.join(' ')
  const sortedB = bTokens.join(' ')
  if (sortedA === sortedB) return 0.95

  // Substring/contains match
  if (al.includes(bl) || bl.includes(al)) return 0.9

  // First name match: "John" matches "John Smith"
  const aFirst = aTokens[0]
  const bFirst = bTokens[0]
  if (aFirst === bFirst && aFirst.length >= 3) return 0.8

  // Levenshtein-based similarity
  const maxLen = Math.max(al.length, bl.length)
  const dist = levenshteinDistance(al, bl)
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Find the best matching user for a participant name.
 * Returns null if no match exceeds the threshold.
 */
export function findBestMatch(
  participantName: string,
  users: AppUser[],
  threshold = 0.5
): { user: AppUser; score: number } | null {
  let best: { user: AppUser; score: number } | null = null

  for (const user of users) {
    // Compare against user's name
    const nameScore = stringSimilarity(participantName, user.name)

    // Also compare against email prefix (before @)
    const emailPrefix = user.email.split('@')[0].replace(/[._-]/g, ' ')
    const emailScore = stringSimilarity(participantName, emailPrefix)

    const score = Math.max(nameScore, emailScore)

    if (score >= threshold && (!best || score > best.score)) {
      best = { user, score }
    }
  }

  return best
}
