export const PROFILE_ENDPOINTS = {
  segments: '/businesses/segments',
  industries: '/businesses/industries',
  businesses: '/businesses',
  myBusiness: '/businesses/me',
  myBusinesses: '/businesses',
  deleteBusiness: (id: string) => `/businesses/${id}`,
} as const

export const TURNOVER_RANGES = [
  { label: 'Below ₹1 Cr', value: 'below_1_cr' },
  { label: '₹1 Cr – ₹10 Cr', value: '1_to_10_cr' },
  { label: '₹10 Cr – ₹50 Cr', value: '10_to_50_cr' },
  { label: '₹50 Cr – ₹100 Cr', value: '50_to_100_cr' },
  { label: 'Above ₹100 Cr', value: 'above_100_cr' },
] as const

export const PROFILE_VALIDATION = {
  segmentRequired: 'Select a segment',
  industryRequired: 'Select an industry',
  businessNameRequired: 'Business name is required',
} as const

export const PROFILE_MESSAGES = {
  title: 'Business Profile',
  createSuccess: 'Business profile created successfully',
  deleteSuccess: 'Business profile deleted successfully',
  deleteConfirm: 'Are you sure you want to delete this business profile? This action cannot be undone.',
  fetchError: 'Failed to load business profile',
  createError: 'Failed to create business profile',
  deleteError: 'Failed to delete business profile',
  loadSegmentsError: 'Failed to load segments',
  loadIndustriesError: 'Failed to load industries',
  noProfile: 'You have not created a business profile yet.',
  noProfileProfiling: 'Complete your business profile to start risk profiling',
  profileComplete: 'Your business profile is complete',
  genericError: 'Something went wrong. Please try again.',
} as const
