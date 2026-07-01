import type { ProfilingCompleteOut } from './profiling.types'
import { RISK_LEVEL_LABELS } from './profiling.constants'
import styles from './ProfilingResults.module.css'

interface ProfilingResultsProps {
  data: ProfilingCompleteOut
  onRestart: () => void
  onViewRecommendations?: (sessionId: string) => void
}

function riskLevelClass(level: string): string {
  switch (level) {
    case 'low': return styles.low
    case 'medium': return styles.medium
    case 'high': return styles.high
    default: return ''
  }
}

export default function ProfilingResults({ data, onRestart, onViewRecommendations }: ProfilingResultsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.checkmark}>✓</div>
        <h2 className={styles.title}>Risk Profiling Complete</h2>
        <p className={styles.subtitle}>
          Your business risk assessment has been completed successfully.
        </p>
      </div>

      <div className={styles.scoresSection}>
        <h3 className={styles.sectionTitle}>Risk Scores by Category</h3>
        <div className={styles.scoresList}>
          {data.scores.map((score) => (
            <div key={score.risk_category_name} className={styles.scoreCard}>
              <div className={styles.scoreHeader}>
                <h4 className={styles.categoryName}>{score.risk_category_name}</h4>
                <span className={`${styles.riskBadge} ${riskLevelClass(score.risk_level)}`}>
                  {RISK_LEVEL_LABELS[score.risk_level] || score.risk_level}
                </span>
              </div>

              <div className={styles.scoreBar}>
                <div
                  className={`${styles.scoreFill} ${riskLevelClass(score.risk_level)}`}
                  style={{ width: `${Math.min(score.score * 100, 100)}%` }}
                />
              </div>

              <span className={styles.scoreValue}>
                {Math.round(score.score * 100)}%
              </span>

              {score.factor_breakdown && Object.keys(score.factor_breakdown).length > 0 && (
                <div className={styles.breakdown}>
                  <p className={styles.breakdownTitle}>Factor Breakdown</p>
                  {Object.entries(score.factor_breakdown).map(([factor, factorScore]) => (
                    <div key={factor} className={styles.factorRow}>
                      <span className={styles.factorName}>{factor}</span>
                      <div className={styles.factorBar}>
                        <div
                          className={`${styles.factorFill} ${riskLevelClass(
                            factorScore < 0.3 ? 'low' : factorScore < 0.6 ? 'medium' : 'high'
                          )}`}
                          style={{ width: `${Math.min(factorScore * 100, 100)}%` }}
                        />
                      </div>
                      <span className={styles.factorValue}>
                        {Math.round(factorScore * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        {onViewRecommendations && (
          <button
            type="button"
            className={styles.recommendBtn}
            onClick={() => onViewRecommendations(data.session.id)}
          >
            View Recommendations
          </button>
        )}
        <button type="button" className={styles.restartBtn} onClick={onRestart}>
          Start New Assessment
        </button>
      </div>
    </div>
  )
}
