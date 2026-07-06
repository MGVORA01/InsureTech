import { useEffect, useState } from 'react'
import { feedbackApi, getFeedbackErrorMessage } from './feedbackApi'
import type { FeedbackResponse } from './feedback.types'
import { FEEDBACK_MESSAGES } from './feedback.constants'

interface FeedbackListProps {
  businessId?: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function stars(n: number): string {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

export default function FeedbackList({ businessId }: FeedbackListProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeedbacks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await feedbackApi.getBusinessFeedbacks(businessId)
      setFeedbacks(data)
    } catch (err) {
      setError(getFeedbackErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-text-muted">Loading feedbacks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[rgba(220,38,38,0.1)] px-3 py-2 text-[13px] text-risk-high">
          <span>{error}</span>
          <button type="button" className="rounded-[var(--radius-sm)] border-none bg-white px-3 py-1 text-[12px] font-medium text-risk-high" onClick={fetchFeedbacks}>Retry</button>
        </div>
      </div>
    )
  }

  if (feedbacks.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-text-muted">{FEEDBACK_MESSAGES.empty}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-base font-semibold text-text-primary">{FEEDBACK_MESSAGES.pastFeedback}</h3>
      <div className="flex flex-col gap-3">
        {feedbacks.map((fb) => (
          <div key={fb.id} className="rounded-[var(--radius-md)] border border-border bg-white p-4 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-base tracking-[1px] text-amber-500">{stars(fb.rating)}</span>
              <span className="ml-auto text-[0.75rem] text-text-muted">{formatDate(fb.created_at)}</span>
            </div>
            <p className="mb-1.5 whitespace-pre-wrap text-[13px] leading-6 text-text-secondary">{fb.message}</p>
            {fb.recommendations_helpful && (
              <span className="inline-block rounded-full bg-[rgba(56,96,190,0.08)] px-2 py-0.5 text-[0.75rem] text-text-muted">
                Recommendations: {fb.recommendations_helpful.replace('_', ' ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
