import baseApi from '../../api/baseApi'
import type { APIResponse, ChatResponse, ChatRequest } from './chat.types'

export async function sendChatMessage(
  question: string,
  sessionId: string | null,
  history: { role: string; content: string }[] = [],
): Promise<ChatResponse> {
  const payload: ChatRequest = { question, session_id: sessionId, history }
  const res = await baseApi.post<APIResponse<ChatResponse>>('/chat', payload)
  const body = res.data

  if (!body.success || !body.data) {
    throw new Error(body.error ?? 'Failed to get answer')
  }

  return body.data
}
