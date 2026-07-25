import { useEffect, useMemo, useState } from 'react'
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

function getRatingLabel(rating: number): string {
  if (rating >= 5) return 'Excellent'
  if (rating >= 4) return 'Very good'
  if (rating >= 3) return 'Good'
  if (rating >= 2) return 'Needs work'
  return 'Poor'
}

function getRecommendationLabel(value?: string | null): string | null {
  if (!value) return null
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

  const averageRating = useMemo(() => {
    if (feedbacks.length === 0) return 0
    return feedbacks.reduce((sum, item) => sum + item.rating, 0) / feedbacks.length
  }, [feedbacks])

  const helpfulCount = useMemo(() => {
    return feedbacks.filter((item) =>
      ['very_helpful', 'helpful', 'somewhat_helpful'].includes(item.recommendations_helpful ?? ''),
    ).length
  }, [feedbacks])

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[rgba(56,96,190,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_70px_rgba(15,23,42,0.08)] animate-fl-fade-in">
        <div className="border-b border-[rgba(56,96,190,0.1)] bg-[radial-gradient(circle_at_top_left,rgba(56,96,190,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(15,110,86,0.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92))] px-6 py-6 sm:px-7">
          <div className="h-4 w-28 rounded-full bg-black/5" />
          <div className="mt-4 h-8 w-56 rounded-full bg-black/5" />
          <div className="mt-3 h-4 w-full max-w-[440px] rounded-full bg-black/5" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="relative h-24 overflow-hidden rounded-[22px] border border-white/70 bg-white/80">
                <div className="absolute inset-0 animate-fl-shimmer" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="relative min-h-[190px] overflow-hidden rounded-[24px] border border-black/5 bg-white/90"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="absolute inset-0 animate-fl-shimmer" />
            </div>
          ))}
        </div>

        <style>{FEEDBACK_LIST_KEYFRAMES}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[rgba(220,38,38,0.16)] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] animate-fl-fade-in">
        <div className="bg-[linear-gradient(135deg,rgba(254,242,242,1),rgba(255,255,255,1))] px-6 py-7 text-center sm:px-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(220,38,38,0.12)] text-risk-high shadow-[0_10px_25px_rgba(220,38,38,0.12)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h3 className="m-0 text-xl font-bold tracking-tight text-text-primary">Couldn’t load feedback</h3>
          <p className="mx-auto mt-3 max-w-[460px] text-sm leading-6 text-text-secondary">{error}</p>
          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center rounded-[16px] bg-risk-high px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 active:scale-[0.98]"
            onClick={fetchFeedbacks}
          >
            Try again
          </button>
        </div>

        <style>{FEEDBACK_LIST_KEYFRAMES}</style>
      </div>
    )
  }

  if (feedbacks.length === 0) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[rgba(56,96,190,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_70px_rgba(15,23,42,0.08)] animate-fl-fade-in">
        <div className="px-6 py-10 text-center sm:px-8 sm:py-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(56,96,190,0.16),transparent_60%),linear-gradient(135deg,rgba(56,96,190,0.1),rgba(15,110,86,0.12))] text-secondary shadow-[0_18px_45px_rgba(56,96,190,0.14)]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h8" />
              <path d="M8 14h5" />
            </svg>
          </div>
          <div className="mt-5 inline-flex items-center rounded-full bg-[rgba(15,110,86,0.08)] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F6E56]">
            Feedback history
          </div>
          <h3 className="m-0 mt-4 text-[1.65rem] font-extrabold tracking-tight text-text-primary">No responses yet</h3>
          <p className="mx-auto mt-3 max-w-[520px] text-sm leading-7 text-text-secondary">
            {FEEDBACK_MESSAGES.empty} Once people start sharing their experience, this section will turn into a polished timeline of ratings, notes, and recommendation insights.
          </p>
        </div>

        <style>{FEEDBACK_LIST_KEYFRAMES}</style>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-[rgba(56,96,190,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_70px_rgba(15,23,42,0.08)] animate-fl-fade-in">
      <div className="relative overflow-hidden border-b border-[rgba(56,96,190,0.1)] bg-[radial-gradient(circle_at_top_left,rgba(56,96,190,0.17),transparent_34%),radial-gradient(circle_at_top_right,rgba(15,110,86,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,255,0.95))] px-5 py-6 sm:px-7 sm:py-7">
        <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[rgba(56,96,190,0.08)] blur-3xl" />
        <div className="absolute bottom-0 left-8 h-28 w-28 rounded-full bg-[rgba(15,110,86,0.08)] blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center rounded-full bg-[rgba(15,110,86,0.1)] px-4 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F6E56] shadow-sm">
            Feedback overview
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[620px]">
              <h3 className="m-0 text-[1.8rem] font-extrabold leading-tight tracking-tight text-text-primary sm:text-[2rem]">
                {FEEDBACK_MESSAGES.pastFeedback}
              </h3>
              <p className="m-0 mt-2 text-sm leading-7 text-text-secondary sm:text-[0.96rem]">
                A cleaner, more premium view of what users are saying — designed to match the site’s green-blue brand accents and make insights easier to scan.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(56,96,190,0.12)] bg-white/90 px-4 py-2 text-sm font-semibold text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#0F6E56]" />
              {feedbacks.length} {feedbacks.length === 1 ? 'response' : 'responses'}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Average rating</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[2rem] font-extrabold leading-none tracking-tight text-text-primary">{averageRating.toFixed(1)}</span>
                <span className="pb-1 text-sm font-medium text-text-muted">out of 5</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < Math.round(averageRating) ? 'animate-fl-star-in' : 'text-border'}>
                    {i < Math.round(averageRating) ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Most common mood</p>
              <div className="mt-2 text-[1.6rem] font-extrabold leading-none tracking-tight text-text-primary">
                {getRatingLabel(Math.round(averageRating))}
              </div>
              <p className="m-0 mt-2 text-sm leading-6 text-text-secondary">
                Strong, glanceable sentiment from recent submissions.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/80 bg-white/88 p-4 shadow-[0_14px_34px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted">Helpful recommendations</p>
              <div className="mt-2 text-[1.6rem] font-extrabold leading-none tracking-tight text-text-primary">
                {helpfulCount}
                <span className="ml-2 text-sm font-medium text-text-muted">of {feedbacks.length}</span>
              </div>
              <p className="m-0 mt-2 text-sm leading-6 text-text-secondary">
                Responses that rated the recommendations as useful or better.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6">
        {feedbacks.map((fb, index) => {
          const recommendationLabel = getRecommendationLabel(fb.recommendations_helpful)
          return (
            <article
              key={fb.id}
              className="group relative overflow-hidden rounded-[26px] border border-black/5 bg-white/92 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.1)] animate-fl-card-in sm:p-6"
              style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#3860BE,#0F6E56)] opacity-70" />
              <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[rgba(56,96,190,0.08)] blur-2xl transition-transform duration-300 group-hover:scale-110" />

              <div className="relative flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < fb.rating ? 'animate-fl-star-in text-[1.1rem]' : 'text-[1.1rem] text-border'}
                          style={i < fb.rating ? { animationDelay: `${Math.min(index, 8) * 70 + i * 45}ms` } : undefined}
                        >
                          {i < fb.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[rgba(56,96,190,0.08)] px-3 py-1 text-[12px] font-semibold text-[#3860BE]">
                        {fb.rating}/5 · {getRatingLabel(fb.rating)}
                      </span>
                      {recommendationLabel ? (
                        <span className="rounded-full bg-[rgba(15,110,86,0.08)] px-3 py-1 text-[12px] font-semibold text-[#0F6E56]">
                          Recommendations: {recommendationLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start rounded-full border border-black/5 bg-[rgba(248,250,252,0.92)] px-3 py-1.5 text-[12px] font-medium text-text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 2v4" />
                      <path d="M16 2v4" />
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M3 10h18" />
                    </svg>
                    {formatDate(fb.created_at)}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(56,96,190,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.9))] p-4">
                  <p className="m-0 text-[13.5px] leading-7 text-text-secondary sm:text-sm">
                    {fb.message?.trim() ? fb.message : 'No written comment was included with this rating.'}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <style>{FEEDBACK_LIST_KEYFRAMES}</style>
    </div>
  )
}

const FEEDBACK_LIST_KEYFRAMES = `
  @keyframes flFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fl-fade-in {
    animation: flFadeIn 0.3s ease-out both;
  }

  @keyframes flCardIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fl-card-in {
    animation: flCardIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes flStarIn {
    0% { opacity: 0; transform: scale(0.4) rotate(-18deg); }
    65% { opacity: 1; transform: scale(1.16) rotate(0deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  .animate-fl-star-in {
    display: inline-block;
    animation: flStarIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes flShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .animate-fl-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent);
    animation: flShimmer 1.5s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-fl-fade-in,
    .animate-fl-card-in,
    .animate-fl-star-in,
    .animate-fl-shimmer {
      animation: none !important;
    }
  }
`
