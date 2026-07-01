import axios from 'axios'
import type { RiskScoresResponse } from './riskAssessment.types'

export async function fetchSessionScores(sessionId: string): Promise<RiskScoresResponse> {
  const res = await axios.get<{ data: RiskScoresResponse }>(
    `/api/v1/risk-assessment/scores/${sessionId}`,
    { withCredentials: true },
  )
  return res.data.data
}
