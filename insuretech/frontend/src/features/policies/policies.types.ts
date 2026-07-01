export interface Insurer {
  id: string
  name: string
  irdai_registration_no: string | null
  website: string | null
  logo_url: string | null
  is_active: boolean
}

export interface InsuranceCategory {
  id: string
  name: string
  description: string | null
  risk_category_id: string | null
  is_active: boolean
}

export interface PolicyListItem {
  id: string
  insurer_id: string
  insurer_name: string
  insurance_category_id: string
  insurance_category_name: string
  policy_name: string
  policy_number: string | null
  is_active: boolean
  documents_count: number
}

export interface PolicyDocument {
  id: string
  doc_type: string
  file_name: string
  file_url: string
  file_size: number | null
  version: number
  is_active: boolean
  created_at: string | null
}

export interface PolicyDetail {
  id: string
  insurer_id: string
  insurer_name: string
  insurance_category_id: string
  insurance_category_name: string
  policy_name: string
  policy_number: string | null
  min_sum_insured: number | null
  max_sum_insured: number | null
  key_features: Record<string, unknown> | null
  target_segment: string | null
  is_active: boolean
  documents: PolicyDocument[]
}

export interface PaginatedPolicies {
  items: PolicyListItem[]
  total: number
  page: number
  limit: number
}

export interface PolicyUploadResult {
  document_id: string
  file_name: string
  file_url: string
  chunks_count: number
}

export interface ApiResponse<T> {
  success: boolean
  error: string | null
  message: string | null
  data: T | null
}
