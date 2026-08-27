import type { ProfilingCompleteOut } from './profiling.types'

interface ProfilingResultsProps {
  data: ProfilingCompleteOut
  onRestart: () => void
  onSeeRecommendations?: () => void
}

const RISK_WEIGHTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export default function ProfilingResults({ data, onRestart, onSeeRecommendations }: ProfilingResultsProps) {
  return (
    <div className="flex w-full max-w-[1180px] flex-col gap-5">
      <div className="pb-2 text-left">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-risk-low-bg text-[1.5rem] font-bold text-risk-low">✓</div>
        <h2 className="mb-1.5 text-[1.5rem] font-extrabold text-text-primary">Risk Profiling Complete</h2>
        <p className="m-0 text-sm font-semibold text-text-secondary">
          Your business risk assessment has been completed successfully.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-base font-extrabold text-text-primary">Risk Scores by Category</h3>
        {data.scores.filter(s => s.score > 0.2).length > 0 ? (
          <div className="mb-3 flex flex-col gap-2.5">
            {[...data.scores]
              .filter((score) => score.score > 0.2)
              .sort((a, b) => (RISK_WEIGHTS[b.risk_level] || 0) - (RISK_WEIGHTS[a.risk_level] || 0))
              .map((score) => (
                <div
                  key={score.risk_category_name}
                  className={`grid min-h-[3.75rem] items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] ${score.risk_level === 'high' ? 'border-risk-high bg-risk-high-bg' : ''}`}
                >
                  <span className="text-base font-extrabold text-text-primary">{score.risk_category_name}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-bold uppercase ${score.risk_level === 'critical' || score.risk_level === 'high' ? 'bg-risk-high-bg text-risk-high' : score.risk_level === 'medium' ? 'bg-risk-medium-bg text-risk-medium' : 'bg-risk-low-bg text-risk-low'}`}>
                    {score.risk_level.toUpperCase()}
                  </span>
                  <span className="text-right text-[1.5rem] font-extrabold text-text-primary md:text-left">{Math.round(score.score * 100)}%</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-2 text-sm font-semibold text-text-secondary">
            Excellent! All your risk categories are below 20%. No significant risks detected.
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-start gap-3 pt-1">
        <button type="button" className="rounded-[var(--radius-md)] border border-secondary bg-secondary px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" onClick={onSeeRecommendations || (() => alert('Recommendations coming soon!'))}>
          See Policy Recommendations
        </button>
        <button type="button" className="rounded-[var(--radius-md)] border border-primary bg-transparent px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-text-onPrimary" onClick={onRestart}>
          Start New Assessment
        </button>
      </div>
    </div>
  )
}
