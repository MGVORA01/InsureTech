import type { ProfilingCompleteOut } from './profiling.types'
import styles from './ProfilingResults.module.css'

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
        {data.scores.filter(s => s.score > 0.2).length > 0 ? (
          <div className={styles.scoresGrid}>
            {[...data.scores]
              .filter((score) => score.score > 0.2)
              .sort((a, b) => (RISK_WEIGHTS[b.risk_level] || 0) - (RISK_WEIGHTS[a.risk_level] || 0))
              .map((score) => (
                <div
                  key={score.risk_category_name}
                  className={`${styles.scoreCard} ${
                    score.risk_level === 'high' ? styles.scoreCardHigh : ''
                  }`}
                >
                  <span className={styles.scoreCardName}>{score.risk_category_name}</span>
                  <span className={`${styles.scoreCardLevel} ${styles[`level${score.risk_level.charAt(0).toUpperCase() + score.risk_level.slice(1)}` as keyof typeof styles] || ''}`}>
                    {score.risk_level.toUpperCase()}
                  </span>
                  <span className={styles.scoreCardValue}>{Math.round(score.score * 100)}%</span>
                </div>
              ))}
          </div>
        ) : (
          <p className={styles.subtitle} style={{ marginTop: '0.5rem' }}>
            Excellent! All your risk categories are below 20%. No significant risks detected.
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.recommendationsBtn} onClick={onSeeRecommendations || (() => alert('Recommendations coming soon!'))}>
          See Policy Recommendations
        </button>
        <button type="button" className={styles.restartBtn} onClick={onRestart}>
          Start New Assessment
        </button>
      </div>
    </div>
  )
}
