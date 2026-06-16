import type { ReactNode } from 'react'
import styles from './AuthLayout.module.css'

interface AuthLayoutProps {
  children: ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className={styles.layout}>
      <section className={styles.branding} aria-label="Platform overview">
        <div className={styles.logo} aria-hidden="true">
          IR
        </div>
        <div>
          <p className={styles.kicker}>Insurance Risk Platform</p>
          <h1 className={styles.title}>InsureTech Risk Assessment</h1>
          <p className={styles.tagline}>
            Enterprise-grade workflows for profiling businesses, assessing risk,
            and preparing smarter insurance recommendations.
          </p>
        </div>
        <div className={styles.signalGrid} aria-hidden="true">
          <span>Business Profiling</span>
          <span>Risk Intelligence</span>
          <span>Recommendation Engine</span>
        </div>
      </section>
      <section className={styles.formArea} aria-label="Authentication form">
        {children}
      </section>
    </main>
  )
}

export default AuthLayout
