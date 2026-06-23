import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function DashboardPage() {
  const { user, loading, error, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      loadCurrentUser()
    }
  }, [user, loadCurrentUser])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // Error handled by slice
    }
  }

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              IR
            </span>
            <span className="text-lg font-bold text-primary">InsureTech</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {user?.fullName}
            </span>
            <button
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">Welcome back, {user?.fullName}.</p>

        {/* User details card */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Profile Details</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Full Name
              </label>
              <p className="mt-1 text-slate-900">{user?.fullName || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Email
              </label>
              <p className="mt-1 text-slate-900">{user?.email || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Phone
              </label>
              <p className="mt-1 text-slate-900">{user?.phone || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Role
              </label>
              <p className="mt-1 capitalize text-slate-900">{user?.role || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Company
              </label>
              <p className="mt-1 text-slate-900">{user?.companyName || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Business Type
              </label>
              <p className="mt-1 text-slate-900">{user?.businessType || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Member Since
              </label>
              <p className="mt-1 text-slate-900">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardPage
