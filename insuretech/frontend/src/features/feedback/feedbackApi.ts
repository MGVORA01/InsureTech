import axios, { type AxiosError } from 'axios'
import baseApi from '../../api/baseApi'
import type { CreateFeedbackPayload, FeedbackResponse } from './feedback.types'
import { FEEDBACK_MESSAGES } from './feedback.constants'

interface ApiEnvelope<T> {
  success: boolean
  error?: string | null
  message?: string | null
  data: T
}

interface ApiErrorResponse {
  error?: string | null
  message?: string | null
  success?: boolean
}

function unwrapData<T>(response: { data: ApiEnvelope<T> | T }): T {
  const body = response.data
  if (body && typeof body === 'object' && 'data' in body && body.data !== null && body.data !== undefined) {
    return body.data as T
  }
  return body as T
}

export function getFeedbackErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return (
      axiosError.response?.data?.error ??
      axiosError.response?.data?.message ??
      FEEDBACK_MESSAGES.submitError
    )
  }
  if (error instanceof Error) return error.message
  return FEEDBACK_MESSAGES.submitError
}

export const feedbackApi = {
  async createFeedback(payload: CreateFeedbackPayload, businessId?: string): Promise<FeedbackResponse> {
    const params = businessId ? { business_id: businessId } : undefined
    const response = await baseApi.post<ApiEnvelope<FeedbackResponse>>('/feedback', payload, { params })
    return unwrapData<FeedbackResponse>(response)
  },

  async getBusinessFeedbacks(businessId?: string): Promise<FeedbackResponse[]> {
    const params = businessId ? { business_id: businessId } : undefined
    const response = await baseApi.get<ApiEnvelope<FeedbackResponse[]>>('/feedback', { params })
    return unwrapData<FeedbackResponse[]>(response)
  },
}
