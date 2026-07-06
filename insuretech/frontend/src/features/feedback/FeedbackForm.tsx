import { useState, type FormEvent } from 'react'
import { feedbackApi, getFeedbackErrorMessage } from './feedbackApi'
import { RECOMMENDATION_OPTIONS, FEEDBACK_MESSAGES } from './feedback.constants'

interface FeedbackFormProps {
  businessId?: string
  onSuccess?: () => void
}

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great']

export default function FeedbackForm({ businessId, onSuccess }: FeedbackFormProps) {
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
      }, businessId)
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
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] p-8 text-center">
        <div className="text-[2.5rem]">🎉</div>
        <h3 className="m-0 text-[1.125rem] font-semibold text-text-primary">Thank you!</h3>
        <p className="m-0 max-w-[360px] text-sm text-text-secondary">Your feedback helps us improve our recommendation engine.</p>
        <button type="button" className="self-start rounded-[var(--radius-md)] bg-cta px-8 py-3 text-sm font-semibold text-cta-contrast transition-opacity duration-150 enabled:hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setSuccess(false)}>
          Submit another
        </button>
      </div>
    )
  }

  return (
    <form className="flex max-w-[620px] flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">How would you rate your experience?</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`border-none bg-transparent p-0 text-[2rem] leading-none transition-transform duration-150 ${star <= (hoveredStar || rating) ? 'text-amber-500' : 'text-border hover:scale-110'}`}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
          {hoveredStar > 0 && <span className="ml-2 text-[0.8125rem] text-text-muted">{STAR_LABELS[hoveredStar]}</span>}
          {hoveredStar === 0 && rating > 0 && <span className="ml-2 text-[0.8125rem] text-text-muted">{STAR_LABELS[rating]}</span>}
        </div>
        {rating === 0 && <span className="text-[0.75rem] text-risk-high">Required</span>}
      </div>

      <hr className="border-0 border-t border-border" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary">Were the recommendations useful?</label>
        <div className="flex flex-col gap-2">
          {RECOMMENDATION_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="radio"
                name="recommendations_helpful"
                value={opt.value}
                checked={recommendationsHelpful === opt.value}
                onChange={(e) => setRecommendationsHelpful(e.target.value)}
                className="accent-secondary"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-0 border-t border-border" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-primary" htmlFor="feedback-message">
          {FEEDBACK_MESSAGES.messageLabel}
        </label>
        <textarea
          id="feedback-message"
          className="min-h-[120px] w-full resize-y rounded-[var(--radius-sm)] border border-border bg-white px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-secondary"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={FEEDBACK_MESSAGES.messagePlaceholder}
        />
      </div>

      <button
        type="submit"
        className="self-start rounded-[var(--radius-md)] bg-cta px-8 py-3 text-sm font-semibold text-cta-contrast transition-opacity duration-150 enabled:hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitting || rating === 0}
      >
        {submitting ? FEEDBACK_MESSAGES.submittingButton : FEEDBACK_MESSAGES.submitButton}
      </button>
      {error && <div className="max-w-[560px] rounded-[var(--radius-md)] bg-[rgba(220,38,38,0.1)] px-3 py-3 text-sm font-semibold leading-5 text-risk-high">{error}</div>}
    </form>
  )
}
