import baseApi from '../../config/api'
import type { APIResponse, ChatResponse, ChatRequest } from './chat.types'
import axios from 'axios'

export async function sendChatMessage(
  question: string,
  sessionId: string | null,
  history: { role: string; content: string }[] = [],
): Promise<ChatResponse> {
  const payload: ChatRequest = { question, session_id: sessionId, history }

  try {
    const res = await baseApi.post<APIResponse<ChatResponse>>('/chat', payload)
    const body = res.data

    if (!body.success || !body.data) {
      throw new Error(body.error ?? 'Failed to get answer')
    }

    return body.data
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const serverMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.detail
      if (serverMsg) {
        throw new Error(String(serverMsg))
      }
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        throw new Error(
          'Unable to reach the server. Please check your connection or try again later.',
        )
      }
      if (err.response?.status === 503 || err.response?.status === 502) {
        throw new Error(
          'The AI service is temporarily unavailable. Please try again in a moment.',
        )
      }
      if (err.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.')
      }
    }
    if (err instanceof Error) throw err
    throw new Error('Something went wrong. Please try again.')
  }
}
