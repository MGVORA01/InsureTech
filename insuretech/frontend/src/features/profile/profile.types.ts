export interface Segment {
  id: string
  name: string
}

export interface Industry {
  id: string
  name: string
  segment_id: string
}

export interface BusinessProfile {
  id: string
  user_id: string
  business_name: string
  business_description: string | null
  segment_id: string
  industry_id: string
  city: string | null
  state: string | null
  address: string | null
  pincode: string | null
  year_established: number | null
  employee_count: number | null
  annual_turnover_range: string | null
  segment: Segment | null
  industry: Industry | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBusinessRequest {
  segment_id: string
  industry_id: string
  business_name: string
  business_description?: string
  city?: string
  state?: string
  address?: string
  pincode?: string
  year_established?: number
  employee_count?: number
  annual_turnover_range?: string
}
