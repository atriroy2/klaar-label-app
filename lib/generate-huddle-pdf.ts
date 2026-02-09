import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatTimestamp, formatDuration } from './huddle-utils'
import type { HuddleDetail, TranscriptResponse } from './huddle-types'

/**
 * Generate a PDF report for a huddle containing:
 * 1. General info — date, duration, participants
 * 2. Summary + action items
 * 3. Tags
 * 4. Transcript table (original + english side by side)
 */
export function generateHuddlePdf(
  huddle: HuddleDetail,
  transcript: TranscriptResponse | null
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ── Helper functions ──────────────────────────────────────

  function addHeading(text: string, size: number = 14) {
    if (y > 270) {
      doc.addPage()
      y = margin
    }
    doc.setFontSize(size)
    doc.setFont('helvetica', 'bold')
    doc.text(text, margin, y)
    y += size * 0.5 + 2
  }

  function addText(text: string, size: number = 10, style: 'normal' | 'bold' = 'normal') {
    doc.setFontSize(size)
    doc.setFont('helvetica', style)
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
      if (y > 280) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += size * 0.45
    }
    y += 2
  }

  function addSeparator() {
    if (y > 275) {
      doc.addPage()
      y = margin
    }
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  // ── 1. General Info ───────────────────────────────────────

  // Title: participant names
  const firstNames = huddle.participants.map((p) => p.name.split(' ')[0])
  const title =
    firstNames.length <= 3
      ? firstNames.length === 2
        ? `${firstNames[0]} & ${firstNames[1]}`
        : firstNames.length === 3
          ? `${firstNames[0]}, ${firstNames[1]} & ${firstNames[2]}`
          : firstNames[0] || 'Huddle'
      : `${firstNames.slice(0, 3).join(', ')} & ${firstNames.length - 3} more`

  addHeading(title, 18)
  y += 2

  // Date & duration
  const startDate = huddle.started_at ? new Date(huddle.started_at) : null
  const dateStr = startDate
    ? startDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date'
  const timeStr = startDate
    ? startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : ''
  const durationStr = huddle.duration_seconds != null ? formatDuration(huddle.duration_seconds) : ''
  const dateTimeLine = [dateStr, timeStr, durationStr].filter(Boolean).join(' · ')
  addText(dateTimeLine, 10)

  y += 2

  // Participants with attendance
  addHeading('Participants', 12)
  for (const p of huddle.participants) {
    const joinTime = p.joined_at
      ? new Date(p.joined_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : null
    const leaveTime = p.left_at
      ? new Date(p.left_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : null
    const attendance = joinTime && leaveTime ? `  (${joinTime} – ${leaveTime})` : ''
    const hostTag = p.is_host ? ' [Host]' : ''
    addText(`• ${p.name}${hostTag}${attendance}`, 10)
  }

  addSeparator()

  // ── 2. Summary & Action Items ─────────────────────────────

  if (huddle.summary_english) {
    addHeading('Summary', 12)
    // Strip basic markdown formatting for plain text
    const plainSummary = huddle.summary_english
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
    addText(plainSummary, 10)
  }

  if (huddle.action_items.length > 0) {
    addHeading('Action Items', 12)
    for (const item of huddle.action_items) {
      const prefix = item.assignee ? `${item.assignee}: ` : ''
      addText(`• ${prefix}${item.text}`, 10)
    }
  }

  // ── 3. Tags ───────────────────────────────────────────────

  if (huddle.key_topics.length > 0) {
    addHeading('Tags', 12)
    addText(huddle.key_topics.join(', '), 10)
  }

  addSeparator()

  // ── 4. Transcript (side-by-side table) ────────────────────

  if (transcript && transcript.utterances.length > 0) {
    addHeading('Transcript', 12)

    const tableBody = transcript.utterances.map((u) => [
      formatTimestamp(u.start_time_seconds),
      u.speaker_name,
      u.text_original,
      u.text_english || '',
    ])

    autoTable(doc, {
      startY: y,
      head: [['Time', 'Speaker', 'Original', 'English']],
      body: tableBody,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 12 },  // Time
        1: { cellWidth: 22 },  // Speaker
        2: { cellWidth: 'auto' },  // Original
        3: { cellWidth: 'auto' },  // English
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })
  }

  // ── Save ──────────────────────────────────────────────────

  const safeName = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()
  const dateSlug = startDate ? startDate.toISOString().split('T')[0] : 'unknown'
  doc.save(`huddle-${safeName}-${dateSlug}.pdf`)
}
