import type { ProfilingCompleteOut } from './profiling.types'

interface ProfilingResultsProps {
  data: ProfilingCompleteOut
  onRestart: () => void
  onEdit: () => void
  onSeeRecommendations?: () => void
}

const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

// Colors keyed off your existing tokens — critical/high lean on risk-high,
// medium/low fall back to primary/text tones so nothing new has to be
// added to the theme.
const RISK_STYLES: Record<string, { bar: string; text: string; pill: string; ring: string }> = {
  critical: {
    bar: 'bg-risk-high',
    text: 'text-risk-high',
    pill: 'bg-risk-high/10 text-risk-high',
    ring: 'border-risk-high',
  },
  high: {
    bar: 'bg-risk-high',
    text: 'text-risk-high',
    pill: 'bg-risk-high/10 text-risk-high',
    ring: 'border-risk-high',
  },
  medium: {
    bar: 'bg-primary',
    text: 'text-primary',
    pill: 'bg-primary/10 text-primary',
    ring: 'border-primary/40',
  },
  low: {
    bar: 'bg-text-secondary/60',
    text: 'text-text-secondary',
    pill: 'bg-text-secondary/10 text-text-secondary',
    ring: 'border-border',
  },
}

export default function ProfilingResults({ data, onRestart, onEdit, onSeeRecommendations }: ProfilingResultsProps) {
  const flagged = [...data.scores]
    .filter((score) => score.score > 0.2)
    .sort((a, b) => (RISK_WEIGHTS[b.risk_level] || 0) - (RISK_WEIGHTS[a.risk_level] || 0))

  const highestLevel = flagged[0]?.risk_level
  const avgScore =
    data.scores.length > 0
      ? Math.round((data.scores.reduce((sum, s) => sum + s.score, 0) / data.scores.length) * 100)
      : 0

  return (
    <div className="flex w-full justify-center">
      <style>{`
        @keyframes profFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes profGrowBar {
          from { width: 0%; }
        }
        @keyframes profPulseRing {
          0% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 0,0,0), 0.18); }
          70% { box-shadow: 0 0 0 14px rgba(var(--color-primary-rgb, 0,0,0), 0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb, 0,0,0), 0); }
        }
        .prof-fade-up { animation: profFadeUp 0.5s ease both; }
        .prof-grow-bar { animation: profGrowBar 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .prof-pulse { animation: profPulseRing 1.8s ease-out 1; }
        @media (prefers-reduced-motion: reduce) {
          .prof-fade-up, .prof-grow-bar, .prof-pulse { animation: none !important; }
        }
      `}</style>

      <div className="w-full max-w-[1180px] flex flex-col items-center gap-8 px-4">
        {/* Hero */}
        <div className="pt-8 text-center prof-fade-up">
          <div className="relative mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary text-text-onPrimary text-3xl font-extrabold shadow-lg prof-pulse">
            ✓
          </div>
          <h2 className="mb-2 text-[1.875rem] font-extrabold tracking-tight text-text-primary">
            Risk Profiling Complete
          </h2>
          <p className="m-0 text-sm font-medium text-text-secondary">
            Your business risk assessment has been completed successfully.
          </p>
        </div>

        {/* Summary strip */}
        <div
          className="prof-fade-up grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3"
          style={{ animationDelay: '80ms' }}
        >
          <div className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-text-primary">{data.scores.length}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Categories Assessed
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center shadow-sm">
            <div className={`text-2xl font-extrabold ${flagged.length > 0 ? 'text-risk-high' : 'text-text-primary'}`}>
              {flagged.length}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Flagged Above 20%
            </div>
          </div>
          <div className="col-span-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center shadow-sm sm:col-span-1">
            <div className="text-2xl font-extrabold text-text-primary">{avgScore}%</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              Average Risk Score
            </div>
          </div>
        </div>

        {/* Score list */}
        <div className="flex w-full flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <h3 className="m-0 text-lg font-extrabold text-text-primary text-center">Risk Scores by Category</h3>
            {highestLevel && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${RISK_STYLES[highestLevel]?.pill ?? 'bg-primary/10 text-primary'}`}
              >
                Top: {highestLevel}
              </span>
            )}
          </div>

          {flagged.length > 0 ? (
            <div className="mb-3 w-full max-w-3xl space-y-3">
              {flagged.map((score, i) => {
                const style = RISK_STYLES[score.risk_level] ?? RISK_STYLES.low
                const pct = Math.round(score.score * 100)
                return (
                  <div
                    key={score.risk_category_name}
                    className={`prof-fade-up group flex flex-col gap-3 rounded-[var(--radius-md)] border bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
                      score.risk_level === 'high' || score.risk_level === 'critical'
                        ? 'border-risk-high bg-risk-high-bg/20'
                        : 'border-border'
                    }`}
                    style={{ animationDelay: `${120 + i * 70}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 bg-primary/10 text-sm font-extrabold text-primary ${style.ring}`}
                      >
                        {score.risk_category_name
                          .split(' ')
                          .map((s) => s[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-extrabold text-text-primary">
                          {score.risk_category_name}
                        </div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.pill}`}
                        >
                          {score.risk_level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-64">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/60">
                        <div
                          className={`prof-grow-bar h-full rounded-full ${style.bar}`}
                          style={{ width: `${pct}%`, animationDelay: `${180 + i * 70}ms` }}
                        />
                      </div>
                      <div className={`w-12 flex-shrink-0 text-right text-[1.35rem] font-extrabold ${style.text}`}>
                        {pct}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="prof-fade-up mb-3 flex w-full max-w-md flex-col items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-6 py-8 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">
                🎉
              </div>
              <p className="m-0 text-sm font-semibold text-text-secondary">
                Excellent! All your risk categories are below 20%. No significant risks detected.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-3 border-t border-border pt-6 pb-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-[var(--radius-md)] border border-primary bg-transparent px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-text-onPrimary"
              onClick={onRestart}
            >
              Start New Assessment
            </button>
            <button
              type="button"
              className="rounded-[var(--radius-md)] border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-text-primary transition-opacity hover:opacity-90"
              onClick={onEdit}
            >
              Edit Assessment
            </button>
          </div>
          <button
            type="button"
            className="justify-self-end rounded-[var(--radius-md)] border border-secondary bg-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md"
            onClick={onSeeRecommendations || (() => alert('Recommendations coming soon!'))}
          >
            See Policy Recommendations →
          </button>
        </div>
      </div>
    </div>
  )
}