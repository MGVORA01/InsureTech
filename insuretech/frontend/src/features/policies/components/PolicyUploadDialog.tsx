import { useState } from 'react'
import { Modal } from './Modal'
import type { PolicyListItem } from '../policies.types'

interface PolicyUploadDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (file: File) => Promise<void>
  policy: PolicyListItem | null
  loading: boolean
}

export function PolicyUploadDialog({ open, onClose, onSubmit, policy, loading }: PolicyUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    await onSubmit(file)
    setFile(null)
  }

  const hasExistingDocs = (policy?.documents_count ?? 0) > 0

  return (
    <Modal open={open} onClose={onClose} title={hasExistingDocs ? 'Re-upload Policy PDF' : 'Upload Policy PDF'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {hasExistingDocs
            ? `This policy already has ${policy?.documents_count} document(s). Uploading will create a new version and replace the existing document chunks in the knowledge base.`
            : `Upload a PDF document for "${policy?.policy_name}". The document will be ingested into the knowledge base.`}
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            PDF File
          </label>
          <input
            required
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
            style={{ color: 'var(--color-text-primary)' }}
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
            disabled={loading || !file}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {loading ? 'Uploading & Ingesting...' : hasExistingDocs ? 'Re-upload' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
