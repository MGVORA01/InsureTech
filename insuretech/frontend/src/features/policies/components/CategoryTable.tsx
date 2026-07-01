import type { InsuranceCategory } from '../policies.types'

interface CategoryTableProps {
  items: InsuranceCategory[]
  loading: boolean
  onEdit: (category: InsuranceCategory) => void
  onDelete: (category: InsuranceCategory) => void
}

export function CategoryTable({ items, loading, onEdit, onDelete }: CategoryTableProps) {
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
        No categories found.
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
            <th className="px-5 py-3">Description</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {items.map((cat) => (
            <tr key={cat.id} className="transition hover:bg-[var(--color-surface-alt)]">
              <td className="px-5 py-4 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {cat.name}
              </td>
              <td className="px-5 py-4" style={{ color: 'var(--color-text-secondary)' }}>
                {cat.description ?? '—'}
              </td>
              <td className="px-5 py-4">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={cat.is_active ? { backgroundColor: '#ecfdf5', color: '#065f46' } : { backgroundColor: '#fef2f2', color: '#991b1b' }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.is_active ? '#10b981' : '#ef4444' }} />
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(cat)}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition"
                    style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(13,115,119,0.1))', color: 'var(--color-secondary)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(cat)}
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
