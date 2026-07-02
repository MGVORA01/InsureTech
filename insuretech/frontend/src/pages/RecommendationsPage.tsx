import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import BalanceRoundedIcon from '@mui/icons-material/BalanceRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded'
import { generateRecommendations } from '../features/recommendations/recommendationsApi'
import type { RecommendationListOut, RecommendationOut, RiskScoreOut } from '../features/recommendations/recommendations.types'
import { downloadRiskAdvisoryReport, generateRiskAdvisoryReport } from '../features/reports/reportsApi'

type Status = 'loading' | 'empty' | 'error' | 'ready'
type ApiError = { response?: { data?: { error?: string } }; message?: string }

const LEVEL_STYLES: Record<string, { label: string; text: string; bg: string; border: string; bar: string }> = {
  critical: { label: 'Critical', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-600' },
  high: { label: 'High', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' },
  medium: { label: 'Medium', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', bar: 'bg-blue-600' },
  low: { label: 'Low', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-600' },
}

function levelStyle(level?: string) {
  return LEVEL_STYLES[level || 'low'] ?? LEVEL_STYLES.low
}

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 0
  return Math.round(Math.min(Math.max(value, 0), 100))
}

function scorePercent(rec: RecommendationOut) {
  return clampPercent(rec.recommendation_score ?? rec.risk_score * 100)
}

function highestRisks(scores: RiskScoreOut[]) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, 3)
}

function downloadRecommendationSummary(recommendation: RecommendationOut) {
  const lines = [
    `Policy: ${recommendation.policy_name ?? 'Unknown'}`,
    `Company: ${recommendation.company_name ?? 'Unknown'}`,
    `Recommendation Score: ${scorePercent(recommendation)}%`,
    `Risk Categories Covered: ${recommendation.matched_risk_categories.join(', ') || 'None'}`,
    '',
    'Why Recommended:',
    recommendation.why_recommended ?? 'Not available',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${recommendation.policy_name || 'policy-recommendation'}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

function LoadingView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7faf9]">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-semibold text-slate-700">Preparing advisor recommendations</span>
      </div>
    </div>
  )
}

function ScoreRing({ matched, total }: { matched: number; total: number }) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[7px] border-emerald-200 bg-white text-center shadow-sm">
      <div>
        <div className="text-xl font-bold text-slate-950">{matched}/{total}</div>
        <div className="text-[10px] font-bold uppercase text-slate-400">Risks</div>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, rank }: { recommendation: RecommendationOut; rank: number }) {
  const policy = recommendation.policies[0]
  const match = scorePercent(recommendation)
  const badge = rank === 1 ? 'Best Match' : match >= 85 ? 'High Coverage' : 'Recommended for You'
  const coverageCount = recommendation.coverage_match_count || recommendation.matched_risk_categories.length
  const coverageTotal = recommendation.coverage_match_total || 7

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-lg font-bold text-slate-950">
              #{rank}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  <WorkspacePremiumRoundedIcon className="h-4 w-4" />
                  {badge}
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold leading-7">{recommendation.policy_name || policy?.policy_name}</h3>
              <p className="mt-1 text-sm font-medium text-slate-300">{recommendation.company_name || policy?.insurer_name}</p>
            </div>
          </div>
          <ScoreRing matched={coverageCount} total={coverageTotal} />
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6">
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-400">Why this policy is recommended</h4>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {recommendation.why_recommended || 'This policy is ranked from your risk profile and supporting policy wording.'}
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase text-slate-400">Risk categories covered</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendation.matched_risk_categories.map((risk) => (
              <span key={risk} className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-800">
                {risk}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={() => {
              if (policy?.pdf_url) {
                window.open(policy.pdf_url, '_blank', 'noopener,noreferrer')
                return
              }
              downloadRecommendationSummary(recommendation)
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            type="button"
          >
            Download
          </button>
        </div>
      </div>
    </article>
  )
}

export default function RecommendationsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<RecommendationListOut | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  const loadRecommendations = useCallback(async () => {
    if (!sessionId) {
      setStatus('error')
      setErrorMsg('No session ID provided.')
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await generateRecommendations(sessionId)
      setData({ ...result, recommendations: result.recommendations.slice(0, 5) })
      setStatus(result.recommendations.length === 0 ? 'empty' : 'ready')
    } catch (err: unknown) {
      const apiError = err as ApiError
      setStatus('error')
      setErrorMsg(apiError?.response?.data?.error || apiError?.message || 'Failed to load recommendations.')
    }
  }, [sessionId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecommendations()
  }, [loadRecommendations])

  const topRisks = useMemo(() => highestRisks(data?.scores ?? []), [data?.scores])
  const topRecommendations = data?.recommendations.slice(0, 5) ?? []

  async function handleDownloadReport() {
    if (!sessionId || reportLoading) return
    setReportLoading(true)
    setErrorMsg('')
    try {
      const report = await generateRiskAdvisoryReport(sessionId)
      await downloadRiskAdvisoryReport(report)
    } catch (err: unknown) {
      const apiError = err as ApiError
      setErrorMsg(apiError?.response?.data?.error || apiError?.message || 'Failed to generate report.')
    } finally {
      setReportLoading(false)
    }
  }

  if (status === 'loading') return <LoadingView />

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf9] p-6">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <ErrorOutlineRoundedIcon />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-950">Recommendations unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{errorMsg}</p>
          <button
            onClick={loadRecommendations}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white"
          >
            <RefreshRoundedIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
                <ShieldOutlinedIcon />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">AI Policy Recommendations</h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Top 5 advisor-ranked policies based on your risk assessment and policy wording evidence.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowBackRoundedIcon className="h-4 w-4" />
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate(`/recommendations/${sessionId}/compare`, { state: { recommendations: topRecommendations } })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white transition hover:opacity-90"
                disabled={!topRecommendations.length}
              >
                <BalanceRoundedIcon className="h-4 w-4" />
                Compare Policies
              </button>
              <button
                onClick={handleDownloadReport}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!topRecommendations.length || reportLoading}
              >
                {reportLoading ? 'Generating...' : 'Download Report'}
              </button>
              <button
                onClick={loadRecommendations}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <RefreshRoundedIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {topRisks.map((risk, index) => {
              const style = levelStyle(risk.risk_level)
              return (
                <div key={risk.risk_category_name} className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase text-slate-500">Priority risk #{index + 1}</span>
                    <span className={`text-sm font-bold ${style.text}`}>{Math.round(risk.score * 100)}%</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-950">{risk.risk_category_name}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-emerald-950">Risk advisory report</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Download a complete report with risk factors and recommended policies.
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!topRecommendations.length || reportLoading}
              type="button"
            >
              {reportLoading ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </section>

        {status === 'empty' ? (
          <section className="mt-6 rounded-lg border border-emerald-200 bg-white p-8 text-center shadow-sm">
            <CheckCircleOutlineRoundedIcon className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">No urgent policy match required</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Your latest assessment did not produce enough high-priority risk evidence for policy recommendations.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8">
              <div className="mb-4 flex items-center gap-2">
                <InsightsOutlinedIcon className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-bold text-slate-950">Best Matches</h2>
              </div>
              <div className="space-y-6">
                {topRecommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.policy_id || `${recommendation.policy_name}-${index}`}
                    recommendation={recommendation}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
