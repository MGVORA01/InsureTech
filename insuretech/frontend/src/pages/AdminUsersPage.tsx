import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import baseApi from '../api/baseApi'
import { useAuth } from '../hooks/useAuth'

interface UserItem {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string | null
}

interface UserListResponse {
  users: UserItem[]
  total: number
  page: number
  limit: number
}

function AdminUsersPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<UserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<string>('')
  const limit = 10

  useEffect(() => {
    if (!user) {
      loadCurrentUser()
    }
  }, [user, loadCurrentUser])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit }
      if (filterActive === 'true') params.is_active = true
      else if (filterActive === 'false') params.is_active = false
      const res = await baseApi.get('/admin/users', { params })
      const body = res.data
      setData(body?.data ?? body)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, filterActive])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleToggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await baseApi.patch(`/admin/users/${userId}/status`, {
        is_active: !currentActive,
      })
      fetchUsers()
    } catch {
      // handled by interceptor
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // Error handled by slice
    }
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              IR
            </span>
            <span className="text-lg font-bold text-primary">InsureTech</span>
            <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Admin
            </span>
          </div>
          <nav className="absolute left-1/2 -translate-x-1/2">
            <Link
              to="/admin/dashboard"
              className="text-sm font-semibold text-primary transition hover:text-primary-dark"
            >
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user?.fullName}</span>
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

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-slate-500">
              {data ? `${data.total} user${data.total !== 1 ? 's' : ''} total` : 'Loading…'}
            </p>
          </div>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
            value={filterActive}
            onChange={(e) => { setPage(1); setFilterActive(e.target.value) }}
          >
            <option value="">All Users</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    Loading users…
                  </td>
                </tr>
              ) : !data || data.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-5 py-4 text-slate-600">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.role === 'ADMIN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          u.is_active ? 'bg-emerald-500' : 'bg-red-500'
                        }`} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                          u.is_active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  p === page
                    ? 'bg-primary text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminUsersPage
