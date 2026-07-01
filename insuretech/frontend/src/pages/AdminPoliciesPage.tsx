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
  PolicyTable,
  PolicyFormDialog,
  PolicyUploadDialog,
} from '../features/policies/components'
import type { PolicyFormData } from '../features/policies/components'
import {
  fetchInsurers,
  fetchCategories,
  fetchPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
  uploadPolicyPdf,
} from '../features/policies/policiesApi'
import { PAGE_SIZE } from '../features/policies/policies.constants'
import type {
  Insurer,
  InsuranceCategory,
  PolicyListItem,
} from '../features/policies/policies.types'

function AdminPoliciesPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [items, setItems] = useState<PolicyListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState<PolicyListItem | null>(null)
  const [uploadTarget, setUploadTarget] = useState<PolicyListItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PolicyListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [insurers, setInsurers] = useState<Insurer[]>([])
  const [categories, setCategories] = useState<InsuranceCategory[]>([])

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
      const [res, ins, cats] = await Promise.all([
        fetchPolicies({ page, limit: PAGE_SIZE }),
        fetchInsurers(),
        fetchCategories(),
      ])
      setItems(res.items)
      setTotal(res.total)
      setInsurers(ins)
      setCategories(cats)
    } catch {
      setItems([])
      setTotal(0)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (p: PolicyListItem) => {
    setEditing(p)
    setShowForm(true)
  }

  const handleSubmitForm = async (data: PolicyFormData) => {
    setSubmitting(true)
    try {
      if (editing) {
        await updatePolicy(editing.id, {
          insurer_id: data.insurer_id,
          insurance_category_id: data.insurance_category_id,
          policy_name: data.policy_name,
          policy_number: data.policy_number,
          target_segment: data.target_segment,
          min_sum_insured: data.min_sum_insured ? Number(data.min_sum_insured) : undefined,
          max_sum_insured: data.max_sum_insured ? Number(data.max_sum_insured) : undefined,
        })
      } else {
        await createPolicy({
          insurer_id: data.insurer_id,
          insurance_category_id: data.insurance_category_id,
          policy_name: data.policy_name,
          policy_number: data.policy_number,
          target_segment: data.target_segment,
          min_sum_insured: data.min_sum_insured ? Number(data.min_sum_insured) : undefined,
          max_sum_insured: data.max_sum_insured ? Number(data.max_sum_insured) : undefined,
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

  const handleDelete = (p: PolicyListItem) => {
    setDeleteTarget(p)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePolicy(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch {
      setDeleteTarget(null)
      setError(true)
    } finally {
      setDeleting(false)
    }
  }

  const handleUploadPdf = async (file: File) => {
    if (!uploadTarget) return
    setSubmitting(true)
    try {
      await uploadPolicyPdf(uploadTarget.id, file)
      setUploadTarget(null)
      load()
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch { /* handled by slice */ }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

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
        <div className="mx-auto max-w-6xl px-6 py-8 lg:py-10">
          <p className="mb-4 hidden text-xs font-semibold uppercase tracking-widest lg:block" style={{ color: 'var(--color-text-tertiary)' }}>
            Manage Policies
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Policy Management
              </h1>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {loading ? 'Loading\u2026' : `${total} polic${total !== 1 ? 'ies' : 'y'} total`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-md px-4 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              + New Policy
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

          <PolicyTable
            items={items}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpload={setUploadTarget}
          />

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

          <PolicyFormDialog
            open={showForm}
            onClose={() => { setShowForm(false); setEditing(null) }}
            onSubmit={handleSubmitForm}
            editing={editing}
            insurers={insurers}
            categories={categories}
            loading={submitting}
          />

          <PolicyUploadDialog
            open={!!uploadTarget}
            onClose={() => setUploadTarget(null)}
            onSubmit={handleUploadPdf}
            policy={uploadTarget}
            loading={submitting}
          />

          <ConfirmDialog
            open={!!deleteTarget}
            title="Delete Policy"
            message={`Are you sure you want to delete "${deleteTarget?.policy_name}"? This will also remove all its documents and chunks and cannot be undone.`}
            loading={deleting}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        </div>
      </main>
    </div>
  )
}

export default AdminPoliciesPage
