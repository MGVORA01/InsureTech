import type { InsuranceCategory } from '../policies.types'

interface CategoryTableProps {
  items: InsuranceCategory[]
  loading: boolean
  onEdit: (category: InsuranceCategory) => void
  onDelete: (category: InsuranceCategory) => void
}

export function CategoryTable({ items, loading, onEdit, onDelete }: CategoryTableProps) {
  if (!loading && items.length === 0) {
    return (
      <div className="mt-6 rounded-xl border bg-white p-12 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        No categories found.
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full table-fixed text-left text-sm" aria-busy={loading}>
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[38%]" />
          <col className="w-[16%]" />
          <col className="w-[18%]" />
        </colgroup>
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
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} aria-hidden="true">
                <td className="px-5 py-4">
                  <div className="h-[18px] w-40 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-4 w-60 max-w-full rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="h-5 w-[4.5rem] rounded-full skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-11 rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                    <div className="h-7 w-[3.625rem] rounded-md skeleton-shimmer" style={{ animationDelay: `${i * 60}ms` }} />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            items.map((cat) => (
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
                      style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(207,69,0,0.1))', color: 'var(--color-secondary)' }}
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
