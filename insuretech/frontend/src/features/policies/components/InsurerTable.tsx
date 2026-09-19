import type { Insurer } from '../policies.types'

interface InsurerTableProps {
  items: Insurer[]
  loading: boolean
  onEdit: (insurer: Insurer) => void
  onDelete: (insurer: Insurer) => void
}

export function InsurerTable({ items, loading, onEdit, onDelete }: InsurerTableProps) {
  if (!loading && items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border bg-white p-12 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        No insurers found.
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
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">IRDAI Registration No</th>
            <th className="px-5 py-3">Website</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                <td className="px-5 py-4">
                  <div className="h-4.5 w-48 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-40 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-52 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-5 w-18 rounded-full skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-12 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-7 w-14 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            items.map((ins) => (
              <tr key={ins.id} className="transition hover:bg-[var(--color-surface-alt)]">
                <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {ins.name}
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {ins.irdai_registration_no ?? '—'}
                </td>
                <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {ins.website ? (
                    <a href={ins.website} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--color-secondary)' }}>
                      {ins.website}
                    </a>
                  ) : '—'}
                </td>
                <td className="px-5 py-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={ins.is_active ? { backgroundColor: '#ecfdf5', color: '#065f46' } : { backgroundColor: '#fef2f2', color: '#991b1b' }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ins.is_active ? '#10b981' : '#ef4444' }} />
                    {ins.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(ins)}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                      style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(207,69,0,0.1))', color: 'var(--color-secondary)' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ins)}
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
