import { useCallback, useEffect, useMemo, useState, type SVGProps } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { BusinessProfile } from '../features/profile/profile.types'
import {
  BusinessProfileForm,
  ProfileCard,
  profileApi,
  PROFILE_MESSAGES,
} from '../features/profile'
import {
  ProfilingWizard,
  ProfilingLauncher,
  ProfilingResults,
  profilingApi,
} from '../features/profiling'
import type { ProfilingCompleteOut } from '../features/profiling'
import {
  FeedbackForm,
} from '../features/feedback'
import UserLayout from '../layout/UserLayout'
import type { Section } from '../components/UserSidebar'
import BusinessSwitcher from '../components/BusinessSwitcher'
import { useAuth } from '../hooks/useAuth'



type IconProps = SVGProps<SVGSVGElement>

function IconShield(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  )
}

function IconFiles(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v13" />
      <path d="M8 6h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
      <path d="M10 11h6" />
      <path d="M10 15h6" />
    </svg>
  )
}

function IconCalendar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  )
}

function IconEdit(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

function IconClock(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function IconArrowRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-7">
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-[18px] border border-black/5 bg-white/80 shadow-[0_14px_40px_rgba(20,20,19,0.04)]" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-[18px] border border-black/5 bg-white/80 shadow-[0_14px_40px_rgba(20,20,19,0.04)]" />
      <div className="h-56 animate-pulse rounded-[18px] border border-black/5 bg-white/80 shadow-[0_14px_40px_rgba(20,20,19,0.04)]" />
    </div>
  )
}

function formatDashboardDate(dateString: string | undefined | null, month: 'short' | 'long' = 'short') {
  if (!dateString) return 'Pending'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Pending'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' })
}

function formatDashboardTime(dateString: string | undefined | null) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getAssessmentDate(results: ProfilingCompleteOut | null) {
  return results?.session.completed_at ?? results?.session.updated_at ?? results?.session.created_at ?? null
}

function getPolicyCount(results: ProfilingCompleteOut | null) {
  const policies = (results as (ProfilingCompleteOut & { policies?: unknown[] }) | null)?.policies
  return Array.isArray(policies) ? policies.length : null
}

function OverviewCards({
  profile,
  results,
  onProfilingClick,
}: {
  profile: BusinessProfile
  results: ProfilingCompleteOut | null
  onProfilingClick: () => void
}) {
  const location = [profile.city, profile.state].filter(Boolean).join(', ') || 'Location not set'
  const assessmentDate = getAssessmentDate(results)
  const policyCount = getPolicyCount(results)
  const cards = [
    {
      icon: IconShield,
      title: 'Business',
      value: profile.business_name,
      supportText: `${profile.segment?.name ?? 'Segment not set'} · ${location}`,
      badge: profile.is_active ? 'Active' : 'Inactive',
      accent: '#CF4500',
      actionLabel: null,
      onAction: undefined,
    },
    {
      icon: IconFiles,
      title: 'Recommended Policies',
      value: policyCount === null ? '--' : String(policyCount),
      supportText: results ? 'Policy matching is ready after recommendations load' : 'Recommendations unlock after profiling',
      badge: null,
      accent: '#3860BE',
      actionLabel: results ? 'Review matches' : null,
      onAction: results ? onProfilingClick : undefined,
    },
    {
      icon: IconCalendar,
      title: 'Last Assessment',
      value: formatDashboardDate(assessmentDate),
      supportText: results ? 'Completed risk profiling session' : 'No completed assessment yet',
      badge: null,
      accent: '#059669',
      actionLabel: results ? 'View details' : 'Start now',
      onAction: onProfilingClick,
    },
  ]

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.title}
          className="flex min-h-[158px] flex-col justify-between rounded-[18px] border border-black/5 bg-white p-5 shadow-[0_14px_40px_rgba(20,20,19,0.045)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: `${card.accent}14`, color: card.accent }}>
              <card.icon className="h-7 w-7" />
            </div>
            {card.badge && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ backgroundColor: `${card.accent}10`, color: card.accent }}>
                {card.badge}
              </span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-gray-400">{card.title}</p>
            <h3 className="mt-1 line-clamp-2 text-[28px] font-bold leading-[1.08] tracking-tight text-gray-950">{card.value}</h3>
            <p className="mt-2 text-[14px] font-medium leading-5 text-gray-500">{card.supportText}</p>
          </div>
          {card.actionLabel && card.onAction ? (
            <button
              type="button"
              onClick={card.onAction}
              className="mt-4 flex items-center gap-2 text-left text-[14px] font-bold transition hover:opacity-75"
              style={{ color: card.accent }}
            >
              {card.actionLabel}
              <IconArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="mt-3" />
          )}
        </article>
      ))}
    </div>
  )
}

