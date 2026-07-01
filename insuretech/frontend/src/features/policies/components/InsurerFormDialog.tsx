import { useState } from 'react'
import { Modal } from './Modal'
import type { Insurer } from '../policies.types'

export interface InsurerFormData {
  name: string
  irdai_registration_no: string
  website: string
  logo_url: string
}

interface InsurerFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: InsurerFormData) => Promise<void>
  editing: Insurer | null
  loading: boolean
}

export function InsurerFormDialog({ open, onClose, onSubmit, editing, loading }: InsurerFormDialogProps) {
  const [form, setForm] = useState<InsurerFormData>({
    name: editing?.name ?? '',
    irdai_registration_no: editing?.irdai_registration_no ?? '',
    website: editing?.website ?? '',
    logo_url: editing?.logo_url ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const set = (field: keyof InsurerFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Insurer' : 'Create Insurer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Insurer Name
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
            IRDAI Registration No
          </label>
          <input
            value={form.irdai_registration_no}
            onChange={set('irdai_registration_no')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Website
          </label>
          <input
            type="url"
            value={form.website}
            onChange={set('website')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Logo URL
          </label>
          <input
            type="url"
            value={form.logo_url}
            onChange={set('logo_url')}
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
