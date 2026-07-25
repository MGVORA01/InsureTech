import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader } from '@/components/Loader'
import { fetchSessionScores } from '../features/risk-assessment'
import type { RiskScore } from '../features/risk-assessment'

const RISK_COLORS: Record<string, { bg: string; text: string; bar: string; label: string }> = {
  low: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    bar: 'bg-green-500',
    label: 'Low',
  },
  medium: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    bar: 'bg-yellow-500',
    label: 'Medium',
  },
  high: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-800',
    bar: 'bg-orange-500',
    label: 'High',
  },
  critical: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    bar: 'bg-red-500',
    label: 'Critical',
  },
}

function RiskCard({ score }: { score: RiskScore }) {
  const colors = RISK_COLORS[score.risk_level] ?? RISK_COLORS.low
  const pct = Math.round(score.score * 100)
  const factorBreakdown = score.factor_breakdown ?? {}
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${colors.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${colors.text}`}>
            {score.risk_category_name}
          </h3>
          <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
            {colors.label}
          </span>
        </div>
        <div className="ml-4 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-current text-lg font-bold"
            style={{ color: colors.bar.replace('bg-', '').replace('-500', '-600') }}
          >
            {pct}
          </div>
          <span className="mt-1 text-xs text-slate-500">out of 100</span>
        </div>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {Object.keys(factorBreakdown).length > 0 && (
        <>
          <button
            className="mt-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? 'Hide details' : 'Show details'} —
            {Object.keys(factorBreakdown).length} factors
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {Object.entries(factorBreakdown).map(([name, val]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{name}</span>
                  <span className="font-medium text-slate-900">
                    {Math.round(val * 100)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RiskResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [scores, setScores] = useState<RiskScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSessionScores(sessionId)
      setScores(data.scores)
    } catch {
      setError('Failed to load risk scores. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader variant="gauge-sweep" label="Analyzing risk..." size={72} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            onClick={load}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (scores.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">No risk scores available for this session.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              IR
            </span>
            <span className="text-lg font-bold text-primary">InsureTech</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Risk Assessment Results</h1>
        <p className="mt-1 text-slate-500">
          Based on your responses, here is your risk profile across {scores.length} categories.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {scores.map((s) => (
            <RiskCard key={s.risk_category_id} score={s} />
          ))}
        </div>
      </main>
    </div>
  )
}

export default RiskResultsPage
