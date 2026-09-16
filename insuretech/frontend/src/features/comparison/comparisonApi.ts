import baseApi from '../../config/api'
import type {
  BusinessRiskAlignmentItem,
  CompareRequest,
  CompareResponse,
  CoverageGapAnalysis,
  CompareChatRequest,
  CompareChatResponse,
  ApiResponse,
} from './comparison.types'

const UNAVAILABLE_TEXT = 'Information not available in the selected policies.'

function normalizePoint(text: string): string {
  let cleaned = (text || '').trim()
  cleaned = cleaned.replace(/^[\s•\-*▪▸►]+/g, '')
  cleaned = cleaned.replace(/^\s*(?:\(?\d+[.)]\s*)+(?:\(?[a-zA-Z]{1,3}[.)]\s*)*/i, '')
  cleaned = cleaned.replace(/^\s*\(?[a-zA-Z]{1,3}[.)]\s*/i, '')
  cleaned = cleaned.replace(/^\s*\(?[ivxIVX]+[.)]\s*/, '')
  cleaned = cleaned.replace(/[\s.]*(?:\.\.\.|…)+$/g, '').trim()
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()
  if (!cleaned) return ''
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  if (!/[.!?:]$/.test(cleaned)) cleaned += '.'
  return cleaned
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizePoint(String(item))).filter(Boolean)
    return items.length ? [...new Set(items)] : [UNAVAILABLE_TEXT]
  }
  if (typeof value === 'string') {
    const parts = value
      .split(/\n+/)
      .map((part) => normalizePoint(part))
      .filter(Boolean)
    return parts.length ? [...new Set(parts)] : [UNAVAILABLE_TEXT]
  }
  return [UNAVAILABLE_TEXT]
}

function normalizeCoverageGap(value: unknown): CoverageGapAnalysis {
  const input = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    covered_by_both: toArray(input.covered_by_both),
    covered_only_by_a: toArray(input.covered_only_by_a),
    covered_only_by_b: toArray(input.covered_only_by_b),
    covered_by_neither: toArray(input.covered_by_neither),
  }
}

function normalizeBusinessRiskAlignment(value: unknown): BusinessRiskAlignmentItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      return {
        risk_category: String(row.risk_category || '').trim() || 'Business Risk',
        risk_level: String(row.risk_level || '').trim() || 'Not specified',
        policy_a: toArray(row.policy_a)[0],
        policy_b: toArray(row.policy_b)[0],
      }
    })
    .filter((item): item is BusinessRiskAlignmentItem => Boolean(item))
}

function normalizeCompareResponse(data: CompareResponse): CompareResponse {
  const safe = ((data || {}) as unknown) as Record<string, unknown>
  const comparisons = Array.isArray(safe.comparisons) ? safe.comparisons : []
  return {
    executive_summary: toArray(safe.executive_summary).slice(0, 2),
    comparisons: comparisons.map((item) => {
      const row = (item || {}) as Record<string, unknown>
      return {
        category: String(row.category || ''),
        policy_a_value: toArray(row.policy_a_value),
        policy_b_value: toArray(row.policy_b_value),
        stronger: (['a', 'b', 'equal', 'insufficient_evidence'].includes(String(row.stronger))
          ? row.stronger
          : 'insufficient_evidence') as 'a' | 'b' | 'equal' | 'insufficient_evidence',
        evidence: String(row.evidence || UNAVAILABLE_TEXT),
        confidence: (['high', 'medium', 'low'].includes(String(row.confidence))
          ? row.confidence
          : 'low') as 'high' | 'medium' | 'low',
      }
    }),
    coverage_gap_analysis: normalizeCoverageGap(safe.coverage_gap_analysis),
    business_risk_alignment: normalizeBusinessRiskAlignment(safe.business_risk_alignment),
    advantages_a: toArray(safe.advantages_a).slice(0, 4),
    advantages_b: toArray(safe.advantages_b).slice(0, 4),
    limitations_a: toArray(safe.limitations_a).slice(0, 4),
    limitations_b: toArray(safe.limitations_b).slice(0, 4),
    overall_recommendation: toArray(safe.overall_recommendation).slice(0, 3),
    missing_information: toArray(safe.missing_information).slice(0, 10),
    overall_confidence: (['high', 'medium', 'low'].includes(String(safe.overall_confidence))
      ? safe.overall_confidence
      : 'low') as 'high' | 'medium' | 'low',
  }
}

export async function comparePolicies(data: CompareRequest): Promise<CompareResponse> {
  const res = await baseApi.post<ApiResponse<CompareResponse>>('/compare', data)
  if (!res.data.data) throw new Error(res.data.error ?? 'Failed to compare policies')
  return normalizeCompareResponse(res.data.data)
}

export async function compareChat(data: CompareChatRequest): Promise<CompareChatResponse> {
  const res = await baseApi.post<ApiResponse<CompareChatResponse>>('/compare/chat', data)
  if (!res.data.data) throw new Error(res.data.error ?? 'Failed to get chat response')
  return res.data.data
}
