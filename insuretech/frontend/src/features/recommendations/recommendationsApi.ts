import baseApi from '../../api/baseApi'
import type {
  RecommendationDownloadOut,
  RecommendationListOut,
} from './recommendations.types'

interface ApiEnvelope<T> {
  success: boolean
  error?: string | null
  message?: string | null
  data: T
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

export async function getRecommendations(sessionId: string): Promise<RecommendationListOut> {
  const response = await baseApi.get<ApiEnvelope<RecommendationListOut>>(
    `/recommendations/${sessionId}`,
  )
  return unwrapData<RecommendationListOut>(response)
}

export async function generateRecommendations(sessionId: string): Promise<RecommendationListOut> {
  const response = await baseApi.post<ApiEnvelope<RecommendationListOut>>(
    `/recommendations/${sessionId}/generate`,
  )
  return unwrapData<RecommendationListOut>(response)
}

export async function getRecommendationPolicyDownload(
  sessionId: string,
  policyId: string,
): Promise<RecommendationDownloadOut> {
  const response = await baseApi.get<ApiEnvelope<RecommendationDownloadOut>>(
    `/recommendations/${sessionId}/policies/${policyId}/download`,
  )
  return unwrapData<RecommendationDownloadOut>(response)
}
