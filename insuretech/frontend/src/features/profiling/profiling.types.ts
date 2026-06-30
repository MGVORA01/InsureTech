export interface OptionItem {
  label: string
  value: string
}

export interface QuestionOut {
  id: string
  unified_id: string
  question_text: string
  section: string
  question_type: string
  options: OptionItem[] | null
  applicable_segment: string
  is_conditional: boolean
  parent_question_id: string | null
  parent_answer_value: string | null
  tier: number
  order_index: number
  is_active: boolean
}

export interface Tier2QuestionOut {
  question: QuestionOut
  risk_category_name: string
  factor_name: string
  current_risk_level: string
}

export interface PreviewScoreOut {
  risk_category_name: string
  score: number
  risk_level: string
  factor_breakdown: Record<string, number> | null
  has_tier2_questions: boolean
}

export interface PreviewScoresOut {
  scores: PreviewScoreOut[]
  has_high_risk: boolean
}

export interface Tier2QuestionsResponse {
  questions: Tier2QuestionOut[]
}

export type ProfilingPhase = 'tier1' | 'preview' | 'tier2' | 'complete'

export interface ProfilingSessionOut {
  id: string
  business_id: string
  status: string
  current_section: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SectionQuestionsOut {
  section: string
  section_index: number
  total_sections: number
  questions: QuestionOut[]
  answers: Record<string, string>
  session: ProfilingSessionOut
}

export interface RiskScoreOut {
  risk_category_name: string
  score: number
  risk_level: 'low' | 'medium' | 'high'
  factor_breakdown: Record<string, number> | null
}

export interface ProfilingCompleteOut {
  session: ProfilingSessionOut
  scores: RiskScoreOut[]
}

export interface ProfilingStatus {
  profiling_completed: boolean
  has_active_session: boolean
  session: ProfilingSessionOut | null
}

export interface SubmitAnswerPayload {
  question_id: string
  answer_value: string
  advance_to_section?: string
}

export interface SubmitAnswersBatchPayload {
  answers: { question_id: string; answer_value: string }[]
  advance_to_section?: string
}
