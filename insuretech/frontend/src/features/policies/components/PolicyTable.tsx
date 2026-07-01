import type { PolicyListItem } from '../policies.types'

interface PolicyTableProps {
  items: PolicyListItem[]
  loading: boolean
  onEdit: (policy: PolicyListItem) => void
  onDelete: (policy: PolicyListItem) => void
  onUpload: (policy: PolicyListItem) => void
}

export function PolicyTable({ items, loading, onEdit, onDelete, onUpload }: PolicyTableProps) {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border bg-white" style={{ borderColor: 'var(--color-border)' }}>
            <div className="p-5" style={{ backgroundColor: 'var(--color-surface-alt)' }} />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border bg-white p-12 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        No policies found.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr
            className="border-b text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-tertiary)' }}
          >
            <th className="px-5 py-3">Policy Name</th>
            <th className="px-5 py-3">Insurer</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Documents</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {items.map((p) => (
            <tr key={p.id} className="transition hover:bg-[var(--color-surface-alt)]">
              <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {p.policy_name}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                {p.insurer_name}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                {p.insurance_category_name}
              </td>
              <td className="px-5 py-4">
                {p.documents_count > 0 ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: '#ecfdf5', color: '#065f46' }}
                  >
                    {p.documents_count} file{p.documents_count > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    None
                  </span>
                )}
              </td>
              <td className="px-5 py-4">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={p.is_active ? { backgroundColor: '#ecfdf5', color: '#065f46' } : { backgroundColor: '#fef2f2', color: '#991b1b' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.is_active ? '#10b981' : '#ef4444' }} />
                  {p.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                    style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(13,115,119,0.1))', color: 'var(--color-secondary)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpload(p)}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                  >
                    {p.documents_count > 0 ? 'Re-upload' : 'Upload PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                    style={{ backgroundColor: '#fef2f2', color: 'var(--color-risk-high)' }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
