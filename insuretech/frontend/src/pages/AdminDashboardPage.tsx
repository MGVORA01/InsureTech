import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import baseApi from '../api/baseApi'
import { useAuth } from '../hooks/useAuth'

interface DashboardStats {
  total_users: number
  active_users: number
  inactive_users: number
}

// ---- tiny inline icon set (no extra dependency required) ---------------

function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconUserCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </svg>
  )
}

function IconUserX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 8 5 5M22 8l-5 5" />
    </svg>
  )
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
    </svg>
  )
}

function IconLogOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

function IconArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

function IconRefresh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

// ---- helpers --------------------------------------------------------------

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name?: string) {
  if (!name) return 'A'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
      <div className="mt-4 h-3 w-20 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-7 w-14 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

function AdminDashboardPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  useEffect(() => {
    if (!user) {
      loadCurrentUser()
    }
  }, [user, loadCurrentUser])

  const fetchStats = async () => {
    setStatsLoading(true)
    setStatsError(false)
    try {
      const res = await baseApi.get('/admin/stats')
      const body = res.data
      const data = body?.data ?? body
      setStats(data)
    } catch {
      setStats(null)
      setStatsError(true)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // Error handled by slice
    }
  }

  const initials = useMemo(() => getInitials(user?.fullName), [user?.fullName])
  const greeting = useMemo(() => getGreeting(), [])

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users,
      icon: IconUsers,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Active Users',
      value: stats?.active_users,
      icon: IconUserCheck,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Inactive Users',
      value: stats?.inactive_users,
      icon: IconUserX,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-red-500',
    },
  ]

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
            <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              <IconShield className="h-3 w-3" />
              Admin
            </span>
          </div>

          <nav className="order-3 w-full sm:order-none sm:w-auto">
            <Link
              to="/admin/users"
              className="block rounded-md px-3 py-1.5 text-center text-sm font-semibold text-primary transition hover:bg-primary/5 hover:text-primary-dark sm:text-left"
            >
              Manage Users
            </Link>
          </nav>

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
              <IconLogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Welcome banner */}
        <div className="overflow-hidden rounded-xl bg-primary px-6 py-7 text-white shadow-sm sm:px-8">
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.fullName?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Here's what's happening with your users today.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {statsLoading
            ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
            : statCards.map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                      {card.label}
                    </h3>
                    <p className={`mt-1 text-3xl font-bold ${card.valueColor}`}>
                      {card.value ?? 0}
                    </p>
                  </div>
                )
              })}
        </div>

        {statsError && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>Couldn't load the latest stats. Please try again.</span>
            <button
              type="button"
              onClick={fetchStats}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Quick action */}
        <Link
          to="/admin/users"
          className="mt-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconUsers className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-slate-900">Manage Users</h3>
              <p className="text-sm text-slate-500">View, activate, or deactivate user accounts.</p>
            </div>
          </div>
          <IconArrowRight className="h-5 w-5 text-slate-300 transition group-hover:text-primary" />
        </Link>

        {/* Profile */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Admin Profile</h2>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {initials}
            </span>
            <div className="grid flex-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full Name</label>
                <p className="mt-1 text-slate-900">{user?.fullName || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
                <p className="mt-1 break-all text-slate-900">{user?.email || '—'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</label>
                <p className="mt-1">
                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold capitalize text-amber-700">
                    {user?.role || '—'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboardPage
