import { jsPDF } from 'jspdf'
import type {
  RecommendationListOut,
  RecommendationOut,
  RiskScoreOut,
} from './recommendations.types'

// Extend the original type locally to include the missing fields for the cover page
export interface ExtendedRecommendationListOut extends RecommendationListOut {
  business_name?: string
  contact_name?: string
  industry_category?: string
}

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

function firstPolicy(recommendation: RecommendationOut) {
  return recommendation.policies[0]
}

function topRisks(scores: RiskScoreOut[], count = 5) {
  return [...scores].sort((a, b) => percent(b.score) - percent(a.score)).slice(0, count)
}

function keyFactors(risk: RiskScoreOut, limit = 4): string {
  const keys = Object.keys(risk.factor_breakdown ?? {})
  if (!keys.length) return NA
  const shown = keys.slice(0, limit)
  const remaining = keys.length - shown.length
  return remaining > 0 ? `${shown.join(', ')} +${remaining} more` : shown.join(', ')
}

function normalizeToken(name: string): string {
  return (name.split(/[^a-zA-Z]+/)[0] || '').toLowerCase()
}

function matchedRiskTokens(recommendations: RecommendationOut[]): Set<string> {
  return new Set(
    recommendations
      .flatMap((item) => item.matched_risk_categories.map(normalizeToken))
      .filter(Boolean),
  )
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

function makeTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace(/[^0-9]/g, '').slice(0, 14) // YYYYMMDDHHMMSS-ish
}

function makeReportIdFromName(businessName?: string): string {
  const namePart = safeId((businessName || 'report')).slice(0, 12).toUpperCase() || 'REPORT'
  return `REC-${namePart}-${makeTimestamp()}`
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
  doc.setFontSize(8)
  setText(doc, COLORS.muted)
  doc.text('Confidential — Insurance Advisory Report', MARGIN, 291)
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

function drawCover(doc: jsPDF, data: ExtendedRecommendationListOut, overallScore: number, generated: string, reportId: string) {
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

  doc.setFontSize(32)
  doc.text('Insurance Risk', MARGIN, 72)
  doc.text('Advisory Report', MARGIN, 86)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    doc.splitTextToSize(
      'A summary of risk exposure, ranked policy recommendations, coverage gaps, and next-step actions for this business.',
      118,
    ),
    MARGIN,
    99,
  )

  // Expanded report reference panel with added business details (no raw IDs)
  card(doc, MARGIN, 135, 112, 102, [18, 48, 70])

  const contactDisplay = data.contact_name
    ? `${textOr(data.contact_name)} — ${textOr(data.business_name, '')}`
    : textOr(data.business_name, 'Not Provided')

  const referenceRows: [string, string][] = [
    ['Business Name', textOr(data.business_name, 'Not Provided')],
    ['Business Person', contactDisplay],
    ['Industry Category', textOr(data.industry_category, 'Not Provided')],
    ['Report ID', reportId],
    ['Generated', generated],
  ]
  let y = 146
  referenceRows.forEach(([label, value]) => {
    setText(doc, [177, 196, 216])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(label.toUpperCase(), MARGIN + 6, y)
    setText(doc, [255, 255, 255])
    doc.setFontSize(8.5)
    doc.text(doc.splitTextToSize(value, 100), MARGIN + 6, y + 5)
    y += 15
  })

  // Risk Score Card
  card(doc, 134, 135, 62, 102, [18, 48, 70])
  setText(doc, [177, 196, 216])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('OVERALL RISK SCORE', 140, 155)
  setText(doc, [125, 211, 252])
  doc.setFontSize(34)
  doc.text(`${overallScore}%`, 140, 174)
  badge(doc, 140, 180, riskLabel(overallScore), riskLabel(overallScore))
  setText(doc, [177, 196, 216])
  doc.setFontSize(7)
  doc.text('BASED ON', 140, 205)
  setText(doc, [255, 255, 255])
  doc.setFontSize(8.5)
  doc.text(`${data.scores.length} risk categories`, 140, 211)

  setDraw(doc, [79, 105, 130])
  doc.line(MARGIN, 280, PAGE_WIDTH - MARGIN, 280)
  setText(doc, [177, 196, 216])
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Prepared for advisory review', MARGIN, 287)
  doc.text('Page 1', PAGE_WIDTH - MARGIN, 287, { align: 'right' })
}

