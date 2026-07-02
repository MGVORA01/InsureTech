import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// ---- SVG Icons ---------------

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

function IconLayoutDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconFileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
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

// ---- Nav item component ---------------

interface NavItemProps {
  to: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  active: boolean
  indent?: boolean
  onClick?: () => void
}

function NavItem({ to, icon: Icon, label, active, indent, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition"
      style={{
        backgroundColor: active ? 'var(--overlay-secondary-10, rgba(207,69,0,0.1))' : 'transparent',
        color: active ? 'var(--color-secondary)' : 'var(--color-text-secondary)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <Icon className={`shrink-0 ${indent ? 'h-4 w-4' : 'h-5 w-5'}`} />
      {label}
    </Link>
  )
}

// ---- AdminSidebar (nav content) ---------------

interface AdminSidebarProps {
  onAfterNavigate?: () => void
}

export function AdminSidebar({ onAfterNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const path = location.pathname

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // handled by slice
    }
  }

  const navItems = [
    { to: '/admin/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: IconUsers, label: 'Users' },
    { to: '/admin/users?action=create', icon: IconPlus, label: 'Add User', indent: true },
    { to: '/admin/policies', icon: IconFileText, label: 'Policies' },
    { to: '/admin/policies?action=create', icon: IconPlus, label: 'Add Policy', indent: true },
    { to: '/admin/insurers', icon: IconFileText, label: 'Insurers' },
    { to: '/admin/insurers?action=create', icon: IconPlus, label: 'Add Insurer', indent: true },
    { to: '/admin/categories', icon: IconFileText, label: 'Categories' },
    { to: '/admin/categories?action=create', icon: IconPlus, label: 'Add Category', indent: true },
  ]

  const isActive = (to: string) => {
    const targetPath = to.split('?')[0]
    return path === targetPath || path === to
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <LogoIcon />
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
          InsureTech
        </span>
      </div>

      {/* Nav */}
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            indent={item.indent}
            active={isActive(item.to)}
            onClick={onAfterNavigate}
          />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {user?.fullName
              ? user.fullName.split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
              : 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user?.fullName || 'Admin'}
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

// ---- Layout wrappers ---------------

export function AdminDesktopSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {children}
    </aside>
  )
}

export function AdminMobileTopBar({ onOpenDrawer, onLogout }: { onOpenDrawer: () => void; onLogout: () => void }) {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md lg:hidden"
      style={{ backgroundColor: 'var(--overlay-surface-80)', borderColor: 'var(--color-border)' }}
    >
      <button type="button" onClick={onOpenDrawer} className="rounded-md p-1.5 transition hover:[background-color:var(--color-hover)]" style={{ color: 'var(--color-text-tertiary)' }}>
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
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

export function AdminMobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
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

// ---- Utility components ---------------

export function Banner({ tone, icon: Icon, children }: { tone: 'warning' | 'info' | 'error'; icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; children: React.ReactNode }) {
  const styles = {
    warning: { borderColor: '#fbbf24', backgroundColor: '#fffbeb', color: '#92400e' },
    info: { borderColor: '#bae6fd', backgroundColor: '#f0f9ff', color: '#075985' },
    error: { borderColor: '#fecaca', backgroundColor: '#fef2f2', color: '#991b1b' },
  }
  const s = styles[tone]
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm" style={s}>
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      {children}
    </div>
  )
}

export function IconAlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function IconRefresh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md ${className ?? ''}`} style={{ backgroundColor: 'var(--color-surface-alt)' }} />
  )
}
