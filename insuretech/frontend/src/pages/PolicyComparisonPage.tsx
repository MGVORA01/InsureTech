import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import UserLayout from '../layouts/UserLayout'
import type { Section } from '../components/UserSidebar'
import { ComparisonView } from '../features/comparison'
import { generateRecommendations, getRecommendations } from '../features/recommendations/recommendationsApi'
import type { RecommendationOut } from '../features/recommendations/recommendations.types'
import type { PolicyListItem } from '../features/policies/policies.types'

type Status = 'loading' | 'ready' | 'error'

interface ComparisonRouteState {
  selectedPolicyIds?: string[]
  recommendations?: RecommendationOut[]
  businessProfileId?: string | null
  openChat?: boolean
}

function toPolicyOption(rec: RecommendationOut): PolicyListItem | null {
  const policyId = rec.policy_id ?? rec.policies[0]?.id
  if (!policyId) return null

  return {
    id: policyId,
    insurer_id: '',
    insurer_name: rec.company_name ?? rec.policies[0]?.insurer_name ?? 'Unknown',
    insurance_category_id: '',
    insurance_category_name: rec.policies[0]?.insurance_category_name ?? rec.risk_category_name,
    policy_name: rec.policy_name ?? rec.policies[0]?.policy_name ?? 'Recommended policy',
    policy_number: null,
    is_active: true,
    documents_count: rec.policies[0]?.pdf_url ? 1 : 0,
  }
}

function uniquePolicyOptions(recommendations: RecommendationOut[]) {
  const byPolicyId = new Map<string, PolicyListItem>()
  for (const rec of recommendations) {
    const option = toPolicyOption(rec)
    if (option && !byPolicyId.has(option.id)) {
      byPolicyId.set(option.id, option)
    }
  }
  return [...byPolicyId.values()]
}

export default function PolicyComparisonPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = (location.state as ComparisonRouteState | null) ?? {}
  const [recommendations, setRecommendations] = useState<RecommendationOut[]>(
    routeState.recommendations ?? [],
  )
  const [businessProfileId, setBusinessProfileId] = useState(routeState.businessProfileId ?? '')
  const [selectedPolicyIds] = useState<string[]>(
    [...new Set(routeState.selectedPolicyIds ?? [])].slice(0, 2),
  )
  const [chatOpenSignal, setChatOpenSignal] = useState(routeState.openChat ? 1 : 0)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!sessionId) {
      setStatus('error')
      setError('No recommendation session was provided.')
      return
    }

    setStatus('loading')
    try {
      let data = await getRecommendations(sessionId)
      if (!data.recommendations.length) data = await generateRecommendations(sessionId)
      setRecommendations(data.recommendations.slice(0, 5))
      setBusinessProfileId(data.business_profile_id ?? '')
      setStatus('ready')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load policy comparison.')
      setStatus('error')
    }
  }, [sessionId])

  useEffect(() => {
    load()
  }, [load])

  const policyOptions = useMemo(
    () => uniquePolicyOptions(recommendations),
    [recommendations],
  )

  const handleSectionChange = (section: Section) => {
    if (section === 'profile') {
      navigate('/dashboard')
      return
    }
    if (section === 'profiling' || section === 'feedback') {
      navigate(`/dashboard/${section}`)
      return
    }
    if (section === 'recommendation') {
      navigate(sessionId ? `/recommendations/${sessionId}` : '/dashboard/profiling')
      return
    }
    if (section === 'comparison') {
      navigate(sessionId ? `/recommendations/${sessionId}/compare` : '/dashboard/comparison')
      return
    }
    if (section === 'chatbot') {
      setChatOpenSignal((current) => current + 1)
    }
  }

  if (status === 'loading') {
    return (
      <UserLayout activeSection="comparison" onSectionChange={handleSectionChange} contentClassName="w-full">
        <div className="flex min-h-screen items-center justify-center bg-[#f7faf9]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </UserLayout>
    )
  }

  if (status === 'error' || !businessProfileId) {
    return (
      <UserLayout activeSection="comparison" onSectionChange={handleSectionChange} contentClassName="w-full">
        <div className="flex min-h-screen items-center justify-center bg-[#f7faf9] p-6">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
            <ErrorOutlineRoundedIcon className="mx-auto h-10 w-10 text-red-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-950">Comparison unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">
              {error || 'Business context is not available for this comparison.'}
            </p>
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout activeSection="comparison" onSectionChange={handleSectionChange} contentClassName="w-full">
      <main className="min-h-screen bg-[#f7faf9]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <button
              onClick={() => navigate(`/recommendations/${sessionId}`)}
              className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              type="button"
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
                <p className="mt-1 text-sm text-slate-500">
                  Select two recommended policies from this session for an evidence-based comparison.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <ComparisonView
              businessProfileId={businessProfileId}
              sessionId={sessionId}
              recommendedPolicies={policyOptions}
              initialPolicyA={selectedPolicyIds[0] ?? ''}
              initialPolicyB={selectedPolicyIds[1] ?? ''}
              autoCompare
              openChatSignal={chatOpenSignal}
            />
          </section>
        </div>
      </main>
    </UserLayout>
  )
}
