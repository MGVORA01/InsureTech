import { jsPDF } from 'jspdf'
import type {
  RecommendationListOut,
  RecommendationOut,
  RiskScoreOut,
} from './recommendations.types'
import type { BusinessProfile } from '../profile/profile.types'
import { TURNOVER_RANGES } from '../profile/profile.constants'

const NA = '—'
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_Y = 285

type Rgb = [number, number, number]

const COLORS = {
  ink: [18, 28, 45] as Rgb,
  muted: [100, 116, 139] as Rgb,
  line: [219, 226, 239] as Rgb,
  surface: [248, 250, 252] as Rgb,
  card: [255, 255, 255] as Rgb,
  navy: [12, 32, 52] as Rgb,
  teal: [15, 118, 110] as Rgb,
  green: [22, 101, 52] as Rgb,
  greenSoft: [220, 252, 231] as Rgb,
  amber: [146, 64, 14] as Rgb,
  amberSoft: [254, 243, 199] as Rgb,
  orange: [194, 65, 12] as Rgb,
  orangeSoft: [255, 237, 213] as Rgb,
  red: [185, 28, 28] as Rgb,
  redSoft: [254, 226, 226] as Rgb,
}

function setFill(doc: jsPDF, color: Rgb) {
  doc.setFillColor(color[0], color[1], color[2])
}
function setDraw(doc: jsPDF, color: Rgb) {
  doc.setDrawColor(color[0], color[1], color[2])
}
function setText(doc: jsPDF, color: Rgb) {
  doc.setTextColor(color[0], color[1], color[2])
}

function hasValue(value: unknown): value is string {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function textOr(value: unknown, fallback = NA): string {
  return hasValue(value) ? String(value) : fallback
}

function percent(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0
  const normalized = value <= 1 ? value * 100 : value
  return Math.round(Math.min(Math.max(normalized, 0), 100))
}

function scorePercent(recommendation: RecommendationOut): number {
  return percent(recommendation.recommendation_score ?? recommendation.risk_score)
}

function riskLabel(score: number): string {
  if (score >= 80) return 'Critical'
  if (score >= 60) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

function levelColors(level?: string): { fg: Rgb; bg: Rgb } {
  const normalized = (level || '').toLowerCase()
  if (normalized === 'critical') return { fg: COLORS.red, bg: COLORS.redSoft }
  if (normalized === 'high') return { fg: COLORS.orange, bg: COLORS.orangeSoft }
  if (normalized === 'medium') return { fg: COLORS.amber, bg: COLORS.amberSoft }
  return { fg: COLORS.green, bg: COLORS.greenSoft }
}

function turnoverLabel(value: string | null | undefined): string {
  if (!hasValue(value)) return NA
  return TURNOVER_RANGES.find((range) => range.value === value)?.label ?? String(value)
}

function firstPolicy(recommendation: RecommendationOut) {
  return recommendation.policies[0]
}

function sortedRisks(scores: RiskScoreOut[]) {
  return [...scores].sort((a, b) => percent(b.score) - percent(a.score))
}

// Top contributing factors for a risk category — capped so one huge breakdown
// never blows a table row across most of a page.
function keyFactors(risk: RiskScoreOut, limit = 4): string {
  const keys = Object.keys(risk.factor_breakdown ?? {})
  if (!keys.length) return NA
  const shown = keys.slice(0, limit)
  const remaining = keys.length - shown.length
  return remaining > 0 ? `${shown.join(', ')} +${remaining} more` : shown.join(', ')
}

function reportDate(): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function makeReportId(): string {
  const stamp = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date())
    .split('/')
    .join('')
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RPT-${stamp}-${random}`
}

function addPageShell(doc: jsPDF, title: string, pageNumber: number) {
  setFill(doc, COLORS.surface)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('INSURETECH ADVISORY', MARGIN, 9)
  doc.text(title.toUpperCase(), PAGE_WIDTH - MARGIN, 9, { align: 'right' })
  setDraw(doc, COLORS.line)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, FOOTER_Y, PAGE_WIDTH - MARGIN, FOOTER_Y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, COLORS.muted)
  doc.text('Confidential — advisory support, not a substitute for policy wording', MARGIN, 291)
  doc.text(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN, 291, { align: 'right' })
}

function addPage(doc: jsPDF, title: string): number {
  doc.addPage('a4', 'portrait')
  const pageNumber = doc.getNumberOfPages()
  addPageShell(doc, title, pageNumber)
  return 22
}

function sectionTitle(doc: jsPDF, y: number, kicker: string, title: string): number {
  setText(doc, COLORS.teal)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(kicker.toUpperCase(), MARGIN, y)
  setText(doc, COLORS.ink)
  doc.setFontSize(18)
  doc.text(title, MARGIN, y + 8)
  return y + 18
}

function card(doc: jsPDF, x: number, y: number, w: number, h: number, fill: Rgb = COLORS.card) {
  setFill(doc, fill)
  setDraw(doc, COLORS.line)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')
}

function metricCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, note?: string): number {
  card(doc, x, y, w, 28)
  setText(doc, COLORS.muted)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text(label.toUpperCase(), x + 4, y + 7)
  setText(doc, COLORS.ink)
  doc.setFontSize(value.length > 15 ? 11 : 18)
  doc.text(value, x + 4, y + 17, { maxWidth: w - 8 })
  if (note) {
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(note, x + 4, y + 24, { maxWidth: w - 8 })
  }
  return y + 32
}

function badge(doc: jsPDF, x: number, y: number, text: string, level?: string): number {
  const colors = levelColors(level || text)
  const width = Math.max(19, doc.getTextWidth(text.toUpperCase()) + 7)
  setFill(doc, colors.bg)
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, 'F')
  setText(doc, colors.fg)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.text(text.toUpperCase(), x + width / 2, y + 4.8, { align: 'center' })
  return width
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { size?: number; color?: Rgb; bold?: boolean; lineHeight?: number } = {},
): number {
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
  doc.setFontSize(options.size ?? 9)
  setText(doc, options.color ?? COLORS.ink)
  const lines = doc.splitTextToSize(textOr(text), maxWidth) as string[]
  const lineHeight = options.lineHeight ?? 4.7
  doc.text(lines, x, y)
  return y + Math.max(1, lines.length) * lineHeight
}

// Bulleted list (used for key benefits / limitations). Returns the new y.
function writeCapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
  options: { size?: number; color?: Rgb; lineHeight?: number } = {},
): { nextY: number; lines: string[] } {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(options.size ?? 7.5)
  let lines = doc.splitTextToSize(textOr(text), maxWidth) as string[]
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    const last = lines[maxLines - 1]
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, -1)}…` : `${last}…`
  }
  setText(doc, options.color ?? COLORS.ink)
  const lineHeight = options.lineHeight ?? 3.8
  doc.text(lines, x, y)
  return { nextY: y + lines.length * lineHeight, lines }
}

