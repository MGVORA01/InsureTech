export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export interface ChatRequest {
  question: string
  session_id: string | null
  history: { role: string; content: string }[]
}

export interface ChatResponse {
  answer: string
  session_id: string
  sources: string[]
}

export interface APIResponse<T> {
  success: boolean
  error: string | null
  message: string | null
  data: T | null
}
