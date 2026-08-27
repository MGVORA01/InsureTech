import { useCallback, useEffect, useState } from 'react'
import { profilingApi, getProfilingErrorMessage } from './profilingApi'
import { PROFILING_MESSAGES, SECTION_LABELS } from './profiling.constants'
import type { ProfilingStatus } from './profiling.types'

interface ProfilingLauncherProps {
  onStartWizard: () => void
  businessId?: string
}

export default function ProfilingLauncher({ onStartWizard, businessId }: ProfilingLauncherProps) {
  const [status, setStatus] = useState<ProfilingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await profilingApi.getStatus(businessId)
      setStatus(result)
    } catch (err) {
      setError(getProfilingErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center gap-3 px-0 py-12 text-sm text-text-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          <p>Checking profiling status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center">
        <div className="my-4 flex items-center gap-4 rounded-[var(--radius-md)] border border-risk-high bg-risk-high-bg px-4 py-3 text-[13px] text-risk-high">
          <span>{error}</span>
          <button type="button" className="rounded-[var(--radius-sm)] border border-risk-high bg-transparent px-3 py-1.5 text-[13px] font-semibold text-risk-high" onClick={fetchStatus}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentSection = status?.session?.current_section
  const sectionLabel = currentSection ? SECTION_LABELS[currentSection] || currentSection : null

  return (
    <div className="flex flex-col items-center">
      <div className="flex max-w-[28rem] flex-col items-center gap-4 px-4 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-white">
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
        </div>

        <h3 className="m-0 text-lg font-bold text-text-primary">Risk Profiling</h3>
        <p className="m-0 text-sm leading-6 text-text-secondary">
          Complete a comprehensive risk assessment for your business.
          {status?.has_active_session && sectionLabel
            ? ` You have an active session (${sectionLabel}).`
            : status?.profiling_completed
              ? ' Your profiling is complete.'
              : ' Answer a series of questions to evaluate your risk profile across multiple categories.'}
        </p>

        {status?.has_active_session && (
          <p className="m-0 text-[13px] text-text-tertiary">
            You were on section: <strong>{sectionLabel}</strong>
          </p>
        )}

        <button
          type="button"
          className="mt-2 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-primary px-8 py-3 text-[15px] font-bold text-text-onPrimary transition-colors hover:bg-primary-dark"
          onClick={onStartWizard}
        >
          {status?.has_active_session
            ? PROFILING_MESSAGES.resumeButton
            : status?.profiling_completed
              ? 'Edit Assessment'
              : PROFILING_MESSAGES.startButton}
        </button>
      </div>
    </div>
  )
}
