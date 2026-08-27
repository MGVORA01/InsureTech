export interface PolicyOut {
  id: string
  policy_name: string
  insurer_name: string
  insurer_logo_url: string | null
  insurance_category_name: string
  key_features: Record<string, unknown> | null
  min_sum_insured: number | null
  max_sum_insured: number | null
  target_segment: string | null
  pdf_url: string | null
  coverage_highlights: string[]
}

export interface SupportingChunkOut {
  chunk_id: string
  section_name: string | null
  section_type: string | null
  chunk_text: string
  matched_risk_categories: string[]
}

export interface RecommendationOut {
  priority: 'critical' | 'high' | 'medium' | 'low'
  risk_category_name: string
  risk_score: number
  risk_level: string
  policies: PolicyOut[]
  company_name: string | null
  policy_id: string | null
  policy_name: string | null
  recommendation_score: number | null
  coverage_match_count: number
  coverage_match_total: number
  matched_risk_categories: string[]
  additional_inclusions: string[]
  why_recommended: string | null
  coverage_summary: string | null
  key_benefits: string[]
  important_limitations: string[]
  coverage_highlights: string[]
  supporting_chunks: SupportingChunkOut[]
}

export interface RiskScoreOut {
  risk_category_name: string
  score: number
  risk_level: string
  factor_breakdown: Record<string, number> | null
}

export interface RecommendationListOut {
  session_id: string
  business_profile_id: string | null
  scores: RiskScoreOut[]
  recommendations: RecommendationOut[]
}

export interface RecommendationDownloadOut {
  policy_id: string
  file_name: string
  download_url: string
}
