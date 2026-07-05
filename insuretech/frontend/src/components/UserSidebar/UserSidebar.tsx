import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

function LogoIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center" style={{ background: 'var(--color-secondary)', borderRadius: 'var(--radius-sm)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M9 12L11 14L15.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

function IconBuilding(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="6" x2="16" y2="6" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  )
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconMessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconScale(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
      <path d="M2 20h20" />
      <path d="M12 10l4-6" />
      <path d="M12 10l-4-6" />
    </svg>
  )
}

function IconSparkles(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 15l.9 2.6L22 18.5l-2.1.9L19 22l-.9-2.6-2.1-.9 2.1-.9L19 15z" />
      <path d="M4 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  )
}

function IconMessageCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-4-.9L3 21l1.7-4.4a8.4 8.4 0 1 1 16.3-5.1z" />
    </svg>
  )
}

function IconChevronLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconLogOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

interface NavItemProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  active: boolean
  onClick?: () => void
}

function NavItem({ icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-[14px] font-semibold transition-all duration-200 ease-out ${
        active ? 'shadow-sm' : 'hover:bg-black/5 hover:translate-x-0.5'
      }`}
      style={{
        backgroundColor: active ? 'rgba(207, 69, 0, 0.08)' : 'transparent',
        color: active ? '#CF4500' : 'var(--color-text-secondary)',
        borderRadius: '14px',
        position: 'relative',
      }}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={active ? 'font-semibold' : ''}>{label}</span>
    </button>
  )
}

export type Section = 'profile' | 'profiling' | 'recommendation' | 'comparison' | 'chatbot' | 'feedback'

interface UserSidebarProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  onAfterNavigate?: () => void
}

export function UserSidebar({
  activeSection,
  onSectionChange,
  onAfterNavigate,
}: UserSidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // handled by slice
    }
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  const navItems = [
    { section: 'profile' as Section, icon: IconBuilding, label: 'Dashboard' },
    { section: 'profiling' as Section, icon: IconShield, label: 'Risk Assessment' },
    { section: 'recommendation' as Section, icon: IconSparkles, label: 'Recommendation' },
    { section: 'comparison' as Section, icon: IconScale, label: 'Policy Comparison' },
    { section: 'chatbot' as Section, icon: IconMessageCircle, label: 'Chatbot' },
    { section: 'feedback' as Section, icon: IconMessageSquare, label: 'Feedback' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <LogoIcon />
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
          InsureTech
        </span>
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {navItems.map((item) => (
          <NavItem
            key={item.section}
            icon={item.icon}
            label={item.label}
            active={activeSection === item.section}
            onClick={() => {
              onSectionChange(item.section)
              onAfterNavigate?.()
            }}
          />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="sticky bottom-0 border-t px-4 py-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user?.fullName || 'User'}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {user?.email || ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ backgroundColor: 'var(--color-risk-high)' }}
        >
          <IconLogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}

// ---- Layout wrappers (same pattern as AdminSidebar) ---------------

export function UserDesktopSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {children}
    </aside>
  )
}

export function UserMobileTopBar({ onOpenDrawer, onLogout, onBack }: { onOpenDrawer: () => void; onLogout: () => void; onBack?: () => void }) {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md lg:hidden"
      style={{ backgroundColor: 'var(--overlay-surface-80)', borderColor: 'var(--color-border)' }}
    >
      {onBack ? (
        <button type="button" onClick={onBack} className="rounded-md p-1.5 transition hover:[background-color:var(--color-hover)]" style={{ color: 'var(--color-text-tertiary)' }}>
          <IconChevronLeft className="h-6 w-6" />
        </button>
      ) : (
        <button type="button" onClick={onOpenDrawer} className="rounded-md p-1.5 transition hover:[background-color:var(--color-hover)]" style={{ color: 'var(--color-text-tertiary)' }}>
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2">
        <LogoIcon />
        <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>InsureTech</span>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-md p-1.5 transition hover:[background-color:var(--color-hover)]"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <IconLogOut className="h-5 w-5" />
      </button>
    </div>
  )
}

export function UserMobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      )}
      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 top-0 z-50 w-64 transform border-r shadow-xl transition-transform duration-200 lg:hidden"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        {children}
      </div>
    </>
  )
}
