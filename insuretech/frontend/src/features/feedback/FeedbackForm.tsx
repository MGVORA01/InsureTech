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
  const [poppedStar, setPoppedStar] = useState(0)
  const [recommendationsHelpful, setRecommendationsHelpful] = useState<string>('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleStarClick = (star: number) => {
    setRating(star)
    setPoppedStar(star)
  }

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
      <div className="mx-auto w-full max-w-[760px] rounded-[32px] border border-border bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-[0_10px_25px_rgba(16,185,129,0.2)] mx-auto mb-6">
          <svg
            className="h-10 w-10 text-emerald-500"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 mb-4">
          Feedback sent
        </div>

        <h3 className="m-0 text-[1.75rem] font-extrabold tracking-tight text-text-primary mb-3">
          Thank you for sharing your thoughts
        </h3>
        <p className="m-0 mx-auto max-w-[420px] text-[0.98rem] leading-7 text-text-secondary mb-8">
          Your feedback helps us refine the experience, improve recommendations, and make the product feel sharper for every business.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="rounded-[var(--radius-md)] bg-cta px-8 py-3 text-sm font-semibold text-cta-contrast shadow-[0_12px_28px_rgba(15,110,86,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            onClick={() => setSuccess(false)}
          >
            Submit another response
          </button>
          <span className="text-sm font-medium text-text-muted">
            We appreciate the extra minute you took to help us improve.
          </span>
        </div>
      </div>
    )
  }

  return (
    <form
      className="mx-auto w-full max-w-[760px] flex-col gap-6 rounded-[32px] border border-border bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col items-center gap-3 rounded-[24px] border border-border bg-white px-6 py-8 text-center shadow-[0_12px_30px_rgba(20,20,19,0.05)]">
        <div className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
          Feedback form
        </div>
        <h2 className="m-0 text-[1.9rem] font-extrabold leading-tight tracking-tight text-text-primary sm:text-[2.2rem]">
          Help us make InsureTech better
        </h2>
        <p className="m-0 max-w-[560px] text-[0.98rem] leading-7 text-text-secondary">
          Share how the experience felt, whether the recommendations were useful, and what would make the journey smoother.
        </p>
      </div>

      <div className="grid gap-5">
      <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(20,20,19,0.05)] animate-fb-fade-in-up">
        <label className="text-sm font-semibold text-text-primary text-center sm:text-left">How would you rate your experience?</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`relative border-none bg-transparent p-0 text-[2.5rem] leading-none transition-transform duration-150 ${
                star <= (hoveredStar || rating) ? 'text-amber-500' : 'text-border hover:scale-110'
              } ${poppedStar === star ? 'animate-fb-star-pop' : ''}`}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => handleStarClick(star)}
              onAnimationEnd={() => setPoppedStar(0)}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              ★
              {poppedStar === star ? (
                <span aria-hidden="true" className="absolute inset-0 animate-fb-star-glow text-amber-400">★</span>
              ) : null}
            </button>
          ))}
          {hoveredStar > 0 && (
            <span key={`hover-${hoveredStar}`} className="ml-2 text-[0.8125rem] text-text-muted animate-fb-fade-in">
              {STAR_LABELS[hoveredStar]}
            </span>
          )}
          {hoveredStar === 0 && rating > 0 && (
            <span key={`rating-${rating}`} className="ml-2 text-[0.8125rem] text-text-muted animate-fb-fade-in">
              {STAR_LABELS[rating]}
            </span>
          )}
        </div>
        {rating === 0 && <span className="text-[0.75rem] text-risk-high">Required</span>}
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(20,20,19,0.05)] animate-fb-fade-in-up" style={{ animationDelay: '60ms' }}>
        <label className="text-sm font-semibold text-text-primary">Were the recommendations useful?</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {RECOMMENDATION_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 text-sm font-medium text-text-primary transition-all duration-150 ${
                recommendationsHelpful === opt.value
                  ? 'border-[#0F6E56] bg-[rgba(15,110,86,0.08)] shadow-[0_8px_20px_rgba(15,110,86,0.08)]'
                  : 'border-border hover:border-[#0F6E56]/40 hover:bg-black/[0.02]'
              }`}
            >
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

      <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(20,20,19,0.05)] animate-fb-fade-in-up" style={{ animationDelay: '120ms' }}>
        <label className="text-sm font-semibold text-text-primary" htmlFor="feedback-message">
          {FEEDBACK_MESSAGES.messageLabel}
        </label>
        <textarea
          id="feedback-message"
          className="min-h-[150px] w-full resize-y rounded-[20px] border border-border bg-white px-4 py-4 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-muted focus:border-secondary focus:shadow-[0_0_0_4px_rgba(56,96,190,0.1)]"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={FEEDBACK_MESSAGES.messagePlaceholder}
        />
      </div>

      <div className="flex flex-col items-center gap-4 animate-fb-fade-in-up" style={{ animationDelay: '160ms' }}>
        <button
          type="submit"
          className="relative inline-flex min-w-[220px] items-center justify-center gap-2 rounded-[18px] bg-cta px-8 py-3.5 text-sm font-semibold text-cta-contrast shadow-[0_16px_40px_rgba(15,110,86,0.2)] transition-all duration-150 enabled:hover:-translate-y-0.5 enabled:hover:opacity-90 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <span className="h-3.5 w-3.5 animate-fb-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : null}
          {submitting ? FEEDBACK_MESSAGES.submittingButton : FEEDBACK_MESSAGES.submitButton}
        </button>
        <p className="m-0 text-center text-sm text-text-muted">
          Your response goes directly into improving product quality and recommendations.
        </p>
      </div>

      {error && (
        <div className="mx-auto w-full max-w-[560px] rounded-[18px] bg-[rgba(220,38,38,0.1)] px-4 py-3 text-center text-sm font-semibold leading-5 text-risk-high animate-fb-shake">
          {error}
        </div>
      )}
      </div>

      <style>{FEEDBACK_KEYFRAMES}</style>
    </form>
  )
}

const CONFETTI_COLORS = ['#4F46E5', '#7C3AED', '#F59E0B', '#22C55E', '#EC4899']
const CONFETTI_PIECES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * Math.PI * 2
  const distance = 60 + Math.random() * 50
  return {
    x: Math.cos(angle) * distance,
    rotate: Math.random() * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 120,
  }
})

const FEEDBACK_KEYFRAMES = `
  @keyframes fbFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fb-fade-in {
    animation: fbFadeIn 0.25s ease-out both;
  }

  @keyframes fbFadeInUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fb-fade-in-up {
    animation: fbFadeInUp 0.4s ease-out both;
  }

  /* Star click: a quick, satisfying bounce on the star itself */
  @keyframes fbStarPop {
    0% { transform: scale(1); }
    40% { transform: scale(1.35); }
    100% { transform: scale(1); }
  }
  .animate-fb-star-pop {
    animation: fbStarPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Glow trail rendered behind the popped star, fades out as it settles */
  @keyframes fbStarGlow {
    0% { opacity: 0.9; transform: scale(1.1); filter: blur(4px); }
    100% { opacity: 0; transform: scale(2); filter: blur(8px); }
  }
  .animate-fb-star-glow {
    animation: fbStarGlow 0.45s ease-out forwards;
  }

  @keyframes fbShake {
    10%, 90% { transform: translateX(-1px); }
    20%, 80% { transform: translateX(2px); }
    30%, 50%, 70% { transform: translateX(-4px); }
    40%, 60% { transform: translateX(4px); }
  }
  .animate-fb-shake {
    animation: fbShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  @keyframes fbSpin {
    to { transform: rotate(360deg); }
  }
  .animate-fb-spin {
    animation: fbSpin 0.6s linear infinite;
  }

  @keyframes fbPopIn {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  .animate-fb-pop-in {
    animation: fbPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes fbSuccessCard {
    0% { opacity: 0; transform: translateY(16px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-fb-success-card {
    animation: fbSuccessCard 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes fbRingPulse {
    0% { opacity: 0.75; transform: scale(0.7); }
    100% { opacity: 0; transform: scale(1.45); }
  }
  .animate-fb-ring-pulse {
    animation: fbRingPulse 1.2s ease-out 0.2s both;
  }

  @keyframes fbDrawCheck {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
  }
  .animate-fb-draw-check {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: fbDrawCheck 0.3s ease-out 0.15s forwards;
  }

  @keyframes fbConfetti {
    0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
    100% { opacity: 0; transform: translate(var(--tx), 90px) rotate(var(--rot)); }
  }
  .animate-fb-confetti {
    animation: fbConfetti 0.9s ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fb-fade-in, .animate-fb-fade-in-up, .animate-fb-star-pop,
    .animate-fb-star-glow, .animate-fb-shake, .animate-fb-spin,
    .animate-fb-pop-in, .animate-fb-draw-check, .animate-fb-confetti,
    .animate-fb-success-card, .animate-fb-ring-pulse {
      animation: none !important;
    }
  }
`
