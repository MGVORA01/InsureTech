import { useState } from 'react'
import { Modal } from './Modal'
import type { InsuranceCategory } from '../policies.types'

export interface CategoryFormData {
  name: string
  description: string
  risk_category_id: string
}

interface CategoryFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CategoryFormData) => Promise<void>
  editing: InsuranceCategory | null
  loading: boolean
}

export function CategoryFormDialog({ open, onClose, onSubmit, editing, loading }: CategoryFormDialogProps) {
  const [form, setForm] = useState<CategoryFormData>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    risk_category_id: editing?.risk_category_id ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const set = (field: keyof CategoryFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Category' : 'Create Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Category Name
          </label>
          <input
            required
            value={form.name}
            onChange={set('name')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Risk Category ID
          </label>
          <input
            value={form.risk_category_id}
            onChange={set('risk_category_id')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {loading ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
