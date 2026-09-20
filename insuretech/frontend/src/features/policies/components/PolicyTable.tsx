import type { PolicyListItem } from '../policies.types'

interface PolicyTableProps {
  items: PolicyListItem[]
  loading: boolean
  onEdit: (policy: PolicyListItem) => void
  onDelete: (policy: PolicyListItem) => void
  onUpload: (policy: PolicyListItem) => void
}

export function PolicyTable({ items, loading, onEdit, onDelete, onUpload }: PolicyTableProps) {
  if (!loading && items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border bg-white p-12 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        No policies found.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full table-fixed text-left text-sm" aria-busy={loading}>
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[16%]" />
          <col className="w-[15%]" />
          <col className="w-[10%]" />
          <col className="w-[13%]" />
          <col className="w-[22%]" />
        </colgroup>
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
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} aria-hidden="true">
                <td className="px-5 py-4">
                  <div className="h-[18px] w-52 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-36 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-32 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-14 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-5 w-[4.5rem] rounded-full skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-11 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-7 w-20 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-7 w-[3.625rem] rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            items.map((p) => (
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
                      style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(207,69,0,0.1))', color: 'var(--color-secondary)' }}
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
