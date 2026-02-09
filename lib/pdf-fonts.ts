import type jsPDF from 'jspdf'

/**
 * Dynamically load Noto Sans Devanagari font (supports Latin + Devanagari)
 * and register it with a jsPDF document instance.
 *
 * Fonts are fetched from /fonts/ at generation time so they don't bloat
 * the JS bundle. Results are cached in memory for subsequent PDFs in
 * the same session.
 */

let cachedRegular: string | null = null
let cachedBold: string | null = null

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function registerDevanagariFont(doc: jsPDF): Promise<void> {
  // Load Regular
  if (!cachedRegular) {
    cachedRegular = await fetchFontAsBase64('/fonts/NotoSansDevanagari-Regular.ttf')
  }

  // Load Bold
  if (!cachedBold) {
    cachedBold = await fetchFontAsBase64('/fonts/NotoSansDevanagari-Bold.ttf')
  }

  // Register with jsPDF virtual file system
  doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', cachedRegular)
  doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal')

  doc.addFileToVFS('NotoSansDevanagari-Bold.ttf', cachedBold)
  doc.addFont('NotoSansDevanagari-Bold.ttf', 'NotoSansDevanagari', 'bold')
}

/** Font family name to use with doc.setFont() */
export const DEVANAGARI_FONT = 'NotoSansDevanagari'
