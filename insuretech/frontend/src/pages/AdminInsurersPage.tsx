import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  AdminDesktopSidebar,
  AdminMobileDrawer,
  AdminMobileTopBar,
  AdminSidebar,
  Banner,
  IconAlertTriangle,
  IconRefresh,
} from '../components/AdminSidebar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  InsurerTable,
  InsurerFormDialog,
} from '../features/policies/components'
import type { InsurerFormData } from '../features/policies/components'
import {
  fetchInsurers,
  createInsurer,
  updateInsurer,
  deleteInsurer,
} from '../features/policies/policiesApi'
import type { Insurer } from '../features/policies/policies.types'

function AdminInsurersPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [items, setItems] = useState<Insurer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<Insurer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Insurer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) loadCurrentUser()
  }, [user, loadCurrentUser])

  useEffect(() => {
    if (location.search === '?action=create') {
      setEditing(null)
      setShowForm(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.search, navigate, location.pathname])

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setItems(await fetchInsurers())
    } catch {
      setItems([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (ins: Insurer) => {
    setEditing(ins)
    setShowForm(true)
  }

  const handleSubmitForm = async (data: InsurerFormData) => {
    setSubmitting(true)
    try {
      if (editing) {
        await updateInsurer(editing.id, data)
      } else {
        await createInsurer({
          name: data.name,
          irdai_registration_no: data.irdai_registration_no || undefined,
          website: data.website || undefined,
          logo_url: data.logo_url || undefined,
        })
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (ins: Insurer) => {
    setDeleteTarget(ins)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteInsurer(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setDeleteTarget(null)
      setError(true)
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch { /* handled by slice */ }
  }

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
            Manage Insurers
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Insurer Management
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {loading ? 'Loading\u2026' : `${items.length} insurer${items.length !== 1 ? 's' : ''} total`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              + New Insurer
            </button>
          </div>

          {error && !loading && (
            <Banner tone="warning" icon={IconAlertTriangle}>
              <div className="flex items-center justify-between gap-3">
                <span>Something went wrong. Please try again.</span>
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-amber-50"
                  style={{ color: '#92400e' }}
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            </Banner>
          )}

          <InsurerTable
            items={items}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <InsurerFormDialog
            open={showForm}
            onClose={() => { setShowForm(false); setEditing(null) }}
            onSubmit={handleSubmitForm}
            editing={editing}
            loading={submitting}
          />

          <ConfirmDialog
            open={!!deleteTarget}
            title="Delete Insurer"
            message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone if policies are linked to this insurer.`}
            loading={deleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        </div>
      </main>
    </div>
  )
}

export default AdminInsurersPage
