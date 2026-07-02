import type { Insurer } from '../policies.types'

interface InsurerTableProps {
  items: Insurer[]
  loading: boolean
  onEdit: (insurer: Insurer) => void
  onDelete: (insurer: Insurer) => void
}

export function InsurerTable({ items, loading, onEdit, onDelete }: InsurerTableProps) {
  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
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
          {items.map((ins) => (
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
