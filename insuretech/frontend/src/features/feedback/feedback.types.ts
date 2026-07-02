export interface CreateFeedbackPayload {
  message: string
  rating: number
  recommendations_helpful?: 'very_useful' | 'useful' | 'neutral' | 'not_useful'
}

export interface FeedbackResponse {
  id: string
  user_id: string
  message: string
  rating: number
  recommendations_helpful: string | null
  status: string
  created_at: string
  updated_at: string | null
}
