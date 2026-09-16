import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BalanceRoundedIcon from '@mui/icons-material/BalanceRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import {
  generateRecommendations,
  getRecommendationPolicyDownload,
} from '../features/recommendations/recommendationsApi'
import { downloadRecommendationReportPdf } from '../features/recommendations/recommendationReportPdf'
import { profileApi } from '../features/profile/profileApi'
import type { RecommendationListOut, RecommendationOut, RiskScoreOut } from '../features/recommendations/recommendations.types'
import UserLayout from '../layouts/UserLayout'
import type { Section } from '../components/UserSidebar'

type Status = 'loading' | 'empty' | 'error' | 'ready'
type ApiError = { response?: { data?: { error?: string } }; message?: string }

const LEVEL_STYLES: Record<string, { label: string; color: string; background: string }> = {
  critical: { label: 'Critical', color: 'var(--color-risk-critical)', background: 'var(--color-risk-critical-bg)' },
  high: { label: 'High', color: 'var(--color-risk-high)', background: 'var(--color-risk-high-bg)' },
  medium: { label: 'Medium', color: 'var(--color-risk-medium)', background: 'var(--color-risk-medium-bg)' },
  low: { label: 'Low', color: 'var(--color-risk-low)', background: 'var(--color-risk-low-bg)' },
}

function levelStyle(level?: string) {
  return LEVEL_STYLES[level || 'low'] ?? LEVEL_STYLES.low
}

function clampPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return 0
  return Math.round(Math.min(Math.max(value, 0), 100))
}

function riskScorePercent(score: number | null | undefined) {
  if (score === null || score === undefined) return 0
  return clampPercent(score <= 1 ? score * 100 : score)
}

function scorePercent(rec: RecommendationOut) {
  return clampPercent(rec.recommendation_score ?? riskScorePercent(rec.risk_score))
}

function highestRisks(scores: RiskScoreOut[]) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, 3)
}

function getApiErrorMessage(err: unknown, fallback: string) {
  const apiError = err as ApiError
  return apiError?.response?.data?.error || apiError?.message || fallback
}

function LoadingView() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-background)' }}>
      <div className="flex flex-col items-center gap-4 rounded-2xl border px-8 py-7 shadow-lg" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="relative flex h-11 w-11 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-t-transparent" style={{ borderColor: 'var(--color-primary-dark)', borderTopColor: 'transparent' }} />
          <ShieldOutlinedIcon style={{ color: 'var(--color-primary-dark)' }} fontSize="small" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Preparing your recommendations</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Matching your risk profile against available policies</p>
        </div>
      </div>
    </div>
  )
}

function ScoreRing({ matched, total }: { matched: number; total: number }) {
  const pct = total > 0 ? clampPercent((matched / total) * 100) : 0
  const circumference = 2 * Math.PI * 30
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
        <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />
        <circle
          cx="34"
          cy="34"
          r="30"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-bold leading-none text-white">{matched}/{total}</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300">Risks</span>
      </div>
    </div>
  )
}

