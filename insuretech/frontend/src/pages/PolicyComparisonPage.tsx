import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { generateRecommendations, getRecommendations } from '../features/recommendations/recommendationsApi'
import type { RecommendationOut } from '../features/recommendations/recommendations.types'

type Status = 'loading' | 'ready' | 'error'

function score(rec: RecommendationOut) {
  return Math.round(Math.min(Math.max(rec.recommendation_score ?? rec.risk_score * 100, 0), 100))
}

function ListCell({ items, warning = false }: { items: string[]; warning?: boolean }) {
  if (!items.length) return <span className="text-sm text-slate-400">Not found in retrieved wording</span>
  const Icon = warning ? ErrorOutlineRoundedIcon : CheckCircleOutlineRoundedIcon
  return (
    <ul className="grid gap-2">
      {items.slice(0, 4).map((item, index) => (
        <li key={index} className="flex gap-2 text-sm leading-6 text-slate-700">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warning ? 'text-orange-600' : 'text-emerald-600'}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PolicyComparisonPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const initial = (location.state as { recommendations?: RecommendationOut[] } | null)?.recommendations ?? []
  const [recommendations, setRecommendations] = useState<RecommendationOut[]>(initial.slice(0, 5))
  const [status, setStatus] = useState<Status>(initial.length ? 'ready' : 'loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!sessionId) return
    setStatus('loading')
    try {
      let data = await getRecommendations(sessionId)
      if (!data.recommendations.length) data = await generateRecommendations(sessionId)
      setRecommendations(data.recommendations.slice(0, 5))
      setStatus('ready')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load policy comparison.')
      setStatus('error')
    }
  }, [sessionId])

  useEffect(() => {
    if (!initial.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load()
    }
  }, [initial.length, load])

  const rows = useMemo(
    () => [
      { label: 'Recommendation Score', render: (rec: RecommendationOut) => <span className="text-lg font-bold text-slate-950">{score(rec)}%</span> },
      { label: 'Supported Risk Categories', render: (rec: RecommendationOut) => <ListCell items={rec.matched_risk_categories} /> },
      { label: 'Coverage', render: (rec: RecommendationOut) => <p className="text-sm leading-6 text-slate-700">{rec.coverage_summary || 'Coverage summary unavailable.'}</p> },
      { label: 'Benefits', render: (rec: RecommendationOut) => <ListCell items={rec.key_benefits} /> },
      { label: 'Exclusions / Limitations', render: (rec: RecommendationOut) => <ListCell items={rec.important_limitations} warning /> },
      { label: 'Coverage Highlights', render: (rec: RecommendationOut) => <ListCell items={rec.coverage_highlights} /> },
    ],
    [],
  )

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf9]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7faf9] p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <ErrorOutlineRoundedIcon className="mx-auto h-10 w-10 text-red-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-950">Comparison unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7faf9]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <button
            onClick={() => navigate(`/recommendations/${sessionId}`)}
            className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowBackRoundedIcon className="h-4 w-4" />
            Back to recommendations
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldOutlinedIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Compare Recommended Policies</h1>
              <p className="mt-1 text-sm text-slate-500">Side-by-side view of the Top 5 AI-ranked policies for this risk profile.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-56 px-4 py-4 text-left text-xs font-bold uppercase text-slate-500">Compare</th>
                {recommendations.map((rec, index) => (
                  <th key={rec.policy_id || index} className="min-w-64 px-4 py-4 text-left align-top">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      #{index + 1} {index === 0 ? 'Best Match' : 'Recommended'}
                    </span>
                    <h2 className="mt-3 text-sm font-bold leading-5 text-slate-950">{rec.policy_name}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{rec.company_name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <td className="bg-slate-50 px-4 py-4 text-sm font-bold text-slate-700">{row.label}</td>
                  {recommendations.map((rec, index) => (
                    <td key={`${row.label}-${rec.policy_id || index}`} className="px-4 py-4 align-top">
                      {row.render(rec)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}