function drawExecutiveSummary(doc: jsPDF, data: ExtendedRecommendationListOut, recommendations: RecommendationOut[], overallScore: number) {
  let y = addPage(doc, 'Executive Summary')
  y = sectionTitle(doc, y, 'Executive Summary', 'Overall advisory view')
  const risks = topRisks(data.scores, 5)

  const cardWidth = (CONTENT_WIDTH - 8) / 3
  metricCard(doc, MARGIN, y, cardWidth, 'Overall Risk', `${overallScore}%`, riskLabel(overallScore))
  metricCard(doc, MARGIN + cardWidth + 4, y, cardWidth, 'Risk Categories', `${data.scores.length}`, 'Assessed')
  metricCard(doc, MARGIN + (cardWidth + 4) * 2, y, cardWidth, 'Policies Shortlisted', `${recommendations.length}`, 'Top matches')
  y += 36

  card(doc, MARGIN, y, CONTENT_WIDTH, 26)
  y = writeWrapped(
    doc,
    `The leading risk areas for this business are ${risks.map((risk) => risk.risk_category_name).join(', ') || NA}. Policies below are ranked by match score and risk-category coverage.`,
    MARGIN + 5,
    y + 8,
    CONTENT_WIDTH - 10,
    { size: 9, color: COLORS.ink, lineHeight: 4.8 },
  ) + 6

  const colWidth = (CONTENT_WIDTH - 4) / 2

  // Left Card: Top Risks
  card(doc, MARGIN, y, colWidth, 92)
  setText(doc, COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Top risk categories', MARGIN + 5, y + 8)
  let ry = y + 16
  risks.forEach((risk) => {
    const score = percent(risk.score)
    const lines = doc.splitTextToSize(risk.risk_category_name, 40) as string[]

    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(lines, MARGIN + 5, ry)

    const blockHeight = lines.length * 3.5
    const barY = ry + (blockHeight / 2) - 3

    progressBar(doc, MARGIN + 48, barY, 24, score)
    setText(doc, COLORS.muted)
    doc.text(`${score}%`, MARGIN + 74, barY + 3)
    ry += Math.max(13, blockHeight + 6) // Ensures proper spacing for multi-line risk text
  })

  // Right Card: Top Recommended Policies
  card(doc, MARGIN + colWidth + 4, y, colWidth, 92)
  setText(doc, COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Top recommended policies', MARGIN + colWidth + 9, y + 8)
  let py = y + 18
  recommendations.slice(0, 5).forEach((recommendation, index) => {
    const policy = firstPolicy(recommendation)
    py = writeWrapped(
      doc,
      `${index + 1}. ${textOr(recommendation.policy_name || policy?.policy_name)}`,
      MARGIN + colWidth + 9,
      py,
      colWidth - 14,
      { size: 7.6, color: COLORS.ink, lineHeight: 3.8 },
    ) + 3.5 // Added extra buffer so wrapped lines don't crash into each other
  })
}

function drawRiskAssessment(doc: jsPDF, scores: RiskScoreOut[], overallScore: number) {
  let y = addPage(doc, 'Risk Assessment')
  y = sectionTitle(doc, y, 'Risk Assessment', 'Scores and key risk drivers')

  metricCard(doc, MARGIN, y, 54, 'Overall Risk Score', `${overallScore}%`, riskLabel(overallScore))
  card(doc, MARGIN + 60, y, 122, 28)
  writeWrapped(
    doc,
    'Higher scores indicate categories that should be reviewed earlier when selecting coverage and operational controls.',
    MARGIN + 65,
    y + 9,
    112,
    { size: 8.5, color: COLORS.muted },
  )
  y += 38

  card(doc, MARGIN, y, CONTENT_WIDTH, 66)
  setText(doc, COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Risk score chart', MARGIN + 5, y + 8)
  let chartY = y + 18
  topRisks(scores, 6).forEach((risk) => {
    const score = percent(risk.score)
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(risk.risk_category_name, MARGIN + 5, chartY, { maxWidth: 48 })
    progressBar(doc, MARGIN + 58, chartY - 3, 96, score, levelColors(risk.risk_level).fg)
    setText(doc, COLORS.muted)
    doc.text(`${score}%`, MARGIN + 160, chartY)
    chartY += 8
  })
  y += 76

  table(
    doc,
    y,
    ['Risk Category', 'Score', 'Level', 'Key Risk Factors'],
    scores.map((risk) => [
      risk.risk_category_name,
      `${percent(risk.score)}%`,
      risk.risk_level || riskLabel(percent(risk.score)),
      keyFactors(risk),
    ]),
    [45, 20, 25, 92],
    'Risk detail table',
  )
}

function drawRecommendationPages(doc: jsPDF, recommendations: RecommendationOut[]) {
  let y = addPage(doc, 'Top 5 Recommendations')
  y = sectionTitle(doc, y, 'Top 5 Insurance Recommendations', 'Ranked policy shortlist')

  recommendations.slice(0, 5).forEach((recommendation, index) => {
    const policy = firstPolicy(recommendation)
    const match = scorePercent(recommendation)
    const title = textOr(recommendation.policy_name || policy?.policy_name)
    const company = textOr(recommendation.company_name || policy?.insurer_name)
    const policyType = textOr(policy?.insurance_category_name)

    // Dynamically calculate the height needed for this specific recommendation card
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const titleLines = doc.splitTextToSize(title, 110) as string[]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    const subLines = doc.splitTextToSize(`${company} — ${policyType}`, 110) as string[]
    const descLines = doc.splitTextToSize(textOr(recommendation.why_recommended, 'No recommendation summary available.'), CONTENT_WIDTH - 10) as string[]

    const estimatedHeight = 12 + (titleLines.length * 4.5) + (subLines.length * 3.8) + 14 + (descLines.length * 3.8) + 8

    if (y + estimatedHeight > FOOTER_Y - 8) {
      y = addPage(doc, 'Top 5 Recommendations')
    }

    card(doc, MARGIN, y, CONTENT_WIDTH, estimatedHeight)

    // Number Label
    setFill(doc, COLORS.navy)
    doc.roundedRect(MARGIN + 4, y + 5, 10, 10, 2, 2, 'F')
    setText(doc, [255, 255, 255])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(`${index + 1}`, MARGIN + 9, y + 11.5, { align: 'center' })

    let currentY = y + 9

    // Recommendation Title
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(titleLines, MARGIN + 18, currentY)
    currentY += titleLines.length * 4.5

    // Subtitle (Company & Policy Type)
    setText(doc, COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(subLines, MARGIN + 18, currentY)
    currentY += subLines.length * 3.8 + 4

    // Priority Badge
    badge(doc, PAGE_WIDTH - MARGIN - 32, y + 6, recommendation.priority || 'Priority', recommendation.priority)

    // Progress bar and score text positioned dynamically below the titles
    progressBar(doc, MARGIN + 18, currentY - 3, 76, match)
    setText(doc, COLORS.muted)
    doc.setFontSize(7.2)
    doc.text(`Match ${match}%  |  Coverage ${recommendation.coverage_match_count}/${recommendation.coverage_match_total} risk categories`, MARGIN + 98, currentY, { maxWidth: 78 })
    currentY += 8

    // Description text
    writeWrapped(
      doc,
      textOr(recommendation.why_recommended, 'No recommendation summary available.'),
      MARGIN + 5,
      currentY,
      CONTENT_WIDTH - 10,
      { size: 7.5, color: COLORS.ink, lineHeight: 3.8 },
    )

    y += estimatedHeight + 6
  })
}

function drawComparisonAndGaps(doc: jsPDF, data: ExtendedRecommendationListOut, recommendations: RecommendationOut[]) {
  let y = addPage(doc, 'Policy Comparison')
  y = sectionTitle(doc, y, 'Policy Comparison Table', 'Coverage fit comparison')
  y = table(
    doc,
    y,
    ['Rank', 'Company', 'Policy', 'Type', 'Match', 'Coverage', 'Priority'],
    recommendations.slice(0, 5).map((recommendation, index) => {
      const policy = firstPolicy(recommendation)
      return [
        `${index + 1}`,
        textOr(recommendation.company_name || policy?.insurer_name),
        textOr(recommendation.policy_name || policy?.policy_name),
        textOr(policy?.insurance_category_name),
        `${scorePercent(recommendation)}%`,
        `${recommendation.coverage_match_count}/${recommendation.coverage_match_total}`,
        textOr(recommendation.priority),
      ]
    }),
    [12, 32, 48, 30, 18, 22, 20],
  )

  const matchedTokens = matchedRiskTokens(recommendations)
  const gaps = data.scores.filter((risk) => !matchedTokens.has(normalizeToken(risk.risk_category_name)))
  const covered = data.scores.length - gaps.length

  y = sectionTitle(doc, y + 4, 'Coverage Gap Analysis', 'Categories not explicitly matched by the shortlist')
  const cardWidth = (CONTENT_WIDTH - 8) / 3
  metricCard(doc, MARGIN, y, cardWidth, 'Covered Risks', `${covered}`)
  metricCard(doc, MARGIN + cardWidth + 4, y, cardWidth, 'Potential Gaps', `${gaps.length}`)
  metricCard(doc, MARGIN + (cardWidth + 4) * 2, y, cardWidth, 'Policy Shortlist', `${recommendations.length}`)
  y += 36
  table(
    doc,
    y,
    ['Gap Area', 'Suggested Review'],
    gaps.length
      ? gaps.map((risk) => [risk.risk_category_name, 'Ask an advisor to confirm coverage need, limits, and exclusions for this category.'])
      : [['No unmatched risk categories', 'All assessed risk categories are addressed by the top policy shortlist.']],
    [70, 112],
  )
}

function drawActionPlan(doc: jsPDF) {
  let y = addPage(doc, 'Action Plan')
  y = sectionTitle(doc, y, 'Action Plan', 'Immediate, 30 days, 90 days, 6 months')
  const steps = [
    ['Immediate', 'Review top risks and confirm whether current policies address them.'],
    ['30 Days', 'Compare the top recommended policies and request formal premium quotes.'],
    ['90 Days', 'Close coverage gaps, update risk controls, and collect required documents.'],
    ['6 Months', 'Re-run the assessment after any operational or insurance changes.'],
  ]
  const stepWidth = (CONTENT_WIDTH - 12) / 4
  steps.forEach(([title, note], index) => {
    const x = MARGIN + index * (stepWidth + 4)
    card(doc, x, y, stepWidth, 52)
    setFill(doc, COLORS.teal)
    doc.rect(x, y, stepWidth, 3, 'F')
    setText(doc, COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(title, x + 4, y + 12)
    writeWrapped(doc, note, x + 4, y + 21, stepWidth - 8, { size: 7.8, color: COLORS.muted, lineHeight: 4 })
  })
}

function drawDisclaimer(doc: jsPDF, data: ExtendedRecommendationListOut, generated: string, reportId: string) {
  let y = addPage(doc, 'Disclaimer')
  y = sectionTitle(doc, y, 'Disclaimer & Report Information', 'Important report notes')
  card(doc, MARGIN, y, CONTENT_WIDTH, 34)
  y = writeWrapped(
    doc,
    'This report is generated from the current recommendation data and is intended for advisory decision support. It does not replace insurer underwriting, policy wording, schedules, endorsements, exclusions, or professional insurance advice.',
    MARGIN + 5,
    y + 9,
    CONTENT_WIDTH - 10,
    { size: 9, color: COLORS.ink },
  ) + 10

  table(
    doc,
    y,
    ['Field', 'Value'],
    [
      ['Report ID', reportId],
      ['Generated Date', generated],
    ],
    [55, 127],
    'Report information',
  )
}

export async function downloadRecommendationReportPdf(data: ExtendedRecommendationListOut): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const recommendations = data.recommendations.slice(0, 5)
  const overallScore = data.scores.length
    ? Math.round(data.scores.reduce((sum, risk) => sum + percent(risk.score), 0) / data.scores.length)
    : 0
  const generated = reportDate()
  const reportId = makeReportIdFromName(data.business_name)

  drawCover(doc, data, overallScore, generated, reportId)
  drawExecutiveSummary(doc, data, recommendations, overallScore)
  drawRiskAssessment(doc, data.scores, overallScore)
  drawRecommendationPages(doc, recommendations)
  drawComparisonAndGaps(doc, data, recommendations)
  drawActionPlan(doc)
  drawDisclaimer(doc, data, generated, reportId)

  doc.save(`recommendation-report-${safeId(data.business_name || 'report')}-${makeTimestamp()}.pdf`)
}
