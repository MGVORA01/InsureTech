import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AuthModal from '../features/auth-modal/AuthModal'
import type { AuthModalTab } from '../features/auth-modal/AuthModal'

function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab | null>(null)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', onScroll)
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const insuranceCategories = [
    {
      title: 'Fire Insurance',
      desc: 'Protection against fire-related damage.',
      color: 'var(--color-risk-high)',
      bg: 'rgba(192,57,43,0.1)',
      icon: <path d="M12 2c1 4-3 5-3 9a4 4 0 0 0 8 0c0-2-1-3-1-3s1 3-1 4c1-3-2-4-1-7-2 1-3 3-3 5a3 3 0 0 0 0 .2C9.5 12 8 9.5 8 7c0-2 2-4 4-5z" />,
    },
    {
      title: 'Machinery Breakdown',
      desc: 'Coverage for machinery failures and repairs.',
      color: 'var(--color-secondary)',
      bg: 'rgba(13,115,119,0.1)',
      icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.4 7.4 0 0 0 .1-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.3-2.5H9.8l-.3 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.3 2.5h4.4l.3-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5z" />,
    },
    {
      title: 'Property Insurance',
      desc: 'Protection for buildings and business assets.',
      color: 'var(--color-primary)',
      bg: 'rgba(26,58,92,0.08)',
      icon: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-4v-6H8v6H4a1 1 0 0 1-1-1v-9z" />,
    },
    {
      title: 'Employee Insurance',
      desc: 'Coverage for workforce health and safety.',
      color: 'var(--color-cta)',
      bg: 'rgba(224,123,57,0.12)',
      icon: (
        <>
          <circle cx="9" cy="7" r="3" />
          <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
          <circle cx="17" cy="8" r="2.2" />
          <path d="M21 21v-1.5a3.5 3.5 0 0 0-3-3.46" />
        </>
      ),
    },
    {
      title: 'Inventory Insurance',
      desc: 'Protection against inventory losses.',
      color: 'var(--color-secondary-dark)',
      bg: 'rgba(9,84,87,0.1)',
      icon: (
        <>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 7v10l9 4 9-4V7" />
          <path d="M12 11v10" />
        </>
      ),
    },
    {
      title: 'Liability Insurance',
      desc: 'Coverage against legal liabilities.',
      color: 'var(--color-primary-light)',
      bg: 'rgba(44,80,120,0.1)',
      icon: <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />,
    },
  ]

  const VISIBLE_CARDS = 3
  const CARD_WIDTH = 280
  const GAP = 20
  const STEP = CARD_WIDTH + GAP

  const loopedCategories = [...insuranceCategories, ...insuranceCategories.slice(0, VISIBLE_CARDS)]

  const [carouselIndex, setCarouselIndex] = useState(0)
  const [carouselTransition, setCarouselTransition] = useState(true)
  const [isCarouselPaused, setIsCarouselPaused] = useState(false)

  useEffect(() => {
    if (isCarouselPaused) return
    const timer = setInterval(() => {
      setCarouselIndex((prev) => prev + 1)
    }, 3000)
    return () => clearInterval(timer)
  }, [isCarouselPaused])

  useEffect(() => {
    if (carouselIndex === insuranceCategories.length) {
      const resetTimer = setTimeout(() => {
        setCarouselTransition(false)
        setCarouselIndex(0)
      }, 600)
      return () => clearTimeout(resetTimer)
    } else {
      setCarouselTransition(true)
    }
  }, [carouselIndex, insuranceCategories.length])

  useEffect(() => {
    if (!carouselTransition) {
      const id = requestAnimationFrame(() => setCarouselTransition(true))
      return () => cancelAnimationFrame(id)
    }
  }, [carouselTransition])

  const navLinkClass = (isScrolled: boolean) =>
    `relative transition-opacity duration-200 ${
      isScrolled
        ? 'text-text-primary opacity-85 hover:opacity-100'
        : 'text-text-onPrimary opacity-85 hover:opacity-100'
    }`

  const navItems = ['Home', 'Features', 'How It Works', 'AI Assistant', 'Reviews', 'Contact']

  return (
    <>
      {/* Header */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
          scrolled
            ? 'bg-white/55 backdrop-blur-md shadow-card border-b border-white/40'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 lg:h-[68px]">
            <a href="#" className="flex items-center gap-2.5 shrink-0">
              <span
                className="w-8 h-8 rounded-sm flex items-center justify-center"
                style={{ background: 'var(--color-secondary)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M9 12L11 14L15.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span
                className={`font-semibold text-lg tracking-tight transition-colors duration-300 ${
                  scrolled ? 'text-text-primary' : 'text-text-onPrimary'
                }`}
              >
                InsureTech
              </span>
            </a>

            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
              {navItems.map((item) => {
                const href = '#' + item.toLowerCase().replace(/\s+/g, '-')
                return (
                  <a key={item} href={href} className={navLinkClass(scrolled)}>
                    {item}
                    <span
                      className="absolute left-0 -bottom-[6px] h-[2px] transition-all duration-200"
                      style={{ background: 'var(--color-cta)', width: '0%' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = '100%' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = '0%' }}
                    />
                  </a>
                )
              })}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => setAuthModalTab('login')}
                className={`text-sm font-medium px-4 py-2 rounded-md border transition-all duration-200 ${
                  scrolled
                    ? 'text-text-primary border-border-strong hover:bg-surface-alt'
                    : 'text-text-onPrimary border-white/40 hover:border-white/80 hover:bg-white/10'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setAuthModalTab('register')}
                className="text-sm font-semibold px-5 py-2.5 rounded-md transition-all duration-200"
                style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}
              >
                Get Started
              </button>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-sm"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`transition-colors duration-300 ${scrolled ? 'text-text-primary' : 'text-text-onPrimary'}`}
              >
                {menuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden bg-white/80 backdrop-blur-md border-t border-border shadow-card">
            <nav className="flex flex-col px-6 py-4 gap-3 text-sm font-medium text-text-primary">
              {navItems.map((item) => {
                const href = '#' + item.toLowerCase().replace(/\s+/g, '-')
                return (
                  <a key={item} href={href} className="py-1.5" onClick={() => setMenuOpen(false)}>
                    {item}
                  </a>
                )
              })}
              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  onClick={() => { setMenuOpen(false); setAuthModalTab('login') }}
                  className="flex-1 text-center px-4 py-2 rounded-md border border-border-strong text-text-primary"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setAuthModalTab('register') }}
                  className="flex-1 text-center px-4 py-2 rounded-md font-semibold"
                  style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
                >
                  Get Started
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32"
        style={{
          background:
            'linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 55%, var(--color-secondary-dark) 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                Built for Manufacturing &amp; Retail MSMEs
              </span>

              <h1 className="mt-5 text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white">
                Find the Right Insurance for Your{' '}
                <span style={{ color: 'var(--color-cta)' }}>MSME</span>
              </h1>

              <p className="mt-5 text-base lg:text-lg leading-relaxed text-white/70 max-w-xl">
                Our platform analyzes your business profile and recommends suitable
                insurance policies from our curated database for Manufacturing and
                Retail businesses.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setAuthModalTab('register')}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-md transition-all duration-200"
                  style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}
                >
                  Get Started
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <a href="#features"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-md border border-white/30 text-white hover:bg-white/10 transition-colors duration-200"
                >
                  Explore Features
                </a>
              </div>

              <div className="mt-10 flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-white">5</p>
                  <p className="text-sm text-white/60">Insurance categories</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="text-sm text-white/60">Industries supported</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div>
                  <p className="text-2xl font-bold text-white">24/7</p>
                  <p className="text-sm text-white/60">AI assistant</p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 560 520" className="w-full max-w-md lg:max-w-lg">
                <circle cx="300" cy="270" r="220" fill="white" opacity="0.05" />
                <circle cx="180" cy="120" r="60" fill="var(--color-cta)" opacity="0.15" />

                <rect x="120" y="240" width="320" height="190" rx="10" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
                <path d="M100 250 L280 150 L460 250 Z" fill="var(--color-secondary-light)" />

                <rect x="150" y="270" width="44" height="44" rx="6" fill="white" opacity="0.18" />
                <rect x="218" y="270" width="44" height="44" rx="6" fill="white" opacity="0.18" />
                <rect x="286" y="270" width="44" height="44" rx="6" fill="white" opacity="0.18" />
                <rect x="354" y="270" width="44" height="44" rx="6" fill="white" opacity="0.18" />

                <rect x="260" y="350" width="60" height="80" rx="4" fill="var(--color-secondary)" />
                <rect x="150" y="350" width="80" height="50" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                <rect x="350" y="350" width="80" height="50" rx="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

                <g transform="translate(380, 95)">
                  <path d="M50 0L95 18V52C95 84 75 108 50 118C25 108 5 84 5 52V18L50 0Z" fill="var(--color-cta)" />
                  <path d="M30 60L44 75L72 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>

                <g transform="translate(40, 330)">
                  <rect x="0" y="0" width="120" height="76" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <text x="14" y="24" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.6)" fontFamily="Inter, sans-serif">RISK SCORE</text>
                  <text x="14" y="52" fontSize="22" fontWeight="700" fill="#4ADE80" fontFamily="Inter, sans-serif">Low</text>
                  <circle cx="98" cy="46" r="14" fill="rgba(74,222,128,0.2)" />
                  <path d="M92 46l4 4 8-9" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>

                <g transform="translate(330, 410)">
                  <rect x="0" y="0" width="170" height="68" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <text x="14" y="22" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.6)" fontFamily="Inter, sans-serif">RECOMMENDED</text>
                  <text x="14" y="46" fontSize="14" fontWeight="700" fill="white" fontFamily="Inter, sans-serif">Fire + Machinery</text>
                  <circle cx="148" cy="34" r="6" fill="var(--color-cta)" />
                </g>

                <path d="M160 360 L160 330" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M400 410 L400 390" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Industries */}
      <section className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-secondary)' }}>
              Who it's for
            </span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
              Built for Growing MSMEs
            </h2>
            <p className="mt-3 text-base lg:text-lg text-text-secondary">
              Tell us your industry once, and every recommendation is shaped around
              the risks your business actually faces.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="group relative rounded-lg border border-border bg-surface p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card hover:border-[var(--color-secondary-light)]">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--color-secondary)' }} />

              <svg
                className="absolute -top-4 -right-4 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.07]"
                width="160" height="160" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-secondary)" strokeWidth="1.5"
              >
                <path d="M2 22V11l6-4v4l6-4v4l8-5v16H2z" />
                <line x1="6" y1="22" x2="6" y2="16" />
                <line x1="14" y1="22" x2="14" y2="16" />
              </svg>

              <div className="relative flex items-start justify-between">
                <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: 'rgba(13,115,119,0.1)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 22V11l6-4v4l6-4v4l8-5v16H2z" />
                    <line x1="6" y1="22" x2="6" y2="16" />
                    <line x1="14" y1="22" x2="14" y2="16" />
                  </svg>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(13,115,119,0.1)', color: 'var(--color-secondary-dark)' }}>
                  5 policy types
                </span>
              </div>

              <h3 className="relative mt-5 text-xl font-semibold text-text-primary">Manufacturing</h3>
              <p className="relative mt-1.5 text-sm text-text-secondary">Protect:</p>
              <ul className="relative mt-4 space-y-2.5">
                {['Machinery', 'Factory Assets', 'Employees', 'Inventory'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-text-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <a href="#features" className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200" style={{ color: 'var(--color-secondary)' }}>
                Explore manufacturing cover
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            <div className="group relative rounded-lg border border-border bg-surface p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card hover:border-[var(--color-cta)]">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--color-cta)' }} />

              <svg
                className="absolute -top-4 -right-4 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.07]"
                width="160" height="160" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-cta)" strokeWidth="1.5"
              >
                <path d="M3 9l1-5h16l1 5" />
                <path d="M3 9h18v11H3z" />
                <path d="M9 13h6" />
              </svg>

              <div className="relative flex items-start justify-between">
                <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: 'rgba(224,123,57,0.12)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l1-5h16l1 5" />
                    <path d="M3 9h18v11H3z" />
                    <path d="M9 13h6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(224,123,57,0.12)', color: 'var(--color-cta-hover)' }}>
                  4 policy types
                </span>
              </div>

              <h3 className="relative mt-5 text-xl font-semibold text-text-primary">Retail</h3>
              <p className="relative mt-1.5 text-sm text-text-secondary">Protect:</p>
              <ul className="relative mt-4 space-y-2.5">
                {['Shops', 'Stock', 'Equipment', 'Staff'].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-text-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <a href="#features" className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200" style={{ color: 'var(--color-cta)' }}>
                Explore retail cover
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Categories */}
      <section className="py-20 lg:py-28 bg-background overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-cta)' }}>
              Coverage options
            </span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
              Insurance Solutions We Recommend
            </h2>
          </div>
        </div>

        <div
          className="mt-12 mx-auto overflow-hidden"
          style={{ width: VISIBLE_CARDS * CARD_WIDTH + (VISIBLE_CARDS - 1) * GAP }}
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
        >
          <div
            className="flex"
            style={{
              gap: GAP,
              transform: `translateX(-${carouselIndex * STEP}px)`,
              transition: carouselTransition ? 'transform 0.6s ease' : 'none',
            }}
          >
            {loopedCategories.map((card, i) => (
              <div
                key={`${card.title}-${i}`}
                className="shrink-0 rounded-lg border border-border bg-surface p-7 hover:shadow-card transition-shadow duration-300"
                style={{ width: CARD_WIDTH }}
              >
                <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: card.bg }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {card.icon}
                  </svg>
                </div>
                <h3 className="mt-5 text-base font-semibold text-text-primary">{card.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {insuranceCategories.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
              style={{
                background:
                  i === carouselIndex % insuranceCategories.length
                    ? 'var(--color-cta)'
                    : 'var(--color-border-strong)',
              }}
            />
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-secondary)' }}>
              Why InsureTech
            </span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary lg:whitespace-nowrap">
              Smarter Insurance Decisions, Powered by AI
            </h2>
            <p className="mt-3 text-base lg:text-lg text-text-secondary">
              From risk analysis to policy matching, every step is designed to save you time
              and protect what matters.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'AI Risk Scoring',
                desc: 'Get an instant risk assessment based on your business profile, industry, and assets.',
                color: 'var(--color-secondary)',
                bg: 'rgba(13,115,119,0.1)',
                icon: (
                  <>
                    <path d="M12 2L3 6v5c0 5.5 3.8 9.7 9 11 5.2-1.3 9-5.5 9-11V6l-9-4z" />
                    <path d="M9 12l2 2 4-4.5" />
                  </>
                ),
              },
              {
                title: 'Smart Policy Matching',
                desc: 'Our engine compares your profile against a curated database to find the best-fit policies.',
                color: 'var(--color-cta)',
                bg: 'rgba(224,123,57,0.12)',
                icon: (
                  <>
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.5" y2="16.5" />
                    <path d="M8 11l2 2 3.5-3.5" />
                  </>
                ),
              },
              {
                title: 'IRDAI-Compliant',
                desc: 'Every recommendation is checked against current IRDAI guidelines, so you stay compliant.',
                color: 'var(--color-primary)',
                bg: 'rgba(26,58,92,0.08)',
                icon: (
                  <>
                    <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
                    <path d="M9 12l2 2 4-4.5" />
                  </>
                ),
              },
              {
                title: '24/7 AI Assistant',
                desc: 'Ask questions about your coverage anytime — get clear, instant answers in plain language.',
                color: 'var(--color-secondary-dark)',
                bg: 'rgba(9,84,87,0.1)',
                icon: (
                  <>
                    <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                    <path d="M21 4l-9.4 9.4" />
                    <path d="M17 4h4v4" />
                  </>
                ),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-lg border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card"
              >
                <div className="w-12 h-12 rounded-md flex items-center justify-center" style={{ background: feature.bg }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={feature.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-5 text-base font-semibold text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-cta)' }}>
              Simple process
            </span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
              How It Works
            </h2>
            <p className="mt-3 text-base lg:text-lg text-text-secondary">
              From business profile to policy in four simple steps.
            </p>
          </div>

          <div className="mt-16 relative">
            <div className="hidden lg:block absolute top-7 left-0 right-0 h-px" style={{ background: 'var(--color-border-strong)' }} />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
              {[
                { step: '01', title: 'Share Your Profile', desc: 'Tell us your industry, business size, and assets in a quick guided form.' },
                { step: '02', title: 'AI Analyzes Risk', desc: 'Our engine scores your risk exposure across fire, machinery, liability, and more.' },
                { step: '03', title: 'Get Matched Policies', desc: 'Receive a curated shortlist of policies that fit your specific risk profile.' },
                { step: '04', title: 'Compare & Apply', desc: 'Compare coverage, premiums, and insurers side-by-side, then apply directly.' },
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div
                    className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-text-on-primary)' }}
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="ai-assistant" className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-secondary)' }}>
                Always available
              </span>
              <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
                Your 24/7 Insurance Assistant
              </h2>
              <p className="mt-4 text-base lg:text-lg text-text-secondary leading-relaxed">
                Have a question about your coverage, a claim, or which policy fits your business?
                Our AI assistant gives you clear answers in plain language, any time of day.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  'Explains policy terms in simple language',
                  'Helps you compare coverage options',
                  'Guides you through claims step-by-step',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-text-primary">
                    <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(13,115,119,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <Link to="/chat"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-md transition-all duration-200"
                style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
              >
                Try the Assistant
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-lg border border-border bg-surface shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'var(--color-primary)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-cta)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                      <path d="M21 4l-9.4 9.4" />
                      <path d="M17 4h4v4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">InsureTech Assistant</p>
                    <p className="text-xs text-white/60 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Online
                    </p>
                  </div>
                </div>

                <div className="px-5 py-6 space-y-4 bg-background min-h-[280px]">
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--color-secondary)', color: 'white' }}>
                      Do I need fire insurance for my small textile unit?
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-4 py-2.5 text-sm bg-surface border border-border text-text-primary">
                      Yes — textile units handle flammable materials, so fire insurance is
                      strongly recommended. Based on similar businesses, I'd suggest
                      covering machinery and inventory too.
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--color-secondary)', color: 'white' }}>
                      Can you show me matching plans?
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="rounded-lg px-4 py-3 bg-surface border border-border flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: 'var(--color-text-tertiary)', animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-5 py-4 border-t border-border bg-surface">
                  <div className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm text-text-tertiary">
                    Ask about your coverage...
                  </div>
                  <button className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--color-cta)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className="hidden lg:flex absolute -top-5 -right-5 items-center gap-2 px-4 py-2.5 rounded-md shadow-card"
                style={{ background: 'var(--color-cta)', color: 'white' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
                <span className="text-xs font-semibold">Instant Answers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="py-20 lg:py-28 bg-surface">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-wide uppercase text-text-tertiary">
              Recommendations sourced from India's trusted insurers
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {['HDFC ERGO', 'Bajaj Allianz', 'ICICI Lombard', 'Tata AIG', 'New India Assurance'].map((name) => (
                <span key={name} className="text-lg font-semibold text-text-tertiary/80 tracking-tight">
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-16 mb-16 h-px bg-border" />

          <div className="max-w-2xl mx-auto text-center">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--color-secondary)' }}>
              What business owners say
            </span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold tracking-tight text-text-primary">
              Trusted by MSME Owners
            </h2>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { quote: 'InsureTech helped me understand exactly what coverage my factory needed within minutes. No more guesswork.', name: 'Ramesh Patel', role: 'Owner, Textile Manufacturing Unit' },
              { quote: 'The AI assistant answered every question I had about claims. It felt like talking to an actual advisor.', name: 'Sunita Mehra', role: 'Founder, Retail Chain' },
              { quote: 'Comparing policies side-by-side saved us both time and money. The risk score was spot on for our business.', name: 'Arjun Nair', role: 'Director, Auto Parts Manufacturing' },
            ].map((t) => (
              <div key={t.name} className="rounded-lg border border-border bg-background p-7">
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path
                    d="M0 22V13.2C0 8.4 1.5 4.8 4.5 2.4C6 1.2 7.8 0.4 9.6 0L10.8 3.2C9 3.8 7.6 4.8 6.6 6.2C5.6 7.6 5.1 9 5.1 10.4H10V22H0ZM17.2 22V13.2C17.2 8.4 18.7 4.8 21.7 2.4C23.2 1.2 25 0.4 26.8 0L28 3.2C26.2 3.8 24.8 4.8 23.8 6.2C22.8 7.6 22.3 9 22.3 10.4H27.2V22H17.2Z"
                    fill="var(--color-cta)"
                    opacity="0.3"
                  />
                </svg>
                <p className="mt-4 text-sm text-text-primary leading-relaxed">{t.quote}</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--color-primary)', color: 'white' }}>
                    {t.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA + Contact */}
      <section
        id="contact"
        className="relative overflow-hidden py-20 lg:py-28"
        style={{
          background:
            'linear-gradient(160deg, var(--color-primary-dark) 0%, var(--color-primary) 55%, var(--color-secondary-dark) 100%)',
        }}
      >
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full"
          style={{ background: 'white', opacity: 0.05 }}
        />
        <div
          className="absolute top-1/2 -right-20 w-72 h-72 rounded-full"
          style={{ background: 'var(--color-cta)', opacity: 0.12 }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">

            {/* LEFT: Closing CTA */}
            <div className="lg:pt-6">
              <span
                className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                Get started today
              </span>

              <h2 className="mt-5 text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Ready to Protect Your Business?
              </h2>
              <p className="mt-4 text-base lg:text-lg text-white/70 max-w-md leading-relaxed">
                Get matched with the right insurance policies in minutes. No paperwork
                headaches, no guesswork — just clear, AI-backed recommendations.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => setAuthModalTab('register')}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3.5 rounded-md transition-all duration-200"
                  style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
                >
                  Get Started Free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>

              <ul className="mt-10 space-y-3">
                {['No paperwork to get started', 'Free risk assessment', 'Cancel anytime'].map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm text-white/80">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,255,255,0.12)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* RIGHT: Contact Us */}
            <div>
              <h3 className="text-xl font-semibold text-white">Contact Us</h3>
              <p className="mt-2 text-sm text-white/60">
                Have a question before you get started? Reach out directly or send us a message.
              </p>

              {/* Contact info list: email / phone, side by side */}
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                {[
                  {
                    label: 'Email',
                    value: 'aiinsuretech@gmail.com',
                    href: 'mailto:aiinsuretech@gmail.com',
                    icon: (
                      <>
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 6l-10 7L2 6" />
                      </>
                    ),
                  },
                  {
                    label: 'Phone',
                    value: '+91 98765 43210',
                    href: 'tel:+919876543210',
                    icon: (
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    ),
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 group"
                  >
                    <span
                      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {item.icon}
                      </svg>
                    </span>
                    <span>
                      <span className="block text-xs text-white/50">{item.label}</span>
                      <span className="block text-sm font-medium text-white group-hover:text-[var(--color-cta)] transition-colors duration-200">
                        {item.value}
                      </span>
                    </span>
                  </a>
                ))}
              </div>

              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-xs font-medium text-white/70 mb-1.5">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      placeholder="Your name"
                      className="w-full rounded-md px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors duration-200 focus:border-[var(--color-cta)]"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-white/70 mb-1.5">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="you@company.com"
                      className="w-full rounded-md px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors duration-200 focus:border-[var(--color-cta)]"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-white/70 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    placeholder="How can we help?"
                    className="w-full rounded-md px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none resize-none transition-colors duration-200 focus:border-[var(--color-cta)]"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-md transition-all duration-200"
                  style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
                >
                  Send Message
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-primary-dark)] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{ background: 'var(--color-secondary)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M9 12L11 14L15.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="font-semibold text-lg text-white tracking-tight">InsureTech</span>
              </div>
              <p className="mt-4 text-sm text-white/60 leading-relaxed">
                AI-powered insurance advisory built for India's Manufacturing and Retail MSMEs.
              </p>
            </div>

            {[
              { heading: 'Product', links: ['Features', 'How It Works', 'AI Assistant', 'Pricing'] },
              { heading: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'IRDAI Disclosures'] },
            ].map((col) => (
              <div key={col.heading}>
                <p className="text-sm font-semibold text-white">{col.heading}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-white/60 hover:text-white transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-white/50">
              &copy; 2026 InsureTech. All rights reserved.
            </p>
            <p className="text-xs text-white/50">
              Built for educational &amp; portfolio purposes.
            </p>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          STICKY FLOATING CHAT BUTTON
          Fixed to bottom-right of the viewport, visible across the entire
          page regardless of scroll position (sits outside the normal
          section flow so position:fixed isn't affected by any ancestor's
          position:relative/overflow-hidden). Navigates to the /chat route.
      ==================================================================== */}
      <Link
        to="/chat"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-full shadow-card transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: 'var(--color-cta)', color: 'var(--color-cta-contrast)' }}
        aria-label="Chat with InsureTech AI Assistant"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
          <path d="M21 4l-9.4 9.4" />
          <path d="M17 4h4v4" />
        </svg>
        <span className="text-sm font-semibold">Chat with us</span>
      </Link>

      {authModalTab && (
        <AuthModal
          inline
          initialTab={authModalTab}
          onClose={() => setAuthModalTab(null)}
        />
      )}
    </>
  )
}

export default HomePage
