import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AuthModalTab } from '../features/auth-modal/AuthModal'

function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const openAuthRoute = useCallback(
    (tab: AuthModalTab) => {
      const path =
        tab === 'register'
          ? '/register'
          : tab === 'forgotPassword'
          ? '/forgot-password'
          : '/login'
      // keep current location as background so App can render the modal over it
      navigate(path, { state: { backgroundLocation: location } })
    },
    [navigate, location]
  )

  return (
    <div className="relative min-h-screen bg-background">
      {/* Page content — blurred while the auth modal is open (handled by modal via background state) */}
      <div className="transition-[filter] duration-300">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-[var(--overlay-surface-80)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-text-onPrimary">
                IR
              </span>
              <span className="text-lg font-bold text-primary">InsureTech</span>
            </div>

            <nav className="hidden items-center gap-8 text-sm font-medium text-text-secondary md:flex">
              <a className="transition hover:text-primary" href="#features">
                Features
              </a>
              <a className="transition hover:text-primary" href="#how-it-works">
                How it works
              </a>
              <a className="transition hover:text-primary" href="#faq">
                FAQ
              </a>
            </nav>

            <button
              className="rounded-md bg-cta px-5 py-2.5 text-sm font-semibold text-cta-contrast shadow-cta transition hover:bg-cta-hover"
              onClick={() => openAuthRoute('login')}
              type="button"
            >
              Get Started
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full bg-[var(--overlay-secondary-10)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
              Insurance Risk Platform
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-text-primary sm:text-5xl">
              Smart insurance for modern businesses
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
              Profile your business, assess risk, and get tailored coverage
              recommendations — all from one secure platform built for
              underwriters and risk teams.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                className="rounded-md bg-cta px-6 py-3 text-base font-semibold text-cta-contrast shadow-cta transition hover:bg-cta-hover"
                onClick={() => openAuthRoute('login')}
                type="button"
              >
                Get Started
              </button>
              <button
                className="rounded-md border border-border-strong px-6 py-3 text-base font-semibold text-primary transition hover:bg-surface-alt"
                onClick={() => openAuthRoute('register')}
                type="button"
              >
                Register
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-[var(--overlay-secondary-10)] blur-2xl" />
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Risk Summary
              </p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                Acme Logistics Co.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Fire &amp; Property</span>
                  <span className="rounded-full bg-risk-lowBg px-3 py-1 text-xs font-bold text-risk-low">
                    Low
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Liability</span>
                  <span className="rounded-full bg-risk-mediumBg px-3 py-1 text-xs font-bold text-risk-medium">
                    Medium
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Cyber Exposure</span>
                  <span className="rounded-full bg-risk-highBg px-3 py-1 text-xs font-bold text-risk-high">
                    High
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-md bg-surface-alt p-4">
                <p className="text-sm font-semibold text-text-primary">
                  Recommended coverage
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  General liability + cyber endorsement
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-surface" id="features">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-bold text-text-primary">
              Everything your risk team needs
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
              From first profile to final policy, manage the entire risk
              assessment workflow in one place.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-border p-6 transition hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--overlay-secondary-10)] text-secondary">
                  <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
                    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary">Instant quotes</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Generate accurate, data-backed quotes in minutes, not days.
                </p>
              </div>

              <div className="rounded-lg border border-border p-6 transition hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--overlay-secondary-10)] text-secondary">
                  <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary">Secure by design</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Enterprise-grade encryption keeps every business profile protected.
                </p>
              </div>

              <div className="rounded-lg border border-border p-6 transition hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-[var(--overlay-secondary-10)] text-secondary">
                  <svg fill="none" height="22" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22">
                    <path d="M3 17h18M3 12h18M3 7h18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="font-semibold text-text-primary">Structured profiling</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Capture every risk signal with guided business profiling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="bg-primary">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="text-3xl font-bold text-text-onPrimary">
              Ready to assess your risk?
            </h2>
            <p className="max-w-md text-[var(--overlay-on-primary-80)]">
              Create your workspace in minutes and start building a structured
              risk profile for your business.
            </p>
            <button
              className="rounded-md bg-cta px-6 py-3 text-base font-semibold text-cta-contrast shadow-cta transition hover:bg-cta-hover"
              onClick={() => openAuthRoute('register')}
              type="button"
            >
              Get Started
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-text-tertiary">
            © {new Date().getFullYear()} InsureTech. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}

export default HomePage