function bulletList(doc: jsPDF, items: string[], x: number, y: number, maxWidth: number, color: Rgb, size = 7.3): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  items.forEach((item) => {
    setText(doc, color)
    doc.text('•', x, y)
    const lines = doc.splitTextToSize(item, maxWidth - 5) as string[]
    setText(doc, COLORS.ink)
    doc.text(lines, x + 4, y)
    y += lines.length * 3.6 + 1.4
  })
  return y
}

function progressBar(doc: jsPDF, x: number, y: number, w: number, score: number, color: Rgb = COLORS.teal) {
  setFill(doc, [226, 232, 240])
  doc.roundedRect(x, y, w, 3.5, 1.7, 1.7, 'F')
  setFill(doc, color)
  doc.roundedRect(x, y, Math.max(2, (w * score) / 100), 3.5, 1.7, 1.7, 'F')
}

function table(
  doc: jsPDF,
  y: number,
  headers: string[],
  rows: string[][],
  widths: number[],
  title?: string,
): number {
  if (title) {
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title, MARGIN, y)
    y += 6
  }

  setFill(doc, COLORS.navy)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 9, 2, 2, 'F')
  let x = MARGIN
  setText(doc, [255, 255, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  headers.forEach((header, index) => {
    doc.text(header.toUpperCase(), x + 2, y + 5.8, { maxWidth: widths[index] - 4 })
    x += widths[index]
  })
  y += 9

  doc.setFont('helvetica', 'normal')
  rows.forEach((row, rowIndex) => {
    const wrappedCells = row.map((cell, index) => doc.splitTextToSize(textOr(cell), widths[index] - 4) as string[])
    const rowHeight = Math.max(9, ...wrappedCells.map((lines) => lines.length * 3.8 + 5))
    if (y + rowHeight > FOOTER_Y - 5) {
      y = addPage(doc, title || 'Table Continued')
      y = table(doc, y, headers, [], widths)
    }
    setFill(doc, rowIndex % 2 === 0 ? COLORS.card : [244, 247, 251])
    doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F')
    setDraw(doc, COLORS.line)
    doc.line(MARGIN, y + rowHeight, PAGE_WIDTH - MARGIN, y + rowHeight)
    x = MARGIN
    wrappedCells.forEach((lines, index) => {
      setText(doc, COLORS.ink)
      doc.setFontSize(7.5)
      doc.text(lines, x + 2, y + 5)
      x += widths[index]
    })
    y += rowHeight
  })
  return y + 5
}

// ---------- Page 1: Cover + business details + overall risk snapshot ----------
function drawCover(
  doc: jsPDF,
  data: RecommendationListOut,
  business: BusinessProfile | null,
  overallScore: number,
  generated: string,
  reportId: string,
) {
  setFill(doc, COLORS.navy)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F')
  setFill(doc, [16, 88, 91])
  doc.circle(178, 40, 46, 'F')
  setFill(doc, [20, 116, 112])
  doc.circle(190, 76, 28, 'F')

  setFill(doc, COLORS.teal)
  doc.roundedRect(MARGIN, 16, 12, 12, 3, 3, 'F')
  setText(doc, [255, 255, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('IT', MARGIN + 6, 23.8, { align: 'center' })
  doc.setFontSize(10)
  doc.text('INSURETECH ADVISORY', MARGIN + 16, 24)
  setDraw(doc, [255, 255, 255])
  doc.roundedRect(156, 17, 36, 9, 4.5, 4.5)
  doc.setFontSize(7)
  doc.text('CONFIDENTIAL', 174, 23, { align: 'center' })

  doc.setFontSize(26)
  doc.text(textOr(business?.business_name, 'Business Insurance'), MARGIN, 68, { maxWidth: 128 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Insurance Risk & Recommendation Report', MARGIN, 80)

  // Business details panel
  card(doc, MARGIN, 100, 112, 138, [18, 48, 70])
  setText(doc, [255, 255, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('BUSINESS DETAILS', MARGIN + 6, 112)

  const detailRows: [string, string][] = [
    ['Business Name', textOr(business?.business_name)],
    ['Industry', textOr(business?.industry?.name)],
    ['Segment', textOr(business?.segment?.name)],
    ['Location', [business?.city, business?.state].filter(hasValue).join(', ') || NA],
    ['Address', textOr(business?.address)],
    ['Year Established', textOr(business?.year_established)],
    ['Employee Count', textOr(business?.employee_count)],
    ['Annual Turnover', turnoverLabel(business?.annual_turnover_range)],
  ]
  let dy = 121
  detailRows.forEach(([label, value]) => {
    setText(doc, [177, 196, 216])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.text(label.toUpperCase(), MARGIN + 6, dy)
    setText(doc, [255, 255, 255])
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.3)
    const lines = doc.splitTextToSize(value, 100) as string[]
    doc.text(lines, MARGIN + 6, dy + 5)
    dy += 5 + lines.length * 4 + 3.5
  })

  // Risk score panel
  card(doc, 134, 100, 62, 66, [18, 48, 70])
  setText(doc, [177, 196, 216])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('OVERALL RISK', 140, 112)
  setText(doc, [125, 211, 252])
  doc.setFontSize(30)
  doc.text(`${overallScore}%`, 140, 130)
  badge(doc, 140, 136, riskLabel(overallScore), riskLabel(overallScore))
  setText(doc, [177, 196, 216])
  doc.setFontSize(7)
  doc.text(`${data.scores.length} risk categories assessed`, 140, 158, { maxWidth: 52 })

  // Report reference panel
  card(doc, 134, 172, 62, 66, [18, 48, 70])
  setText(doc, [177, 196, 216])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('REPORT ID', 140, 184)
  setText(doc, [255, 255, 255])
  doc.setFontSize(8.5)
  doc.text(reportId, 140, 190)
  setText(doc, [177, 196, 216])
  doc.setFontSize(7)
  doc.text('GENERATED', 140, 200)
  setText(doc, [255, 255, 255])
  doc.setFontSize(8.5)
  doc.text(doc.splitTextToSize(generated, 52), 140, 206)
  setText(doc, [177, 196, 216])
  doc.setFontSize(7)
  doc.text('POLICIES RECOMMENDED', 140, 222)
  setText(doc, [255, 255, 255])
  doc.setFontSize(8.5)
  doc.text(`${data.recommendations.length}`, 140, 228)

  setDraw(doc, [79, 105, 130])
  doc.line(MARGIN, 280, PAGE_WIDTH - MARGIN, 280)
  setText(doc, [177, 196, 216])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Prepared for advisory review', MARGIN, 287)
  doc.text('Page 1', PAGE_WIDTH - MARGIN, 287, { align: 'right' })
}

// ---------- Page 2+: Risk factors — the chart and the "why" ----------
function drawRiskFactors(doc: jsPDF, scores: RiskScoreOut[], overallScore: number) {
  let y = addPage(doc, 'Risk Factors')
  y = sectionTitle(doc, y, 'Risk Factors', 'What is driving this business\u2019s risk')

  metricCard(doc, MARGIN, y, 54, 'Overall Risk Score', `${overallScore}%`, riskLabel(overallScore))
  card(doc, MARGIN + 60, y, 122, 28)
  writeWrapped(
    doc,
    'Each category below is scored from the profiling questionnaire. Higher scores mean that risk should be addressed first.',
    MARGIN + 65,
    y + 9,
    112,
    { size: 8.3, color: COLORS.muted },
  )
  y += 38

  // Horizontal bar chart of every risk category, sorted highest first.
  const risks = sortedRisks(scores)
  const chartHeight = Math.max(30, risks.length * 9 + 14)
  card(doc, MARGIN, y, CONTENT_WIDTH, chartHeight)
  setText(doc, COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Risk score by category', MARGIN + 5, y + 8)
  let chartY = y + 18
  risks.forEach((risk) => {
    const score = percent(risk.score)
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.3)
    doc.text(risk.risk_category_name, MARGIN + 5, chartY, { maxWidth: 52 })
    progressBar(doc, MARGIN + 60, chartY - 3, 100, score, levelColors(risk.risk_level).fg)
    setText(doc, COLORS.muted)
    doc.text(`${score}%`, MARGIN + 165, chartY)
    chartY += 9
  })
  y += chartHeight + 8

  // Table: category, score, level, and *why* it scored that way.
  table(
    doc,
    y,
    ['Risk Category', 'Score', 'Level', 'Why This Risk Was Flagged'],
    risks.map((risk) => [
      risk.risk_category_name,
      `${percent(risk.score)}%`,
      risk.risk_level || riskLabel(percent(risk.score)),
      keyFactors(risk),
    ]),
    [40, 18, 22, 102],
    'Risk detail',
  )
}

// ---------- Page 3+: Recommended policies — the match chart and the "why" ----------
function drawRecommendedPolicies(doc: jsPDF, recommendations: RecommendationOut[]) {
  let y = addPage(doc, 'Recommended Policies')
  y = sectionTitle(doc, y, 'Recommended Policies', 'What is recommended and why')

  // Mini match-score chart across all recommended policies.
  const chartHeight = Math.max(24, recommendations.length * 8 + 12)
  card(doc, MARGIN, y, CONTENT_WIDTH, chartHeight)
  setText(doc, COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Policy match overview', MARGIN + 5, y + 8)
  let chartY = y + 16
  recommendations.forEach((recommendation) => {
    const policy = firstPolicy(recommendation)
    const match = scorePercent(recommendation)
    const label = textOr(recommendation.policy_name || policy?.policy_name)
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(label, MARGIN + 5, chartY, { maxWidth: 62 })
    progressBar(doc, MARGIN + 70, chartY - 3, 90, match, levelColors(recommendation.priority).fg)
    setText(doc, COLORS.muted)
    doc.text(`${match}%`, MARGIN + 165, chartY)
    chartY += 8
  })
  y += chartHeight + 8

  recommendations.forEach((recommendation) => {
    const policy = firstPolicy(recommendation)
    const match = scorePercent(recommendation)
    const title = textOr(recommendation.policy_name || policy?.policy_name)
    const company = textOr(recommendation.company_name || policy?.insurer_name)
    const policyType = textOr(policy?.insurance_category_name)
    const coverageTotal = recommendation.coverage_match_total || recommendation.matched_risk_categories.length
    const coveragePct = coverageTotal ? Math.round((recommendation.coverage_match_count / coverageTotal) * 100) : 0
    const addresses = recommendation.matched_risk_categories.length
      ? recommendation.matched_risk_categories.join(', ')
      : NA
    const benefits = recommendation.key_benefits.slice(0, 3)
    const limitations = recommendation.important_limitations.slice(0, 2)
    const hasCoverageSummary = hasValue(recommendation.coverage_summary)

    // Pre-measure wrapped text so the card height fits the content exactly.
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const titleLines = doc.splitTextToSize(title, 150) as string[]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const addressLines = doc.splitTextToSize(addresses, CONTENT_WIDTH - 10) as string[]
    const whyLines = doc.splitTextToSize(
      textOr(recommendation.why_recommended, 'No recommendation summary available.'),
      CONTENT_WIDTH - 10,
    ) as string[]
    const summaryLineCount = hasCoverageSummary ? Math.min(2, (doc.splitTextToSize(recommendation.coverage_summary as string, CONTENT_WIDTH - 10) as string[]).length) : 0
    const benefitLines = benefits.reduce((sum, b) => sum + (doc.splitTextToSize(b, CONTENT_WIDTH - 15) as string[]).length, 0)
    const limitationLines = limitations.reduce((sum, l) => sum + (doc.splitTextToSize(l, CONTENT_WIDTH - 15) as string[]).length, 0)

    const height =
      12 + titleLines.length * 4.5 + 5 + addressLines.length * 3.6 + 6 +
      6 + whyLines.length * 3.8 + 3 +
      (hasCoverageSummary ? 6 + summaryLineCount * 3.8 + 3 : 0) +
      (benefits.length ? 6 + benefitLines * 3.8 + benefits.length * 1.4 : 0) +
      (limitations.length ? 6 + limitationLines * 3.8 + limitations.length * 1.4 : 0) + 6

    if (y + height > FOOTER_Y - 8) {
      y = addPage(doc, 'Recommended Policies')
    }

    card(doc, MARGIN, y, CONTENT_WIDTH, height)
    let cy = y + 10
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(titleLines, MARGIN + 5, cy)
    badge(doc, PAGE_WIDTH - MARGIN - 32, y + 6, recommendation.priority || 'Priority', recommendation.priority)
    cy += titleLines.length * 4.5

    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(`${company} — ${policyType}`, MARGIN + 5, cy, { maxWidth: 140 })
    cy += 6

    progressBar(doc, MARGIN + 5, cy - 3, 60, match)
    setText(doc, COLORS.muted)
    doc.setFontSize(7.2)
    doc.text(`Match ${match}%`, MARGIN + 70, cy)
    setText(doc, levelColors(recommendation.priority).fg)
    doc.setFont('helvetica', 'bold')
    doc.text(`Coverage Match ${recommendation.coverage_match_count}/${coverageTotal} (${coveragePct}%)`, MARGIN + 95, cy, { maxWidth: 90 })
    cy += 6.5

    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(addressLines, MARGIN + 5, cy, { maxWidth: CONTENT_WIDTH - 10 })
    cy += addressLines.length * 3.6 + 3

    setText(doc, COLORS.teal)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.3)
    doc.text('WHY RECOMMENDED', MARGIN + 5, cy)
    cy += 4.5
    cy = writeWrapped(
      doc,
      textOr(recommendation.why_recommended, 'No recommendation summary available.'),
      MARGIN + 5,
      cy,
      CONTENT_WIDTH - 10,
      { size: 7.5, color: COLORS.ink, lineHeight: 3.8 },
    ) + 2

    if (hasCoverageSummary) {
      setText(doc, COLORS.teal)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.3)
      doc.text('COVERAGE SUMMARY', MARGIN + 5, cy)
      cy += 4.5
      cy = writeCapped(doc, recommendation.coverage_summary as string, MARGIN + 5, cy, CONTENT_WIDTH - 10, 2, { size: 7.5, color: COLORS.ink, lineHeight: 3.8 }).nextY + 2
    }

    if (benefits.length) {
      setText(doc, COLORS.green)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.3)
      doc.text('KEY BENEFITS', MARGIN + 5, cy)
      cy += 4.2
      cy = bulletList(doc, benefits, MARGIN + 6, cy, CONTENT_WIDTH - 12, COLORS.green) + 1
    }

    if (limitations.length) {
      setText(doc, COLORS.amber)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.3)
      doc.text('LIMITATIONS TO NOTE', MARGIN + 5, cy)
      cy += 4.2
      bulletList(doc, limitations, MARGIN + 6, cy, CONTENT_WIDTH - 12, COLORS.amber)
    }

    y += height + 6
  })
}

export async function downloadRecommendationReportPdf(
  data: RecommendationListOut,
  business: BusinessProfile | null = null,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const overallScore = data.scores.length
    ? Math.round(data.scores.reduce((sum, risk) => sum + percent(risk.score), 0) / data.scores.length)
    : 0
  const generated = reportDate()
  const reportId = makeReportId()

  drawCover(doc, data, business, overallScore, generated, reportId)
  drawRiskFactors(doc, data.scores, overallScore)
  drawRecommendedPolicies(doc, data.recommendations)

  const namePart = business?.business_name ? safeId(business.business_name).toLowerCase() : 'business'
  const datePart = new Intl.DateTimeFormat('en-CA').format(new Date()) // YYYY-MM-DD, no internal IDs
  doc.save(`insurance-advisory-report-${namePart}-${datePart}.pdf`)
}
