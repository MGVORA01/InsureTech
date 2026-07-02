import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FeedbackList,
} from '../features/feedback'
import UserLayout from '../layout/UserLayout'
import type { Section } from '../components/UserSidebar'
import BusinessSwitcher from '../components/BusinessSwitcher'



function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="mb-2 h-5 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="rounded-xl" style={{ backgroundColor: 'var(--color-surface)', boxShadow: '0 1px 3px rgba(20,20,19,0.04), 0 4px 24px rgba(20,20,19,0.04)' }}>
        <div className="flex items-center gap-4 p-7">
          <div className="h-14 w-14 animate-pulse rounded-xl bg-slate-100" />
          <div className="flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-36 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="mx-8 mb-6 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="mb-4 px-8">
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-5 px-8 pb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded bg-slate-100" />
              <div>
                <div className="mb-1 h-3 w-12 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverviewCards({ profile }: { profile: BusinessProfile }) {
  const profileFields = [
    profile.segment, profile.industry, profile.city, profile.state,
    profile.pincode, profile.year_established, profile.employee_count,
    profile.annual_turnover_range,
  ]
  const filled = profileFields.filter(Boolean).length
  const completionPct = Math.round((filled / profileFields.length) * 100)

  const cards = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      label: 'Business Status',
      value: profile.is_active ? 'Active' : 'Inactive',
      color: profile.is_active ? 'var(--color-risk-low)' : 'var(--color-risk-medium)',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <line x1="8" y1="6" x2="10" y2="6" />
          <line x1="8" y1="10" x2="10" y2="10" />
          <line x1="8" y1="14" x2="10" y2="14" />
          <line x1="14" y1="6" x2="16" y2="6" />
          <line x1="14" y1="10" x2="16" y2="10" />
          <line x1="14" y1="14" x2="16" y2="14" />
        </svg>
      ),
      label: 'Segment',
      value: profile.segment?.name ?? '\u2014',
      color: 'var(--color-text-primary)',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      label: 'Industry',
      value: profile.industry?.name ?? '\u2014',
      color: 'var(--color-text-primary)',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      label: 'Profile Completion',
      value: `${completionPct}%`,
      color: completionPct >= 80 ? 'var(--color-risk-low)' : completionPct >= 50 ? 'var(--color-risk-medium)' : 'var(--color-risk-high)',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      label: 'Employees',
      value: profile.employee_count ? `${profile.employee_count}` : '\u2014',
      color: 'var(--color-text-primary)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-2 rounded-xl border p-4 transition hover:[box-shadow:var(--shadow-md)]"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center gap-2" style={{ color: card.color }}>
            {card.icon}
            <span className="text-lg font-semibold tracking-tight">{card.value}</span>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{card.label}</p>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {

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
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0)



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
    if (activeSection !== 'profiling' || !selectedBusinessId) return
    if (profilingView !== 'loading') return

    let cancelled = false

    const resolveView = async () => {
      try {
        const results = await profilingApi.getBusinessResults(selectedBusinessId)
        if (cancelled) return
        if (results) {
          setProfilingResults(results)
          setProfilingView('results')
        } else {
          setProfilingView('launcher')
        }
      } catch {
        if (!cancelled) setProfilingView('launcher')
      }
    }

    resolveView()
    return () => { cancelled = true }
  }, [activeSection, selectedBusinessId, profilingView])

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
        <div className="flex flex-col gap-6">
          <OverviewCards profile={selectedBusiness} />
          <ProfileCard profile={selectedBusiness} />
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
        <div className="p-8" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
          <ProfilingWizard
            businessId={selectedBusinessId ?? undefined}
            onComplete={(data) => {
              setProfilingResults(data)
              setProfilingView('results')
            }}
            onCancel={() => setProfilingView('launcher')}
          />
        </div>
      )
    }

    if (profilingView === 'results' && profilingResults) {
      return (
        <div className="p-8" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
            <ProfilingResults
              data={profilingResults}
              onRestart={() => {
                setProfilingResults(null)
                setProfilingView('wizard')
              }}
          />
        </div>
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
      <div className="flex flex-col gap-10" style={{ borderRadius: 'var(--radius-xl)', border: 'none', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <div className="p-8 pb-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Feedback</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            We'd love to know how your assessment experience was.
          </p>
        </div>
        <div className="px-8">
          <FeedbackForm
            businessId={selectedBusinessId ?? undefined}
            onSuccess={() => setFeedbackRefreshKey((k) => k + 1)}
          />
        </div>
        <div className="border-t px-8 py-8" style={{ borderColor: 'var(--color-border)' }}>
          <FeedbackList key={`${feedbackRefreshKey}-${selectedBusinessId}`} businessId={selectedBusinessId ?? undefined} />
        </div>
      </div>
    )
  }

  return (
    <UserLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {/* Business Switcher — prominent card at the top */}
      <BusinessSwitcher
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        onBusinessChange={handleBusinessChange}
        onAddBusiness={handleAddBusiness}
        onDeleteBusiness={handleDeleteBusiness}
      />



      {/* Section content */}
      <div className="mt-6">
        {activeSection === 'profile' && renderProfileTab()}
        {activeSection === 'profiling' && renderProfilingTab()}
        {activeSection === 'feedback' && renderFeedbackTab()}
      </div>
    </UserLayout>
  )
}
