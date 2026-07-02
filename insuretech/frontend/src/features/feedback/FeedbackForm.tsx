import { useState, type FormEvent } from 'react'
import { feedbackApi, getFeedbackErrorMessage } from './feedbackApi'
import { RECOMMENDATION_OPTIONS, FEEDBACK_MESSAGES } from './feedback.constants'
import styles from './FeedbackForm.module.css'

interface FeedbackFormProps {
  onSuccess?: () => void
}

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great']

export default function FeedbackForm({ onSuccess }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [recommendationsHelpful, setRecommendationsHelpful] = useState<string>('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await feedbackApi.createFeedback({
        rating,
        recommendations_helpful: (recommendationsHelpful || undefined) as any,
        message: message.trim(),
      })
      setRating(0)
      setRecommendationsHelpful('')
      setMessage('')
      setSuccess(true)
      onSuccess?.()
    } catch (err) {
      setError(getFeedbackErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.successCard}>
        <div className={styles.successEmoji}>🎉</div>
        <h3 className={styles.successTitle}>Thank you!</h3>
        <p className={styles.successText}>Your feedback helps us improve our recommendation engine.</p>
        <button type="button" className={styles.submitBtn} onClick={() => setSuccess(false)}>
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.intro}>We'd love to know how your assessment experience was.</p>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Star rating */}
      <div className={styles.field}>
        <label className={styles.label}>How would you rate your experience?</label>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.star} ${star <= (hoveredStar || rating) ? styles.starActive : ''}`}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
          {hoveredStar > 0 && <span className={styles.starLabel}>{STAR_LABELS[hoveredStar]}</span>}
          {hoveredStar === 0 && rating > 0 && <span className={styles.starLabel}>{STAR_LABELS[rating]}</span>}
        </div>
        {rating === 0 && <span className={styles.hint}>Required</span>}
      </div>

      <hr className={styles.divider} />

      {/* Recommendation question */}
      <div className={styles.field}>
        <label className={styles.label}>Were the recommendations useful?</label>
        <div className={styles.radioGroup}>
          {RECOMMENDATION_OPTIONS.map((opt) => (
            <label key={opt.value} className={styles.radio}>
              <input
                type="radio"
                name="recommendations_helpful"
                value={opt.value}
                checked={recommendationsHelpful === opt.value}
                onChange={(e) => setRecommendationsHelpful(e.target.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Message */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="feedback-message">
          {FEEDBACK_MESSAGES.messageLabel}
        </label>
        <textarea
          id="feedback-message"
          className={styles.textarea}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={FEEDBACK_MESSAGES.messagePlaceholder}
        />
      </div>

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={submitting || rating === 0}
      >
        {submitting ? FEEDBACK_MESSAGES.submittingButton : FEEDBACK_MESSAGES.submitButton}
      </button>
    </form>
  )
}
