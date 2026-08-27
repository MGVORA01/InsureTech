export interface RiskAdvisoryReport {
  report_id: string
  session_id: string
  report_type: string
  status: string
  generated_at: string
  file_url: string | null
  business: {
    id: string
    business_name: string
    industry: string | null
    segment: string | null
    city: string | null
    state: string | null
    employee_count: number | null
    annual_turnover_range: string | null
  }
  executive_summary: string
  risk_scores: Array<{
    risk_category_name: string
    score: number
    risk_level: string
    risk_factors: Array<{ name: string; score: number }>
  }>
  recommended_policies: Array<{
    company_name: string | null
    policy_id: string | null
    policy_name: string | null
    recommendation_score: number | null
    matched_risk_categories: string[]
    why_recommended: string | null
    coverage_summary: string | null
    key_benefits: string[]
    important_limitations: string[]
    coverage_highlights: string[]
  }>
  next_steps: string[]
  metadata: Record<string, unknown>
}
