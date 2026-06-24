import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { BusinessProfile } from '../features/profile/profile.types'
import {
  BusinessProfileForm,
  ProfileCard,
  getProfileErrorMessage,
  profileApi,
  PROFILE_MESSAGES,
} from '../features/profile'

type Tab = 'profile' | 'profiling'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name?: string) {
  if (!name) return 'U'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  const initials = useMemo(() => getInitials(user?.fullName), [user?.fullName])
  const greeting = useMemo(() => getGreeting(), [])

  const loadProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    try {
      const data = await profileApi.getMyBusiness()
      setProfile(data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setProfile(null)
        setProfileError(null)
      } else {
        setProfileError(getProfileErrorMessage(err))
      }
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleProfileCreated = (newProfile: BusinessProfile) => {
    setProfile(newProfile)
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // Error handled by slice
    }
  }

  const renderProfileTab = () => {
    if (profileLoading) {
      return <ProfileSkeleton />
    }

    if (profileError) {
      return (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{profileError}</span>
          <button
            type="button"
            onClick={loadProfile}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      )
    }

    if (profile) {
      return <ProfileCard profile={profile} />
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
    if (!profile) {
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

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Risk Profiling</h2>
        <p className="mt-1 text-sm text-slate-500">
          Complete your risk profile to get started with recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              IR
            </span>
            <span className="text-lg font-bold text-primary">InsureTech</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </span>
              <span className="hidden text-sm text-slate-500 sm:inline">{user?.fullName}</span>
            </div>
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              onClick={handleLogout}
              type="button"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Welcome banner */}
        <div className="overflow-hidden rounded-xl bg-primary px-6 py-7 text-white shadow-sm sm:px-8">
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.fullName?.split(' ')[0] || 'User'}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Manage your business profile and risk assessment.
          </p>
        </div>

        {/* Tab bar */}
        <div className="mt-8 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Business Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profiling')}
            disabled={!profile}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'profiling' && profile
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            } ${!profile ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {!profile && (
              <svg
                className="-mt-0.5 mr-1.5 inline-block h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            Risk Profiling
          </button>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === 'profile' ? renderProfileTab() : renderProfilingTab()}
        </div>
      </main>
    </div>
  )
}
