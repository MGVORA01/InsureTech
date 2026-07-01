import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { generateRecommendations } from '../features/recommendations/recommendationsApi'
import type { RecommendationListOut } from '../features/recommendations/recommendations.types'

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  high: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  medium: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
  low: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
}

const LEVEL_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

type Status = 'loading' | 'empty' | 'error' | 'ready'

export default function RecommendationsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<RecommendationListOut | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setErrorMsg('No session ID provided.')
      return
    }
    setStatus('loading')
    generateRecommendations(sessionId)
      .then((result) => {
        setData(result)
        setStatus(result.recommendations.length === 0 ? 'empty' : 'ready')
      })
      .catch((err) => {
        setStatus('error')
        setErrorMsg(err?.response?.data?.error || err?.message || 'Failed to load recommendations.')
      })
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <span className="text-xl font-bold text-red-600">!</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800">Something went wrong</h2>
          <p className="mt-2 text-sm text-slate-500">{errorMsg}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldIcon />
          <h2 className="mt-4 text-lg font-semibold text-slate-800">No Recommendations Needed</h2>
          <p className="mt-2 text-sm text-slate-500">
            All your risk categories are at a low level. Your current coverage may be sufficient.
          </p>
          {data && data.scores.length > 0 && (
            <div className="mt-4 space-y-2">
              {data.scores.map((s) => (
                <div key={s.risk_category_name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-700">{s.risk_category_name}</span>
                  <span className="font-semibold text-green-600">{Math.round(s.score * 100)}%</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your Insurance Recommendations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Based on your risk assessment, here are the policies that best cover your business risks.
          </p>
        </div>

        {/* Risk Scores Summary */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Risk Scores Overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.scores.map((s) => {
              const colors = LEVEL_COLORS[s.risk_level] || LEVEL_COLORS.low
              return (
                <div
                  key={s.risk_category_name}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{s.risk_category_name}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {LEVEL_LABELS[s.risk_level] || s.risk_level}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(s.score * 100, 100)}%`, background: colors.text }}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-right text-xs font-semibold text-slate-400">
                    {Math.round(s.score * 100)}%
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Matched Policies</h2>
          <div className="space-y-8">
            {data?.recommendations.map((rec) => {
              const colors = LEVEL_COLORS[rec.priority] || LEVEL_COLORS.low
              return (
                <div key={`${rec.risk_category_name}-${rec.priority}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-6 py-4" style={{ background: colors.bg }}>
                    <div>
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                        style={{ background: colors.text, color: '#fff' }}
                      >
                        {LEVEL_LABELS[rec.priority] || rec.priority} Priority
                      </span>
                      <h3 className="mt-2 text-lg font-bold text-slate-800">{rec.risk_category_name}</h3>
                      <p className="text-sm text-slate-500">
                        Risk Score: {Math.round(rec.risk_score * 100)}% — {rec.risk_level}
                      </p>
                    </div>
                  </div>

                  {/* Policy Cards */}
                  <div className="divide-y divide-slate-100">
                    {rec.policies.map((policy) => (
                      <div key={policy.id} className="px-6 py-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {policy.insurer_logo_url ? (
                                <img src={policy.insurer_logo_url} alt={policy.insurer_name} className="h-10 w-10 rounded-lg object-contain" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary">
                                  {policy.insurer_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h4 className="text-base font-semibold text-slate-800">{policy.policy_name}</h4>
                                <p className="text-sm text-slate-500">{policy.insurer_name}</p>
                              </div>
                            </div>

                            {policy.key_features && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key Features</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {Object.entries(policy.key_features).map(([key, value]) => (
                                    <span key={key} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {policy.coverage_highlights.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coverage Highlights</p>
                                <ul className="mt-1 space-y-1">
                                  {policy.coverage_highlights.map((text, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                      {text.length > 150 ? text.slice(0, 150) + '...' : text}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {policy.min_sum_insured !== null && (
                              <p className="mt-3 text-sm text-slate-500">
                                Sum Insured: ₹{Number(policy.min_sum_insured).toLocaleString('en-IN')}
                                {policy.max_sum_insured !== null ? ` — ₹${Number(policy.max_sum_insured).toLocaleString('en-IN')}` : '+'}
                              </p>
                            )}
                          </div>
                        </div>

                        {policy.pdf_url && (
                          <div className="mt-4 flex items-center gap-3">
                            <a
                              href={policy.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                              <FileIcon />
                              View Policy Document
                              <ArrowRightIcon />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
