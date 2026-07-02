import { useEffect, useState } from 'react'
import { feedbackApi, getFeedbackErrorMessage } from './feedbackApi'
import type { FeedbackResponse } from './feedback.types'
import { FEEDBACK_MESSAGES } from './feedback.constants'
import styles from './FeedbackList.module.css'

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
      <div className={styles.container}>
        <p className={styles.muted}>Loading feedbacks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={fetchFeedbacks}>Retry</button>
        </div>
      </div>
    )
  }

  if (feedbacks.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.muted}>{FEEDBACK_MESSAGES.empty}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>{FEEDBACK_MESSAGES.pastFeedback}</h3>
      <div className={styles.list}>
        {feedbacks.map((fb) => (
          <div key={fb.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.stars}>{stars(fb.rating)}</span>
              <span className={styles.date}>{formatDate(fb.created_at)}</span>
            </div>
            <p className={styles.cardMessage}>{fb.message}</p>
            {fb.recommendations_helpful && (
              <span className={styles.helpfulTag}>
                Recommendations: {fb.recommendations_helpful.replace('_', ' ')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
