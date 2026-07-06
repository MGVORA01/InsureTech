import type { ReactNode } from 'react'

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
    <main className="grid min-h-screen grid-cols-[minmax(340px,0.92fr)_minmax(420px,1fr)] bg-[var(--color-background)] max-[860px]:grid-cols-1">
      <section
        className="flex min-h-screen flex-col justify-between gap-8 bg-[linear-gradient(145deg,var(--auth-brand-gradient-start),var(--auth-brand-gradient-end)),var(--color-primary-dark)] p-14 text-[var(--color-text-on-primary)] max-[860px]:min-h-auto max-[860px]:gap-6 max-[860px]:px-6 max-[860px]:py-8 max-[560px]:px-5"
        aria-label="Platform overview"
      >
        <div className="grid gap-[44px] max-[860px]:gap-7">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-[var(--auth-brand-border)] bg-[var(--color-surface)] font-black text-[var(--color-primary-dark)]" aria-hidden="true">
            IR
          </div>
          <div>
            <p className="mb-[14px] m-0 text-[0.82rem] font-extrabold uppercase text-[var(--auth-brand-text-muted)]">Insurance Risk Platform</p>
            <h1 className="m-0 max-w-[560px] text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.98] tracking-normal max-[860px]:text-[2.35rem] max-[860px]:leading-[1.05] max-[560px]:text-[2rem]">{title}</h1>
            <p className="mt-6 max-w-[540px] text-[1.06rem] leading-[1.7] text-[var(--auth-brand-text-subtle)] max-[860px]:mt-4">{tagline}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-3 max-[560px]:grid-cols-1" aria-hidden="true">
          <span className="min-h-[72px] rounded-[var(--radius-md)] border border-[var(--auth-brand-border-soft)] bg-[var(--auth-brand-surface)] p-[14px] text-[0.84rem] font-bold text-[var(--auth-brand-text)]">Business Profiling</span>
          <span className="min-h-[72px] rounded-[var(--radius-md)] border border-[var(--auth-brand-border-soft)] bg-[var(--auth-brand-surface)] p-[14px] text-[0.84rem] font-bold text-[var(--auth-brand-text)]">Risk Intelligence</span>
          <span className="min-h-[72px] rounded-[var(--radius-md)] border border-[var(--auth-brand-border-soft)] bg-[var(--auth-brand-surface)] p-[14px] text-[0.84rem] font-bold text-[var(--auth-brand-text)]">Recommendation Engine</span>
        </div>
      </section>
      <section className="grid items-center bg-[var(--color-background)] p-12 max-[860px]:items-start max-[860px]:px-5 max-[860px]:pb-12 max-[860px]:pt-8" aria-label={formLabel}>
        {children}
      </section>
    </main>
  )
}

export default AuthLayout
