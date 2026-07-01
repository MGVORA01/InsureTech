export interface RiskScore {
  risk_category_id: string
  risk_category_name: string
  score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  factor_breakdown: Record<string, number>
}

export interface RiskScoresResponse {
  session_id: string
  scores: RiskScore[]
}
