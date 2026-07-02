import baseApi from '../../api/baseApi'
import type {
  CompareRequest,
  CompareResponse,
  CompareChatRequest,
  CompareChatResponse,
  ApiResponse,
} from './comparison.types'

export async function comparePolicies(data: CompareRequest): Promise<CompareResponse> {
  const res = await baseApi.post<ApiResponse<CompareResponse>>('/compare', data)
  if (!res.data.data) throw new Error(res.data.error ?? 'Failed to compare policies')
  return res.data.data
}

export async function compareChat(data: CompareChatRequest): Promise<CompareChatResponse> {
  const res = await baseApi.post<ApiResponse<CompareChatResponse>>('/compare/chat', data)
  if (!res.data.data) throw new Error(res.data.error ?? 'Failed to get chat response')
  return res.data.data
}
