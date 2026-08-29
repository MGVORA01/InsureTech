import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { feedbackApi } from '../features/feedback/feedbackApi'
import type { AdminFeedbackItem } from '../features/feedback/feedback.types'
import {
  AdminDesktopSidebar,
  AdminMobileDrawer,
  AdminMobileTopBar,
  AdminSidebar,
  Banner,
  IconAlertTriangle,
  IconRefresh,
} from '../components/AdminSidebar'
import Button from '../components/Button'

const PAGE_SIZE = 12

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateText(text: string, maxLength = 100) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

function formatRecommendation(value: string | null | undefined) {
  if (!value) return 'Not provided'
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

// Deterministic gradient per user, derived from their name — same person
// always gets the same avatar color, no randomness/flicker on re-render.
const AVATAR_GRADIENTS = [
  ['#6366F1', '#8B5CF6'],
  ['#0EA5E9', '#22D3EE'],
  ['#F59E0B', '#F97316'],
  ['#10B981', '#34D399'],
  ['#EC4899', '#F472B6'],
  ['#6D28D9', '#A855F7'],
]

function nameHash(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_GRADIENTS.length
  }
  return Math.abs(hash)
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Counts up to `value` over `durationMs` whenever `value` changes — used for
// the total-responses number so a refresh/search feels like a live tally
// rather than a static label swap.
function useCountUp(value: number, durationMs = 600) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return undefined

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return display
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? '#F59E0B' : 'none'}
          stroke={i < rating ? '#F59E0B' : 'var(--color-border)'}
          strokeWidth="1.5"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function AdminFeedbackPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([])
  const [total, setTotal] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  const displayedTotal = useCountUp(total)

  useEffect(() => {
    if (!user) loadCurrentUser()
  }, [user, loadCurrentUser])

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await feedbackApi.getAdminFeedbackResponses(
        page,
        PAGE_SIZE,
        search || undefined,
        'desc',
      )
      setFeedbacks(response.feedbacks)
      setTotal(response.total)
    } catch {
      setError(true)
      setFeedbacks([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // handled by slice
    }
  }

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    loadFeedbacks()
  }

  const handleClearSearch = () => {
    setSearch('')
    setPage(1)
    searchInputRef.current?.focus()
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total])
  const GRID_COLS = '1.1fr_1.4fr_0.9fr_1fr_2fr_1fr'

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <AdminMobileTopBar onOpenDrawer={() => setDrawerOpen(true)} onLogout={handleLogout} />
      <AdminMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <AdminSidebar onAfterNavigate={() => setDrawerOpen(false)} />
      </AdminMobileDrawer>
      <AdminDesktopSidebar>
        <AdminSidebar />
      </AdminDesktopSidebar>

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
          <p
            className="mb-4 hidden text-xs font-semibold uppercase tracking-widest lg:block animate-fb-fade-in"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Feedback Responses
          </p>

          <div
            className="mb-6 flex flex-col gap-4 rounded-3xl border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between animate-fb-fade-in-up"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Feedback Responses
              </h1>
              <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                {loading && total === 0
                  ? 'Loading feedback…'
                  : `${displayedTotal} response${displayedTotal === 1 ? '' : 's'}`}
              </p>
            </div>

            <form
              className="flex w-full items-center gap-2 md:w-[380px]"
              onSubmit={handleSearchSubmit}
              role="search"
            >
              <div
                className="relative flex flex-1 items-center rounded-full border bg-white transition-colors focus-within:border-[var(--color-secondary)] focus-within:shadow-[0_0_0_3px_rgba(56,96,190,0.1)]"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <svg
                  className="pointer-events-none absolute left-3.5 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-tertiary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={searchInputRef}
                  id="admin-feedback-search"
                  name="search"
                  type="text"
                  autoComplete="off"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  className="h-10 w-full rounded-full bg-transparent py-2 pl-10 pr-8 text-sm outline-none placeholder:text-[var(--color-text-tertiary)]"
                  style={{ color: 'var(--color-text-primary)' }}
                />
                {search ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search"
                    className="absolute right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-slate-100 hover:text-[var(--color-text-primary)]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                className="flex h-10 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                Search
              </button>
            </form>
          </div>

          {error && !loading ? (
            <Banner tone="warning" icon={IconAlertTriangle}>
              <div className="flex items-center justify-between gap-3 animate-fb-fade-in">
                <span>Unable to load feedback responses. Please try again.</span>
                <button
                  type="button"
                  onClick={loadFeedbacks}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-amber-50"
                  style={{ color: '#92400e' }}
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  Retry
                </button>
              </div>
            </Banner>
          ) : null}

          <div
            className="overflow-hidden rounded-3xl border bg-white shadow-sm animate-fb-fade-in-up"
            style={{ borderColor: 'var(--color-border)', animationDelay: '80ms' }}
          >
            <div
              className={`hidden border-b px-6 py-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-tertiary)] md:grid md:gap-5 md:[grid-template-columns:var(--fb-grid)]`}
              style={{ borderColor: 'var(--color-border)', ['--fb-grid' as string]: GRID_COLS.replace(/_/g, ' ') }}
            >
              <div>Name</div>
              <div>Email</div>
              <div>Rating</div>
              <div>Recommendation</div>
              <div>Message</div>
              <div>Submitted</div>
            </div>

            {loading ? (
              <div className="space-y-4 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="relative h-20 overflow-hidden rounded-2xl bg-slate-100 animate-fb-fade-in"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="absolute inset-0 animate-fb-shimmer" />
                  </div>
                ))}
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="p-10 text-center animate-fb-fade-in">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: 'var(--color-background)' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {search ? `No results for "${search}"` : 'No feedback yet'}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {search ? 'Try a different name or email.' : 'Responses will show up here once users submit feedback.'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {feedbacks.map((item, index) => {
                  const expanded = expandedIds.has(item.id)
                  const gradient = AVATAR_GRADIENTS[nameHash(item.userName)]
                  return (
                    <div
                      key={item.id}
                      className="group relative px-6 py-5 transition-colors duration-150 hover:bg-slate-50/70 sm:px-8 animate-fb-row-in"
                      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 w-[3px] animate-fb-bar-draw"
                        style={{
                          background: `linear-gradient(180deg, ${gradient[0]}, ${gradient[1]})`,
                          animationDelay: `${Math.min(index, 10) * 45 + 120}ms`,
                        }}
                      />

                      <div
                        className="grid gap-4 text-sm md:items-start md:gap-5 md:[grid-template-columns:var(--fb-grid)]"
                        style={{ ['--fb-grid' as string]: GRID_COLS.replace(/_/g, ' ') }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
                            style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
                          >
                            {initialsOf(item.userName)}
                          </div>
                          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {item.userName}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm text-[var(--color-text-secondary)]" title={item.userEmail}>
                            {item.userEmail}
                          </p>
                        </div>

                        <div>
                          <StarRating rating={item.rating} />
                        </div>

                        <div>
                          <span
                            className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: item.recommendationsHelpful ? 'rgba(56,96,190,0.08)' : 'var(--color-background)',
                              color: item.recommendationsHelpful ? 'var(--color-secondary)' : 'var(--color-text-tertiary)',
                            }}
                          >
                            {formatRecommendation(item.recommendationsHelpful)}
                          </span>
                        </div>

                        <div>
                          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line">
                            {expanded ? item.response : truncateText(item.response)}
                          </p>
                          {item.response.length > 100 ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                              style={{ color: 'var(--color-secondary)' }}
                            >
                              {expanded ? 'Show less' : 'Read more'}
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="transition-transform duration-200"
                                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                          ) : null}
                        </div>

                        <div className="text-sm text-[var(--color-text-secondary)]">{formatDate(item.submittedAt)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {!loading && feedbacks.length > 0 ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fb-fade-in">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Showing {Math.min(total, page * PAGE_SIZE) - (page - 1) * PAGE_SIZE} of {total} responses
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  className="transition-transform duration-150 active:scale-95 disabled:active:scale-100"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <span className="text-sm tabular-nums text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages}
                  className="transition-transform duration-150 active:scale-95 disabled:active:scale-100"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <style>{`
        @keyframes fbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fb-fade-in {
          animation: fbFadeIn 0.4s ease-out both;
        }

        @keyframes fbFadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fb-fade-in-up {
          animation: fbFadeInUp 0.45s ease-out both;
        }

        @keyframes fbRowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fb-row-in {
          animation: fbRowIn 0.35s ease-out both;
        }

        @keyframes fbBarDraw {
          from { height: 0%; opacity: 0; }
          to { height: 100%; opacity: 1; }
        }
        .animate-fb-bar-draw {
          animation: fbBarDraw 0.4s ease-out both;
        }

        @keyframes fbShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-fb-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          animation: fbShimmer 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fb-fade-in,
          .animate-fb-fade-in-up,
          .animate-fb-row-in,
          .animate-fb-bar-draw,
          .animate-fb-shimmer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default AdminFeedbackPage
