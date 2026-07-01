import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import type { BusinessProfile } from '../features/profile/profile.types'
import {
  BusinessProfileForm,
  ProfileCard,
  getProfileErrorMessage,
  profileApi,
  PROFILE_MESSAGES,
} from '../features/profile'
import {
  ProfilingWizard,
  ProfilingLauncher,
  ProfilingResults,
} from '../features/profiling'
import type { ProfilingCompleteOut } from '../features/profiling'
import UserLayout from '../layout/UserLayout'
import type { Section } from '../components/UserSidebar'
import BusinessSwitcher from '../components/BusinessSwitcher'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ProfileSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([])
  const [businessesLoading, setBusinessesLoading] = useState(true)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [profilingView, setProfilingView] = useState<'launcher' | 'wizard' | 'results'>('launcher')
  const [profilingResults, setProfilingResults] = useState<ProfilingCompleteOut | null>(null)

  const greeting = useMemo(() => getGreeting(), [])

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId) ?? null,
    [businesses, selectedBusinessId],
  )

  const loadBusinesses = useCallback(async () => {
    setBusinessesLoading(true)
    try {
      const data = await profileApi.getMyBusiness()
      setBusinesses(data ? [data] : [])
      if (data && !selectedBusinessId) {
        setSelectedBusinessId(data.id)
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

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId)
    setProfilingView('launcher')
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

  const renderProfileTab = () => {
    if (businessesLoading) {
      return <ProfileSkeleton />
    }

    if (profileError) {
      return (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{profileError}</span>
          <button
            type="button"
            onClick={() => setProfileError(null)}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
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
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">{PROFILE_MESSAGES.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{PROFILE_MESSAGES.noProfile}</p>
          <p className="mt-1 text-sm text-slate-500">{PROFILE_MESSAGES.noProfileProfiling}</p>
        </div>
        <BusinessProfileForm onSuccess={handleProfileCreated} />
      </div>
    )
  }

  const renderProfilingTab = () => {
    if (!selectedBusiness) {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <svg
              className="h-10 w-10 text-slate-300"
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
            <h3 className="text-base font-semibold text-slate-500">Profile Required</h3>
            <p className="text-sm text-slate-400">{PROFILE_MESSAGES.noProfileProfiling}</p>
          </div>
        </div>
      )
    }

    if (profilingView === 'wizard') {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ProfilingResults
            data={profilingResults}
            onRestart={() => {
              setProfilingResults(null)
              setProfilingView('launcher')
            }}
          />
        </div>
      )
    }

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ProfilingLauncher
          businessId={selectedBusinessId ?? undefined}
          onStartWizard={() => setProfilingView('wizard')}
        />
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
      />

      {/* Welcome banner */}
      <div className="mt-6 overflow-hidden rounded-xl px-6 py-7 text-white shadow-sm sm:px-8" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}>
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.fullName?.split(' ')[0] || 'User'}
        </h1>
        <p className="mt-1 text-sm text-white/80">
          {activeSection === 'profile'
            ? 'Manage your business profile and keep your information up to date.'
            : 'Complete a comprehensive risk assessment for your business.'}
        </p>
      </div>

      {/* Section content */}
      <div className="mt-6">
        {activeSection === 'profile' ? renderProfileTab() : renderProfilingTab()}
      </div>
    </UserLayout>
  )
}
