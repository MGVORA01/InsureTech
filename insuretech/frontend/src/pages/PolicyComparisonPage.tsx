import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import { Loader } from '@/components/Loader'
import UserLayout from '../layouts/UserLayout'
import type { Section } from '../components/UserSidebar'
import { ComparisonView } from '../features/comparison'
import { generateRecommendations, getRecommendations } from '../features/recommendations/recommendationsApi'
import type { RecommendationOut } from '../features/recommendations/recommendations.types'
import type { PolicyListItem } from '../features/policies/policies.types'
import { useNavigationLock } from '../store/navigationLock'
import { useAuth } from '../hooks/useAuth'
import sessionStore from '../store/sessionStore'

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

  useEffect(() => {
    if (!routeState.openChat) {
      setChatOpenSignal(0)
      return
    }

    setChatOpenSignal(1)
    navigate(location.pathname, {
      replace: true,
      state: { ...routeState, openChat: false },
    })
  }, [location.pathname, navigate, routeState])

  const { user } = useAuth()
  const { setActiveBusiness, unlockComparison } = useNavigationLock()

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

  useEffect(() => {
    if (!businessProfileId) return
    setActiveBusiness(businessProfileId)
    sessionStore.setLastSelectedBusiness(user?.id ?? null, businessProfileId)
    unlockComparison()
  }, [businessProfileId, user?.id, setActiveBusiness, unlockComparison])

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
      setChatOpenSignal(0)
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
        <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-[#f7faf9]">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl" />
          <Loader variant="gauge-sweep" label="Analyzing coverage, pricing, and terms..." size={72} />
        </div>
      </UserLayout>
    )
  }

  if (status === 'error' || !businessProfileId) {
    return (
      <UserLayout activeSection="comparison" onSectionChange={handleSectionChange} contentClassName="w-full">
        <div className="flex min-h-screen items-center justify-center bg-[#f7faf9] p-6">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-100 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.08)]">
            <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-red-50 blur-2xl" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-red-100">
              <ErrorOutlineRoundedIcon className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="relative mt-5 text-xl font-bold tracking-tight text-slate-950">Comparison unavailable</h1>
            <p className="relative mt-2 text-sm leading-relaxed text-slate-500">
              {error || 'Business context is not available for this comparison.'}
            </p>
            <div className="relative mt-7 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(sessionId ? `/recommendations/${sessionId}` : '/dashboard')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
              >
                <ArrowBackRoundedIcon className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => load()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-800"
                type="button"
              >
                <RefreshRoundedIcon className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    )
  }

  return (
    <UserLayout activeSection="comparison" onSectionChange={handleSectionChange} contentClassName="w-full">
      <main>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.35)] sm:p-8">
            <div className="pointer-events-none absolute -top-20 -right-10 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-teal-300/10 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                backgroundSize: '22px 22px',
              }}
            />

            <button
              onClick={() => navigate(`/recommendations/${sessionId}`)}
              className="relative z-10 mb-7 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 backdrop-blur transition hover:border-white/25 hover:bg-white/10 hover:text-white"
              type="button"
            >
              <ArrowBackRoundedIcon className="h-4 w-4" />
              Back to recommendations
            </button>

            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
                  <ShieldOutlinedIcon />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Compare Recommended Policies
                  </h1>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
                    Select two recommended policies from this session for a side-by-side, evidence-based comparison.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-start rounded-full bg-teal-400/10 px-3.5 py-1.5 ring-1 ring-teal-400/30 sm:self-auto">
                <VerifiedRoundedIcon className="h-4 w-4 text-teal-300" />
                <span className="text-xs font-semibold text-teal-200">Evidence-based analysis</span>
              </div>
            </div>
          </section>

          {/* Comparison card */}
          <section className="relative mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] sm:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-600 via-teal-400 to-slate-900" />
            <ComparisonView
              businessProfileId={businessProfileId}
              sessionId={sessionId}
              recommendedPolicies={policyOptions}
              initialPolicyA={selectedPolicyIds[0] ?? ''}
              initialPolicyB={selectedPolicyIds[1] ?? ''}
              openChatSignal={chatOpenSignal}
            />
          </section>
        </div>
      </main>
    </UserLayout>
  )
}
