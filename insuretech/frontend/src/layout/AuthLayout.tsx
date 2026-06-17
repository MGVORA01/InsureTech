import type { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  children: ReactNode
  formLabel?: string
  tagline?: string
  title?: string
}

function AuthLayout({
  children,
  formLabel = 'Authentication form',
  tagline = 'Enterprise-grade workflows for profiling businesses, assessing risk, and preparing smarter insurance recommendations.',
  title = 'InsureTech Risk Assessment',
}: AuthLayoutProps) {
  return (
    <main className={styles.layout}>
      <section className={styles.branding} aria-label="Platform overview">
        <div className={styles.brandingContent}>
          <div className={styles.logo} aria-hidden="true">
            IR
          </div>
          <div>
            <p className={styles.kicker}>Insurance Risk Platform</p>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.tagline}>{tagline}</p>
          </div>
        </div>
        <div className={styles.signalGrid} aria-hidden="true">
          <span>Business Profiling</span>
          <span>Risk Intelligence</span>
          <span>Recommendation Engine</span>
        </div>
      </section>
      <section className={styles.formArea} aria-label={formLabel}>
        {children}
      </section>
    </main>
  )
}

export default AuthLayout
