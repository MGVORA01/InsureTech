export const PROFILING_ENDPOINTS = {
  status: '/profiling/status',
  start: '/profiling/start',
  sessionState: (id: string) => `/profiling/session/${id}`,
  submitAnswer: (id: string) => `/profiling/session/${id}/answer`,
  complete: (id: string) => `/profiling/session/${id}/complete`,
} as const

export const SECTIONS_ORDER = [
  'business_profile',
  'premises_building',
  'assets_stock',
  'machinery_operations',
  'safety_security',
  'claims_history',
  'transit_logistics'
] as const

export const SECTION_LABELS: Record<string, string> = {
  business_profile: 'Business Profile',
  premises_building: 'Premises & Building',
  assets_stock: 'Assets & Stock',
  machinery_operations: 'Machinery & Operations',
  safety_security: 'Safety & Security',
  claims_history: 'Claims History',
  transit_logistics: 'Transit & Logistics'
}

export const PROFILING_MESSAGES = {
  startSuccess: 'Profiling session started',
  resumeSuccess: 'Resumed profiling session',
  answerSuccess: 'Answer saved',
  completeSuccess: 'Profiling completed successfully',
  genericError: 'Something went wrong. Please try again.',
  fetchStatusError: 'Failed to check profiling status',
  loadQuestionError: 'Failed to load questions',
  submitError: 'Failed to save answer',
  completeError: 'Failed to complete profiling',
  noProfile: 'Complete your business profile to start risk profiling',
  startButton: 'Start Profiling',
  resumeButton: 'Resume Session',
  viewResultsButton: 'View Results',
  nextButton: 'Next',
  backButton: 'Back',
  finishButton: 'Finish',
  requiredField: 'Please answer this question',
  noQuestions: 'No questions for this section',
}

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
}
