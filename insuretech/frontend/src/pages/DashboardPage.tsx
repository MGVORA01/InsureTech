import { useCallback, useEffect, useMemo, useState } from 'react'
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
    <div className="p-6" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="mt-1 h-4 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {

  const [activeSection, setActiveSection] = useState<Section>('profile')
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
    setActiveSection('profile')
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
      return <ProfileCard profile={selectedBusiness} />
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
          <FeedbackForm onSuccess={() => setFeedbackRefreshKey((k) => k + 1)} />
        </div>
        <div className="border-t px-8 py-8" style={{ borderColor: 'var(--color-border)' }}>
          <FeedbackList key={feedbackRefreshKey} />
        </div>
      </div>
    )
  }

  return (
    <UserLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
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
