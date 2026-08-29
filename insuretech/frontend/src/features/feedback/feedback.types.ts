export interface CreateFeedbackPayload {
  message: string
  rating: number
  recommendations_helpful?: 'very_useful' | 'useful' | 'neutral' | 'not_useful'
}

export interface FeedbackResponse {
  id: string
  user_id: string
  business_id: string
  message: string
  rating: number
  recommendations_helpful: string | null
  status: string
  created_at: string
  updated_at: string | null
}

export interface AdminFeedbackItem {
  id: string
  userName: string
  userEmail: string
  response: string
  rating: number
  recommendationsHelpful: string | null
  submittedAt: string
}

export interface AdminFeedbackListResponse {
  feedbacks: AdminFeedbackItem[]
  total: number
  page: number
  limit: number
}
