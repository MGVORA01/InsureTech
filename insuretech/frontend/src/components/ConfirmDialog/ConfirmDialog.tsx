import { useEffect, useRef } from 'react'
import { Loader } from '@/components/Loader'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-4" onClick={() => { if (!loading) onCancel() }}>
      <div className="w-full max-w-[24rem] rounded-xl bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.1)]" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fef2f2]">
            <IconTrash className="h-5 w-5 text-[var(--color-risk-high,#dc2626)]" />
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#6b7280]">{message}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={loading} className="cursor-pointer rounded-md border border-[#d1d5db] bg-white px-4 py-1.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex items-center gap-2 rounded-md border-none bg-[var(--color-risk-high,#dc2626)] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {loading && <Loader variant="dots" size={16} />}
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
