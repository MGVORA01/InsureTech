import baseApi from '../../config/api'
import { API } from './policies.constants'
import type {
  ApiResponse,
  Insurer,
  InsuranceCategory,
  PolicyDetail,
  PaginatedPolicies,
  PolicyUploadResult,
} from './policies.types'

export async function fetchInsurers(): Promise<Insurer[]> {
  const res = await baseApi.get<ApiResponse<Insurer[]>>(API.INSURERS)
  return res.data.data ?? []
}

export async function createInsurer(data: { name: string; irdai_registration_no?: string; website?: string; logo_url?: string }): Promise<Insurer> {
  const res = await baseApi.post<ApiResponse<Insurer>>(API.INSURERS, data)
  if (!res.data.data) throw new Error('Failed to create insurer')
  return res.data.data
}

export async function updateInsurer(id: string, data: Partial<{ name: string; irdai_registration_no: string; website: string; logo_url: string }>): Promise<Insurer> {
  const res = await baseApi.put<ApiResponse<Insurer>>(`${API.INSURERS}/${id}`, data)
  if (!res.data.data) throw new Error('Failed to update insurer')
  return res.data.data
}

export async function deleteInsurer(id: string): Promise<void> {
  await baseApi.delete(`${API.INSURERS}/${id}`)
}

export async function fetchCategories(): Promise<InsuranceCategory[]> {
  const res = await baseApi.get<ApiResponse<InsuranceCategory[]>>(API.CATEGORIES)
  return res.data.data ?? []
}

export async function createCategory(data: { name: string; description?: string; risk_category_id?: string }): Promise<InsuranceCategory> {
  const res = await baseApi.post<ApiResponse<InsuranceCategory>>(API.CATEGORIES, data)
  if (!res.data.data) throw new Error('Failed to create category')
  return res.data.data
}

export async function updateCategory(id: string, data: Partial<{ name: string; description: string; risk_category_id: string }>): Promise<InsuranceCategory> {
  const res = await baseApi.put<ApiResponse<InsuranceCategory>>(`${API.CATEGORIES}/${id}`, data)
  if (!res.data.data) throw new Error('Failed to update category')
  return res.data.data
}

export async function deleteCategory(id: string): Promise<void> {
  await baseApi.delete(`${API.CATEGORIES}/${id}`)
}

export async function fetchPolicies(params: {
  page?: number
  limit?: number
  insurer_id?: string
  category_id?: string
  search?: string
}): Promise<PaginatedPolicies> {
  const res = await baseApi.get<ApiResponse<PaginatedPolicies>>(API.POLICIES, { params })
  return res.data.data ?? { items: [], total: 0, page: 1, limit: 10 }
}

export async function fetchPolicyDetail(id: string): Promise<PolicyDetail> {
  const res = await baseApi.get<ApiResponse<PolicyDetail>>(`${API.POLICIES}/${id}`)
  if (!res.data.data) throw new Error('Policy not found')
  return res.data.data
}

export async function createPolicy(data: {
  insurer_id: string
  insurance_category_id: string
  policy_name: string
  policy_number?: string
  target_segment?: string
  min_sum_insured?: number
  max_sum_insured?: number
}): Promise<PolicyDetail> {
  const res = await baseApi.post<ApiResponse<PolicyDetail>>(API.POLICIES, data)
  if (!res.data.data) throw new Error('Failed to create policy')
  return res.data.data
}

export async function updatePolicy(id: string, data: Partial<{
  insurer_id: string
  insurance_category_id: string
  policy_name: string
  policy_number: string
  target_segment: string
  min_sum_insured: number
  max_sum_insured: number
}>): Promise<PolicyDetail> {
  const res = await baseApi.put<ApiResponse<PolicyDetail>>(`${API.POLICIES}/${id}`, data)
  if (!res.data.data) throw new Error('Failed to update policy')
  return res.data.data
}

export async function deletePolicy(id: string): Promise<void> {
  await baseApi.delete(`${API.POLICIES}/${id}`)
}

export async function uploadPolicyPdf(policyId: string, file: File): Promise<PolicyUploadResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await baseApi.post<ApiResponse<PolicyUploadResult>>(`${API.POLICIES}/${policyId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  if (!res.data.data) throw new Error('Failed to upload PDF')
  return res.data.data
}
