import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  UserDesktopSidebar,
  UserMobileDrawer,
  UserMobileTopBar,
  UserSidebar,
} from '../components/UserSidebar'
import type { Section } from '../components/UserSidebar'

interface UserLayoutProps {
  activeSection: Section
  onSectionChange: (section: Section) => void
  children: React.ReactNode
  contentClassName?: string
}

export default function UserLayout({
  activeSection,
  onSectionChange,
  children,
  contentClassName = 'mx-auto max-w-5xl px-6 py-8',
}: UserLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // handled by slice
    }
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Mobile top bar */}
      <UserMobileTopBar
        onOpenDrawer={() => setDrawerOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mobile drawer */}
      <UserMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <UserSidebar
          activeSection={activeSection}
          onSectionChange={(section) => {
            onSectionChange(section)
            setDrawerOpen(false)
          }}
          onAfterNavigate={() => setDrawerOpen(false)}
        />
      </UserMobileDrawer>

      {/* Desktop sidebar */}
      <UserDesktopSidebar>
        <UserSidebar
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </UserDesktopSidebar>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className={contentClassName}>
          {children}
        </div>
      </main>
    </div>
  )
}