function RecommendationCard({
  recommendation,
  rank,
  sessionId,
  selected,
  selectionDisabled,
  onToggleSelect,
}: {
  recommendation: RecommendationOut
  rank: number
  sessionId: string
  selected: boolean
  selectionDisabled: boolean
  onToggleSelect: () => void
}) {
  const policy = recommendation.policies[0]
  const policyId = recommendation.policy_id ?? policy?.id ?? null
  const match = scorePercent(recommendation)
  const riskPercent = riskScorePercent(recommendation.risk_score)
  const badge = rank === 1 ? 'Best match' : match >= 85 ? 'High coverage' : 'Recommended for you'
  const coverageCount = recommendation.coverage_match_count
  const coverageTotal = recommendation.coverage_match_total
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloadError('')
    if (!policyId) {
      setDownloadError('Policy PDF is not available for download.')
      return
    }
    setDownloading(true)
    try {
      const download = await getRecommendationPolicyDownload(sessionId, policyId)
      const link = document.createElement('a')
      link.href = download.download_url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = download.file_name
      link.click()
    } catch (err: unknown) {
      setDownloadError(
        getApiErrorMessage(err, 'Policy PDF is not available for download.'),
      )
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-surface transition-all duration-200 ${
        selected ? 'border-primary shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-border shadow-sm hover:shadow-md'
      } ${selectionDisabled ? 'opacity-60' : 'cursor-pointer'}`}
      onClick={() => {
        if (!selectionDisabled || selected) onToggleSelect()
      }}
    >
      <div
        className="relative px-5 py-5 text-white sm:px-7 sm:py-6"
        style={{ background: rank === 1 ? 'var(--color-primary-dark)' : 'var(--color-secondary)' }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-bold ring-1 ring-white/25">
              {rank}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: 'var(--color-primary-dark)' }}>
                  <WorkspacePremiumRoundedIcon sx={{ fontSize: 15 }} />
                  {badge}
                </span>
                {selected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-50 ring-1 ring-emerald-300/40">
                    <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />
                    Selected to compare
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-bold leading-tight sm:text-2xl">{recommendation.policy_name || policy?.policy_name}</h3>
              <p className="mt-1.5 text-sm font-medium text-white/70">{recommendation.company_name || policy?.insurer_name}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/70">
                <TrendingUpRoundedIcon sx={{ fontSize: 15 }} />
                Underlying risk exposure: {riskPercent}%
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 self-center">
            <ScoreRing matched={coverageCount} total={coverageTotal} />
            <p className="text-center text-xs font-medium text-white/70">
              Risks covered
            </p>
          </div>
        </div>
        {!selected && !selectionDisabled && (
          <p className="mt-4 text-xs font-medium text-white/60">Click this card to select it for comparison</p>
        )}
      </div>

      <div className="grid gap-6 p-5 sm:p-7">
        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Why this policy fits your business</h4>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
            {recommendation.why_recommended || 'This policy is ranked from your risk profile and supporting policy wording.'}
          </p>
        </div>

        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Risk categories covered</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {recommendation.matched_risk_categories.length > 0 ? recommendation.matched_risk_categories.map((risk) => (
              <span key={risk} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--color-selected)', color: 'var(--color-secondary)' }}>
                <CheckCircleOutlineRoundedIcon sx={{ fontSize: 14 }} />
                {risk}
              </span>
            )) : (
              <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No assessed business risks covered.</span>
            )}
          </div>
        </div>

        {recommendation.additional_inclusions.length > 0 && (
          <div>
            <h4 className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Also included</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendation.additional_inclusions.map((item) => (
                <span key={item} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-end gap-2 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleDownload()
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--color-primary-dark)' }}
            type="button"
            disabled={downloading}
          >
            <PictureAsPdfRoundedIcon sx={{ fontSize: 17 }} />
            {downloading ? 'Preparing document...' : 'Download policy PDF'}
          </button>
          {downloadError && (
            <p className="text-sm font-medium text-red-600">
              {downloadError}
            </p>
          )}
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
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([])
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')

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
      setSelectedPolicyIds([])
      setPdfError('')
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
  const topRecommendations = useMemo(
    () => data?.recommendations.slice(0, 5) ?? [],
    [data?.recommendations],
  )
  const selectedCount = selectedPolicyIds.length

  useEffect(() => {
    if (!sessionId || selectedPolicyIds.length !== 2) return
    navigate(`/recommendations/${sessionId}/compare`, {
      state: {
        selectedPolicyIds,
        recommendations: topRecommendations,
        businessProfileId: data?.business_profile_id ?? null,
      },
    })
  }, [data?.business_profile_id, navigate, selectedPolicyIds, sessionId, topRecommendations])

  const handleTogglePolicy = (policyId: string | null) => {
    if (!policyId) return
    setSelectedPolicyIds((current) => {
      if (current.includes(policyId)) {
        return current.filter((id) => id !== policyId)
      }
      if (current.length >= 2) {
        return current
      }
      return [...current, policyId]
    })
  }

  const handleDownloadReport = async () => {
    if (!data || status !== 'ready' || pdfBusy) return
    setPdfBusy(true)
    setPdfError('')
    try {
      const business = data.business_profile_id
        ? await profileApi.getBusinessById(data.business_profile_id).catch(() => null)
        : null
      await downloadRecommendationReportPdf(data, business)
    } catch (err) {
      setPdfError(getApiErrorMessage(err, 'Unable to generate the PDF report. Please try again.'))
    } finally {
      setPdfBusy(false)
    }
  }

  const handleSectionChange = (section: Section) => {
    if (section === 'profile') {
      navigate('/dashboard')
      return
    }
    if (section === 'profiling' || section === 'feedback') {
      navigate(`/dashboard/${section}`)
      return
    }
    if (section === 'comparison') {
      navigate(sessionId ? `/recommendations/${sessionId}/compare` : '/dashboard/comparison')
      return
    }
    if (section === 'chatbot') {
      if (sessionId) {
        navigate(`/recommendations/${sessionId}/compare`, {
          state: {
            recommendations: topRecommendations,
            businessProfileId: data?.business_profile_id ?? null,
            selectedPolicyIds,
            openChat: true,
          },
        })
      } else {
        navigate('/dashboard/comparison')
      }
    }
  }

  if (status === 'loading') {
    return (
      <UserLayout activeSection="recommendation" onSectionChange={handleSectionChange} contentClassName="w-full">
        <LoadingView />
      </UserLayout>
    )
  }

  if (status === 'error') {
    return (
      <UserLayout activeSection="recommendation" onSectionChange={handleSectionChange} contentClassName="w-full">
        <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--color-background)' }}>
          <div className="w-full max-w-md rounded-2xl border p-8 text-center shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-risk-high-bg)' }}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--color-risk-high-bg)', color: 'var(--color-risk-high)' }}>
              <ErrorOutlineRoundedIcon />
            </div>
            <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Recommendations unavailable</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>{errorMsg}</p>
            <button
              onClick={loadRecommendations}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--color-primary-dark)' }}
            >
              <RefreshRoundedIcon className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout activeSection="recommendation" onSectionChange={handleSectionChange} contentClassName="w-full">
      <main className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border p-6 shadow-sm sm:p-8" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: 'var(--color-primary-dark)' }}>
                <ShieldOutlinedIcon />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight sm:text-[28px]" style={{ color: 'var(--color-text-primary)' }}>Your policy recommendations</h1>
                <p className="mt-1.5 max-w-xl text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                  The five best-matching policies for your business, ranked from your risk assessment and supporting policy wording.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedPolicyIds.length !== 2) return
                navigate(`/recommendations/${sessionId}/compare`, {
                  state: {
                    selectedPolicyIds,
                    recommendations: topRecommendations,
                    businessProfileId: data?.business_profile_id ?? null,
                  },
                })
              }}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--color-secondary)' }}
              disabled={selectedPolicyIds.length !== 2}
            >
              <BalanceRoundedIcon className="h-4 w-4" />
              {selectedPolicyIds.length === 2 ? 'Compare selected policies' : `Select 2 policies to compare (${selectedCount}/2)`}
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {topRisks.map((risk, index) => {
              const style = levelStyle(risk.risk_level)
              return (
                <div
                  key={risk.risk_category_name}
                  className="rounded-xl border p-4"
                  style={{ background: style.background, borderColor: style.color + '33' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Priority risk {index + 1}</span>
                    <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ color: style.color, background: 'rgba(255,255,255,0.6)' }}>{riskScorePercent(risk.score)}%</span>
                  </div>
                  <p className="mt-2 text-[15px] font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{risk.risk_category_name}</p>
                </div>
              )
            })}
          </div>
        </section>

        {status === 'empty' ? (
          <section className="mt-6 rounded-2xl border p-10 text-center shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-risk-low-bg)' }}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--color-risk-low-bg)' }}>
              <CheckCircleOutlineRoundedIcon style={{ color: 'var(--color-risk-low)' }} />
            </div>
            <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>No urgent policy match required</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6" style={{ color: 'var(--color-text-secondary)' }}>
              Your latest assessment did not produce enough high-priority risk evidence for policy recommendations.
            </p>
          </section>
        ) : (
          <section className="mt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <InsightsOutlinedIcon className="h-5 w-5" style={{ color: 'var(--color-primary-dark)' }} />
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>Top recommended policies</h2>
              </div>
              <button
                onClick={handleDownloadReport}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: 'var(--color-primary-dark)', color: 'var(--color-primary-dark)' }}
                type="button"
                disabled={pdfBusy}
              >
                <PictureAsPdfRoundedIcon className="h-4 w-4" />
                {pdfBusy ? 'Preparing PDF...' : 'Download full report'}
              </button>
            </div>
            {pdfError && (
              <p className="mb-4 text-right text-sm font-medium text-red-600">{pdfError}</p>
            )}
            <div className="space-y-6">
              {topRecommendations.map((recommendation, index) => (
                <RecommendationCard
                  key={recommendation.policy_id || `${recommendation.policy_name}-${index}`}
                  recommendation={recommendation}
                  rank={index + 1}
                  sessionId={sessionId ?? ''}
                  selected={Boolean(recommendation.policy_id && selectedPolicyIds.includes(recommendation.policy_id))}
                  selectionDisabled={
                    selectedPolicyIds.length >= 2 &&
                    !(recommendation.policy_id && selectedPolicyIds.includes(recommendation.policy_id))
                  }
                  onToggleSelect={() => handleTogglePolicy(recommendation.policy_id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      </main>
    </UserLayout>
  )
}
