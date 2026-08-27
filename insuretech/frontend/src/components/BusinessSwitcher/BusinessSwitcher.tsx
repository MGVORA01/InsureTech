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

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

interface BusinessSwitcherProps {
  businesses: BusinessProfile[]
  selectedBusinessId: string | null
  onBusinessChange: (businessId: string) => void
  onAddBusiness: () => void
  onDeleteBusiness?: (businessId: string) => void
}

export default function BusinessSwitcher({
  businesses,
  selectedBusinessId,
  onBusinessChange,
  onAddBusiness,
  onDeleteBusiness,
}: BusinessSwitcherProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
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
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-all duration-200 hover:shadow-sm"
        style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: '18px', 
          boxShadow: '0 14px 40px rgba(20,20,19,0.045)',
          border: '1px solid rgba(0,0,0,0.04)'
        }}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center text-base font-bold text-white transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: '#CF4500', borderRadius: '16px' }}
        >
          {selected
            ? selected.business_name.slice(0, 2).toUpperCase()
            : '?'}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-bold tracking-tight" style={{ color: '#111827' }}>
            {selected?.business_name || 'No business selected'}
          </p>
          <p className="truncate text-[14px] font-semibold mt-1" style={{ color: '#6B7280' }}>
            {selected
              ? [selected.segment?.name, selected.industry?.name].filter(Boolean).join(' · ')
              : 'Create a business profile to get started'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {businesses.length > 1 && (
            <span
              className="hidden px-2.5 py-1 text-[11px] font-bold sm:inline-block"
              style={{ backgroundColor: 'rgba(207, 69, 0, 0.08)', color: '#CF4500', borderRadius: '999px' }}
            >
              {businesses.length} businesses
            </span>
          )}
          <IconChevronDown
            className={`h-6 w-6 shrink-0 transition-transform duration-250 ease-out ${dropdownOpen ? 'rotate-180' : ''}`}
            style={{ color: '#9CA3AF' }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden border shadow-lg"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)' }}
        >
          {businesses.length === 0 && (
            <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              No businesses yet
            </p>
          )}
          {businesses.map((b) => {
            const isSelected = b.id === selectedBusinessId
            const isConfirming = confirmingDeleteId === b.id
            return (
              <div key={b.id}>
                {isConfirming ? (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <span className="text-sm" style={{ color: 'var(--color-risk-high)' }}>Delete {b.business_name}?</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmingDeleteId(null)
                        onDeleteBusiness?.(b.id)
                      }}
                      className="rounded px-2.5 py-1 text-xs font-semibold text-white transition"
                      style={{ backgroundColor: 'var(--color-risk-high)' }}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmingDeleteId(null)
                      }}
                      className="rounded px-2.5 py-1 text-xs font-semibold transition hover:[background-color:var(--color-border)]"
                      style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-primary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onBusinessChange(b.id)
                      setDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:[background-color:var(--color-hover)]"
                    style={{
                      backgroundColor: isSelected ? 'var(--overlay-secondary-10, rgba(207,69,0,0.06))' : 'transparent',
                    }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}
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
                    {onDeleteBusiness && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmingDeleteId(b.id)
                        }}
                        className="shrink-0 rounded p-1 transition hover:[background-color:var(--color-risk-high-bg)] hover:[color:var(--color-risk-high)]"
                        style={{ color: 'var(--color-text-muted)' }}
                        title={`Delete ${b.business_name}`}
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    )}
                  </button>
                )}
              </div>
            )
          })}
          <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                onAddBusiness()
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition hover:[background-color:var(--color-hover)]"
              style={{ color: 'var(--color-secondary)' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center"
                style={{ border: '2px dashed var(--color-secondary)', color: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}
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