function RecentActivity({
  profile,
  results,
  onViewAll,
}: {
  profile: BusinessProfile
  results: ProfilingCompleteOut | null
  onViewAll: () => void
}) {
  const assessmentDate = getAssessmentDate(results)
  const activities = [
    ...(assessmentDate ? [{
      id: 'assessment',
      title: 'Risk assessment completed',
      timestamp: `${formatDashboardDate(assessmentDate, 'long')} · ${formatDashboardTime(assessmentDate)}`,
      Icon: IconShield,
      accent: '#059669',
    }] : [{
      id: 'assessment-open',
      title: 'Risk assessment pending',
      timestamp: 'Start profiling to unlock recommendations',
      Icon: IconClock,
      accent: '#D97706',
    }]),
    {
      id: 'profile-updated',
      title: 'Business profile updated',
      timestamp: `${formatDashboardDate(profile.updated_at, 'long')} · ${formatDashboardTime(profile.updated_at)}`,
      Icon: IconEdit,
      accent: '#3860BE',
    },
    {
      id: 'profile-created',
      title: 'Business profile created',
      timestamp: `${formatDashboardDate(profile.created_at, 'long')} · ${formatDashboardTime(profile.created_at)}`,
      Icon: IconFiles,
      accent: '#CF4500',
    },
  ]

  return (
    <section className="rounded-[18px] border border-black/5 bg-white shadow-[0_14px_40px_rgba(20,20,19,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-5">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight text-gray-950">Recent Activity</h2>
          <p className="mt-0.5 text-[13px] font-medium text-gray-500">Latest updates and actions</p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-full border border-black/10 px-4 py-2 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          View all
        </button>
      </div>
      <div className="divide-y divide-black/5 px-5">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3.5 py-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${activity.accent}12`, color: activity.accent }}>
              <activity.Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-bold leading-5 text-gray-950">{activity.title}</h3>
              <p className="mt-1 truncate text-[12px] font-medium leading-4 text-gray-400">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { section } = useParams<{ section: string }>()
  const navigate = useNavigate()

  const activeSection: Section = section === 'profiling' ? 'profiling'
    : section === 'feedback' ? 'feedback'
    : 'profile'

  const handleSectionChange = useCallback((newSection: Section) => {
    if (newSection === 'profile') {
      navigate('/dashboard')
    } else {
      navigate(`/dashboard/${newSection}`)
    }
  }, [navigate])

  const [businesses, setBusinesses] = useState<BusinessProfile[]>([])
  const [businessesLoading, setBusinessesLoading] = useState(true)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [profilingView, setProfilingView] = useState<'loading' | 'launcher' | 'wizard' | 'results'>('loading')
  const [profilingResults, setProfilingResults] = useState<ProfilingCompleteOut | null>(null)

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  )

  const loadBusinesses = useCallback(async () => {
    setBusinessesLoading(true)
    try {
      const data = await profileApi.getMyBusinesses()
      setBusinesses(data)
      if (data.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(data[0].id)
      }
    } catch {
      // 404 = no business yet
    } finally {
      setBusinessesLoading(false)
    }
  }, [selectedBusinessId])

  useEffect(() => {
    loadBusinesses()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedBusinessId) return
    let cancelled = false

    const resolveView = async () => {
      try {
        const results = await profilingApi.getBusinessResults(selectedBusinessId)
        if (cancelled) return
        if (results) {
          setProfilingResults(results)
          if (activeSection === 'profiling' && profilingView === 'loading') {
            setProfilingView('results')
          }
        } else {
          setProfilingResults(null)
          if (activeSection === 'profiling' && profilingView === 'loading') {
            setProfilingView('launcher')
          }
        }
      } catch {
        if (!cancelled) {
          if (activeSection === 'profiling' && profilingView === 'loading') {
            setProfilingView('launcher')
          }
        }
      }
    }

    resolveView()
    return () => { cancelled = true }
  }, [selectedBusinessId, activeSection, profilingView])

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId)
    setProfilingView('loading')
    setProfilingResults(null)
    setShowAddForm(false)
    setProfileError(null)
  }

  const handleAddBusiness = () => {
    setSelectedBusinessId(null)
    setShowAddForm(true)
    navigate('/dashboard')
  }

  const handleProfileCreated = (newProfile: BusinessProfile) => {
    setShowAddForm(false)
    setSelectedBusinessId(newProfile.id)
    setBusinesses((prev) => {
      if (prev.some((b) => b.id === newProfile.id)) return prev
      return [...prev, newProfile]
    })
  }

  const handleDeleteBusiness = async (businessId: string) => {
    try {
      await profileApi.deleteBusiness(businessId)
      setBusinesses((prev) => prev.filter((b) => b.id !== businessId))
      if (selectedBusinessId === businessId) {
        setSelectedBusinessId(() => {
          const remaining = businesses.filter((b) => b.id !== businessId)
          return remaining.length > 0 ? remaining[0].id : null
        })
      }
    } catch {
      setProfileError(PROFILE_MESSAGES.deleteError)
    }
  }

  const renderProfileTab = () => {
    if (businessesLoading) {
      return <ProfileSkeleton />
    }

    if (profileError) {
      return (
        <div className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-risk-medium-bg)', backgroundColor: 'var(--color-risk-medium-bg)', color: 'var(--color-risk-medium)' }}>
          <span>{profileError}</span>
          <button
            type="button"
            onClick={() => setProfileError(null)}
            className="px-3 py-1.5 text-xs font-semibold transition" style={{ borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-white)', color: 'var(--color-risk-medium)', boxShadow: 'var(--shadow-sm)' }}
          >
            Dismiss
          </button>
        </div>
      )
    }

    if (selectedBusiness && !showAddForm) {
      return (
        <div className="grid w-full gap-7 text-left">
          <OverviewCards
            profile={selectedBusiness}
            results={profilingResults}
            onProfilingClick={() => handleSectionChange('profiling')}
          />
          <ProfileCard profile={selectedBusiness} />
          <RecentActivity
            profile={selectedBusiness}
            results={profilingResults}
            onViewAll={() => handleSectionChange('profiling')}
          />
        </div>
      )
    }

    return (
      <div className="p-8" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>{PROFILE_MESSAGES.title}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{PROFILE_MESSAGES.noProfile}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>{PROFILE_MESSAGES.noProfileProfiling}</p>
        </div>
        <BusinessProfileForm onSuccess={handleProfileCreated} />
      </div>
    )
  }

  const renderProfilingTab = () => {
    if (!selectedBusiness) {
      return (
        <div className="p-8" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <svg
              className="h-10 w-10" style={{ color: 'var(--color-text-muted)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Profile Required</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{PROFILE_MESSAGES.noProfileProfiling}</p>
          </div>
        </div>
      )
    }

    if (profilingView === 'loading') {
      return (
        <div className="flex items-center justify-center py-16" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Checking profiling status...</p>
          </div>
        </div>
      )
    }

    if (profilingView === 'wizard') {
      return (
        <ProfilingWizard
          businessId={selectedBusinessId ?? undefined}
          onComplete={(data) => {
            setProfilingResults(data)
            setProfilingView('results')
          }}
          onCancel={() => setProfilingView('launcher')}
        />
      )
    }

    if (profilingView === 'results' && profilingResults) {
      return (
        <ProfilingResults
          data={profilingResults}
          onRestart={() => {
            setProfilingResults(null)
            setProfilingView('wizard')
          }}
        />
      )
    }

    return (
      <div className="p-8" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <ProfilingLauncher
          businessId={selectedBusinessId ?? undefined}
          onStartWizard={() => setProfilingView('wizard')}
        />
      </div>
    )
  }

  const renderFeedbackTab = () => {
    return (
      <div className="rounded-[28px] bg-white p-8 shadow-[0_24px_70px_rgba(20,20,19,0.08)] lg:p-10">
        <div className="max-w-[720px]">
          <div className="mb-8">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--color-secondary)]">Feedback</p>
            <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-tight text-gray-950">Help us improve</h1>
            <p className="mt-3 max-w-2xl text-[15px] font-medium leading-6 text-gray-500">
              Tell us how the recommendations felt and where the experience can be sharper.
            </p>
          </div>
          <FeedbackForm businessId={selectedBusinessId ?? undefined} />
        </div>
      </div>
    )
  }

  return (
    <UserLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {activeSection === 'profile' && (
        <div className="mb-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
          <div className="pt-1">
            <h1 className="text-[42px] font-bold leading-[1.05] tracking-tight text-gray-950 sm:text-[48px]">
              Welcome back, {user?.fullName?.split(' ')[0] || 'there'}
            </h1>
            <p className="mt-3 max-w-2xl text-[17px] font-semibold leading-6 text-gray-500">
              Here's an overview of your business risk and insurance insights.
            </p>
          </div>
          <div className="w-full lg:w-[460px]">
            <BusinessSwitcher
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              onBusinessChange={handleBusinessChange}
              onAddBusiness={handleAddBusiness}
              onDeleteBusiness={handleDeleteBusiness}
            />
          </div>
        </div>
      )}

      <div className="w-full">
        {activeSection === 'profile' && renderProfileTab()}
        {activeSection === 'profiling' && renderProfilingTab()}
        {activeSection === 'feedback' && renderFeedbackTab()}
      </div>
    </UserLayout>
  )
}
