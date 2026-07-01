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

export interface RecommendationOut {
  priority: 'critical' | 'high' | 'medium' | 'low'
  risk_category_name: string
  risk_score: number
  risk_level: string
  policies: PolicyOut[]
}

export interface RiskScoreOut {
  risk_category_name: string
  score: number
  risk_level: string
  factor_breakdown: Record<string, number> | null
}

export interface RecommendationListOut {
  session_id: string
  scores: RiskScoreOut[]
  recommendations: RecommendationOut[]
}
