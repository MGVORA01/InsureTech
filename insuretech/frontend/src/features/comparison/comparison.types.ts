export interface CompareRequest {
  business_profile_id: string
  policy_id_a: string
  policy_id_b: string
  session_id?: string
}

export interface ComparisonItem {
  category: string
  policy_a_value: string
  policy_b_value: string
  stronger: 'a' | 'b' | 'equal' | 'insufficient_evidence'
  evidence: string
  confidence: 'high' | 'medium' | 'low'
}

export interface CompareResponse {
  executive_summary: string
  comparisons: ComparisonItem[]
  coverage_gap_analysis: string
  business_risk_alignment: string
  advantages_a: string[]
  advantages_b: string[]
  limitations_a: string[]
  limitations_b: string[]
  overall_recommendation: string
  missing_information: string[]
  overall_confidence: 'high' | 'medium' | 'low'
}

export interface CompareChatRequest {
  business_profile_id: string
  policy_id_a: string
  policy_id_b: string
  session_id?: string
  query: string
  history: { role: string; content: string }[]
  top_k?: number
}

export interface SourceRef {
  policy_label: 'A' | 'B'
  text: string
  section_name: string
}

export interface CompareChatResponse {
  answer: string
  sources: SourceRef[]
}

export interface ApiResponse<T> {
  success: boolean
  error: string | null
  message: string | null
  data: T | null
}
