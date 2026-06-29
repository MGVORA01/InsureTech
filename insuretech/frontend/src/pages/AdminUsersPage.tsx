  import { useCallback, useEffect, useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import baseApi from '../api/baseApi'
  import { useAuth } from '../hooks/useAuth'
  import {
    AdminDesktopSidebar,
    AdminMobileDrawer,
    AdminMobileTopBar,
    AdminSidebar,
    Banner,
    IconAlertTriangle,
    IconRefresh,
    SkeletonBlock,
  } from '../components/AdminSidebar'

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

  function formatDate(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  function RoleBadge({ role }: { role: string }) {
    const isAdmin = role === 'ADMIN'
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={
          isAdmin
            ? { backgroundColor: '#fef3c7', color: '#92400e' }
            : { backgroundColor: 'var(--overlay-secondary-10, rgba(13,115,119,0.1))', color: 'var(--color-secondary)' }
        }
      >
        {role}
      </span>
    )
  }

  function StatusBadge({ active }: { active: boolean }) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={active ? { backgroundColor: '#ecfdf5', color: '#065f46' } : { backgroundColor: '#fef2f2', color: '#991b1b' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? '#10b981' : '#ef4444' }} />
        {active ? 'Active' : 'Inactive'}
      </span>
    )
  }

  function StatusToggleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
        style={
          active
            ? { backgroundColor: '#fef2f2', color: 'var(--color-risk-high)' }
            : { backgroundColor: '#ecfdf5', color: '#059669' }
        }
      >
        {active ? 'Deactivate' : 'Activate'}
      </button>
    )
  }

  function AdminUsersPage() {
    const { user, loadCurrentUser, logout } = useAuth()
    const navigate = useNavigate()
    const [data, setData] = useState<UserListResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [page, setPage] = useState(1)
    const [filterActive, setFilterActive] = useState<string>('')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const limit = 10

    useEffect(() => {
      if (!user) loadCurrentUser()
    }, [user, loadCurrentUser])

    const fetchUsers = useCallback(async () => {
      setLoading(true)
      setError(false)
      try {
        const params: Record<string, string | number> = { page, limit }
        if (filterActive === 'true') params.is_active = true
        else if (filterActive === 'false') params.is_active = false
        const res = await baseApi.get('/admin/users', { params })
        const body = res.data
        setData(body?.data ?? body)
      } catch {
        setData(null)
        setError(true)
      } finally {
        setLoading(false)
      }
    }, [page, filterActive])

    useEffect(() => {
      fetchUsers()
    }, [fetchUsers])

    const handleToggleStatus = async (userId: string, currentActive: boolean) => {
      try {
        await baseApi.patch(`/admin/users/${userId}/status`, { is_active: !currentActive })
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
    const sidebarProps = { user, onLogout: handleLogout, onAfterNavigate: () => setDrawerOpen(false) }

    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
        <AdminMobileTopBar onOpenDrawer={() => setDrawerOpen(true)} onLogout={handleLogout} />

        <AdminMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <AdminSidebar onAfterNavigate={() => setDrawerOpen(false)} />
        </AdminMobileDrawer>

        <AdminDesktopSidebar>
          <AdminSidebar />
        </AdminDesktopSidebar>

        <main className="min-w-0 flex-1 pt-14 lg:pt-0">
          <div className="mx-auto max-w-5xl px-6 py-8 lg:py-10">
            <p className="mb-4 hidden text-xs font-semibold uppercase tracking-widest lg:block" style={{ color: 'var(--color-text-tertiary)' }}>
              Manage Users
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  User Management
                </h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {data ? `${data.total} user${data.total !== 1 ? 's' : ''} total` : loading ? 'Loading\u2026' : '\u2014'}
                </p>
              </div>
              <select
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                value={filterActive}
                onChange={(e) => {
                  setPage(1)
                  setFilterActive(e.target.value)
                }}
              >
                <option value="">All Users</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            {error && !loading && (
              <Banner tone="warning" icon={IconAlertTriangle}>
                <div className="flex items-center justify-between gap-3">
                  <span>Couldn't load users. Please try again.</span>
                  <button
                    type="button"
                    onClick={fetchUsers}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-amber-50"
                    style={{ color: '#92400e' }}
                  >
                    <IconRefresh className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              </Banner>
            )}

            {/* Table — md and up */}
            <div className="mt-6 hidden overflow-hidden rounded-xl border bg-white shadow-sm md:block" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-xs font-semibold uppercase tracking-widest"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-tertiary)' }}
                  >
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-5 py-4">
                          <SkeletonBlock className="h-5 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : !data || data.users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    data.users.map((u) => (
                      <tr key={u.id} className="transition hover:bg-[var(--color-surface-alt)]">
                        <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {u.full_name}
                        </td>
                        <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {u.email}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge active={u.is_active} />
                        </td>
                        <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatDate(u.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusToggleButton active={u.is_active} onClick={() => handleToggleStatus(u.id, u.is_active)} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Stacked cards — below md */}
            <div className="mt-6 space-y-3 md:hidden">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)
              ) : !data || data.users.length === 0 ? (
                <div className="rounded-xl border bg-white p-8 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
                  No users found.
                </div>
              ) : (
                data.users.map((u) => (
                  <div key={u.id} className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {u.full_name}
                        </p>
                        <p className="truncate text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {u.email}
                        </p>
                      </div>
                      <StatusBadge active={u.is_active} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        <RoleBadge role={u.role} />
                        <span>Joined {formatDate(u.created_at)}</span>
                      </div>
                      <StatusToggleButton active={u.is_active} onClick={() => handleToggleStatus(u.id, u.is_active)} />
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-slate-50 disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className="rounded-md px-3 py-1.5 text-sm font-medium transition"
                    style={
                      p === page
                        ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                        : { border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }
                    }
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="rounded-md border px-3 py-1.5 text-sm transition hover:bg-slate-50 disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  export default AdminUsersPage
