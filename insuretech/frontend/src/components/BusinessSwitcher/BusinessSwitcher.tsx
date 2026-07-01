import { useState, useRef, useEffect } from 'react'
import type { BusinessProfile } from '../../features/profile'

function IconChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

interface BusinessSwitcherProps {
  businesses: BusinessProfile[]
  selectedBusinessId: string | null
  onBusinessChange: (businessId: string) => void
  onAddBusiness: () => void
}

export default function BusinessSwitcher({
  businesses,
  selectedBusinessId,
  onBusinessChange,
  onAddBusiness,
}: BusinessSwitcherProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = businesses.find((b) => b.id === selectedBusinessId)

  return (
    <div ref={dropdownRef} className="relative">
      {/* Current business card — always visible */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex w-full items-center gap-4 rounded-xl border bg-white px-5 py-4 text-left shadow-sm transition hover:shadow-md"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-base font-bold text-white"
          style={{ backgroundColor: 'var(--color-secondary)' }}
        >
          {selected
            ? selected.business_name.slice(0, 2).toUpperCase()
            : '?'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {selected?.business_name || 'No business selected'}
          </p>
          <p className="truncate text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            {selected
              ? [selected.segment?.name, selected.industry?.name].filter(Boolean).join(' · ')
              : 'Create a business profile to get started'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {businesses.length > 1 && (
            <span
              className="hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-block"
              style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(13,115,119,0.1))', color: 'var(--color-secondary)' }}
            >
              {businesses.length} businesses
            </span>
          )}
          <IconChevronDown
            className={`h-5 w-5 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--color-text-tertiary)' }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border bg-white shadow-lg"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {businesses.length === 0 && (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              No businesses yet
            </p>
          )}
          {businesses.map((b) => {
            const isSelected = b.id === selectedBusinessId
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  onBusinessChange(b.id)
                  setDropdownOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                style={{
                  backgroundColor: isSelected ? 'var(--overlay-secondary-10, rgba(13,115,119,0.06))' : 'transparent',
                }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  {b.business_name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {b.business_name}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {[b.segment?.name, b.industry?.name].filter(Boolean).join(' · ') || 'No segment'}
                  </p>
                </div>
                {isSelected && (
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                onAddBusiness()
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition hover:bg-slate-50"
              style={{ color: 'var(--color-secondary)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-dashed"
                style={{ borderColor: 'var(--color-secondary)', color: 'var(--color-secondary)' }}
              >
                <IconPlus className="h-5 w-5" />
              </span>
              Add Business
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
