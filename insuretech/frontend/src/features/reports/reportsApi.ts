import baseApi from '../../api/baseApi'
import type { RiskAdvisoryReport } from './reports.types'

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

export async function generateRiskAdvisoryReport(sessionId: string): Promise<RiskAdvisoryReport> {
  const response = await baseApi.post<ApiEnvelope<RiskAdvisoryReport>>(
    `/reports/${sessionId}/risk-advisory`,
  )
  return unwrapData<RiskAdvisoryReport>(response)
}

export async function downloadRiskAdvisoryReport(report: RiskAdvisoryReport): Promise<void> {
  if (!report.file_url) throw new Error('Report file is not available.')

  const response = await baseApi.get<Blob>(report.file_url.replace('/api/v1', ''), {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `risk-advisory-report-${report.session_id}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
