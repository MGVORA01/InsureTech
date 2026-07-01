import axios, { type AxiosError } from 'axios'
import baseApi from '../../api/baseApi'
import { PROFILING_MESSAGES } from './profiling.constants'
import type {
  PreviewScoresOut,
  ProfilingCompleteOut,
  ProfilingStatus,
  SectionQuestionsOut,
  SubmitAnswerPayload,
  SubmitAnswersBatchPayload,
  Tier2QuestionsResponse,
} from './profiling.types'

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

  if (
    body &&
    typeof body === 'object' &&
    'data' in body &&
    body.data !== null &&
    body.data !== undefined
  ) {
    return body.data as T
  }

  return body as T
}

export function getProfilingErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return (
      axiosError.response?.data?.error ??
      axiosError.response?.data?.message ??
      PROFILING_MESSAGES.genericError
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return PROFILING_MESSAGES.genericError
}

export const profilingApi = {
  async getStatus(businessId?: string): Promise<ProfilingStatus> {
    const params = businessId ? { business_id: businessId } : undefined
    const response = await baseApi.get<ApiEnvelope<ProfilingStatus>>(
      '/profiling/status',
      { params },
    )
    return unwrapData<ProfilingStatus>(response)
  },

  async startSession(tier?: number, businessId?: string): Promise<SectionQuestionsOut> {
    const params: Record<string, string | number> = {}
    if (tier !== undefined) params.tier = tier
    if (businessId) params.business_id = businessId
    const response = await baseApi.post<ApiEnvelope<SectionQuestionsOut>>(
      '/profiling/start',
      undefined,
      { params },
    )
    return unwrapData<SectionQuestionsOut>(response)
  },

  async getSessionState(
    sessionId: string,
    section?: string,
    tier?: number,
  ): Promise<SectionQuestionsOut> {
    const params: Record<string, string | number> = {}
    if (section) params.section = section
    if (tier !== undefined) params.tier = tier
    const response = await baseApi.get<ApiEnvelope<SectionQuestionsOut>>(
      `/profiling/session/${sessionId}`,
      { params },
    )
    return unwrapData<SectionQuestionsOut>(response)
  },

  async submitAnswer(
    sessionId: string,
    payload: SubmitAnswerPayload,
  ): Promise<SectionQuestionsOut> {
    const response = await baseApi.post<ApiEnvelope<SectionQuestionsOut>>(
      `/profiling/session/${sessionId}/answer`,
      payload,
    )
    return unwrapData<SectionQuestionsOut>(response)
  },

  async submitAnswersBatch(
    sessionId: string,
    payload: SubmitAnswersBatchPayload,
  ): Promise<SectionQuestionsOut> {
    const response = await baseApi.post<ApiEnvelope<SectionQuestionsOut>>(
      `/profiling/session/${sessionId}/answers/batch`,
      payload,
    )
    return unwrapData<SectionQuestionsOut>(response)
  },

  async previewScores(sessionId: string): Promise<PreviewScoresOut> {
    const response = await baseApi.post<ApiEnvelope<PreviewScoresOut>>(
      `/profiling/session/${sessionId}/preview-scores`,
    )
    return unwrapData<PreviewScoresOut>(response)
  },

  async getTier2Questions(sessionId: string): Promise<Tier2QuestionsResponse> {
    const response = await baseApi.post<ApiEnvelope<Tier2QuestionsResponse>>(
      `/profiling/session/${sessionId}/tier2-questions`,
    )
    return unwrapData<Tier2QuestionsResponse>(response)
  },

  async completeSession(
    sessionId: string,
  ): Promise<ProfilingCompleteOut> {
    const response = await baseApi.post<ApiEnvelope<ProfilingCompleteOut>>(
      `/profiling/session/${sessionId}/complete`,
    )
    return unwrapData<ProfilingCompleteOut>(response)
  },
}
