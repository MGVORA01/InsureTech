import { useCallback, useEffect, useState } from 'react'
import { profilingApi, getProfilingErrorMessage } from './profilingApi'
import { PROFILING_MESSAGES, SECTION_LABELS } from './profiling.constants'
import type { ProfilingStatus } from './profiling.types'
import styles from './ProfilingLauncher.module.css'

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
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Checking profiling status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchStatus}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const currentSection = status?.session?.current_section
  const sectionLabel = currentSection ? SECTION_LABELS[currentSection] || currentSection : null

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <svg
            className={styles.icon}
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

        <h3 className={styles.title}>Risk Profiling</h3>
        <p className={styles.description}>
          Complete a comprehensive risk assessment for your business.
          {status?.has_active_session && sectionLabel
            ? ` You have an active session (${sectionLabel}).`
            : status?.profiling_completed
              ? ' Your profiling is complete.'
              : ' Answer a series of questions to evaluate your risk profile across multiple categories.'}
        </p>

        {status?.has_active_session && (
          <p className={styles.resumeInfo}>
            You were on section: <strong>{sectionLabel}</strong>
          </p>
        )}

        <button
          type="button"
          className={styles.startBtn}
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
