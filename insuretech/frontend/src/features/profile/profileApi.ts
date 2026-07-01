import axios, { type AxiosError } from 'axios'
import baseApi from '../../api/baseApi'
import type {
  BusinessProfile,
  CreateBusinessRequest,
  Industry,
  Segment,
} from './profile.types'
import { PROFILE_ENDPOINTS, PROFILE_MESSAGES } from './profile.constants'

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

export function getProfileErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    return (
      axiosError.response?.data?.error ??
      axiosError.response?.data?.message ??
      PROFILE_MESSAGES.genericError
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return PROFILE_MESSAGES.genericError
}

export const profileApi = {
  async getSegments(): Promise<Segment[]> {
    const response = await baseApi.get<ApiEnvelope<Segment[]>>(
      PROFILE_ENDPOINTS.segments,
    )
    return unwrapData<Segment[]>(response)
  },

  async getIndustries(segmentId: string): Promise<Industry[]> {
    const response = await baseApi.get<ApiEnvelope<Industry[]>>(
      PROFILE_ENDPOINTS.industries,
      { params: { segment_id: segmentId } },
    )
    return unwrapData<Industry[]>(response)
  },

  async createBusiness(payload: CreateBusinessRequest): Promise<BusinessProfile> {
    const response = await baseApi.post<ApiEnvelope<BusinessProfile>>(
      PROFILE_ENDPOINTS.businesses,
      payload,
    )
    return unwrapData<BusinessProfile>(response)
  },

  async getMyBusiness(): Promise<BusinessProfile> {
    const response = await baseApi.get<ApiEnvelope<BusinessProfile>>(
      PROFILE_ENDPOINTS.myBusiness,
    )
    return unwrapData<BusinessProfile>(response)
  },

  async getMyBusinesses(): Promise<BusinessProfile[]> {
    const response = await baseApi.get<ApiEnvelope<BusinessProfile[]>>(
      PROFILE_ENDPOINTS.myBusinesses,
    )
    return unwrapData<BusinessProfile[]>(response)
  },
}
