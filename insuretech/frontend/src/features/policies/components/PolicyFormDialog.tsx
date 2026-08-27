import { useState } from 'react'
import { Modal } from './Modal'
import type { PolicyListItem, Insurer, InsuranceCategory } from '../policies.types'
import { POLICY_TARGET_SEGMENTS } from '../policies.constants'

export interface PolicyFormData {
  insurer_id: string
  insurance_category_id: string
  policy_name: string
  policy_number: string
  target_segment: string
  min_sum_insured: string
  max_sum_insured: string
}

interface PolicyFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: PolicyFormData) => Promise<void>
  editing: PolicyListItem | null
  insurers: Insurer[]
  categories: InsuranceCategory[]
  loading: boolean
}

export function PolicyFormDialog({ open, onClose, onSubmit, editing, insurers, categories, loading }: PolicyFormDialogProps) {
  const [form, setForm] = useState<PolicyFormData>({
    insurer_id: editing?.insurer_id ?? '',
    insurance_category_id: editing?.insurance_category_id ?? '',
    policy_name: editing?.policy_name ?? '',
    policy_number: editing?.policy_number ?? '',
    target_segment: '',
    min_sum_insured: '',
    max_sum_insured: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  const set = (field: keyof PolicyFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Policy' : 'Create Policy'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Policy Name
          </label>
          <input
            required
            value={form.policy_name}
            onChange={set('policy_name')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Insurer
          </label>
          <select
            required
            value={form.insurer_id}
            onChange={set('insurer_id')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="">Select insurer</option>
            {insurers.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Category
          </label>
          <select
            required
            value={form.insurance_category_id}
            onChange={set('insurance_category_id')}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Policy Number
            </label>
            <input
              value={form.policy_number}
              onChange={set('policy_number')}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Target Segment
            </label>
            <select
              value={form.target_segment}
              onChange={set('target_segment')}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <option value="">Select</option>
              {POLICY_TARGET_SEGMENTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Min Sum Insured
            </label>
            <input
              type="number"
              value={form.min_sum_insured}
              onChange={set('min_sum_insured')}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Max Sum Insured
            </label>
            <input
              type="number"
              value={form.max_sum_insured}
              onChange={set('max_sum_insured')}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
            />
          </div>
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
