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
  selectedBusinessId?: string
}

export default function UserLayout({
  activeSection,
  onSectionChange,
  children,
  contentClassName = 'mx-auto max-w-5xl px-6 py-8',
  selectedBusinessId,
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
    <div className="flex min-h-screen bg-background">
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
          selectedBusinessId={selectedBusinessId}
        />
      </UserMobileDrawer>

      {/* Desktop sidebar */}
      <UserDesktopSidebar>
        <UserSidebar
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          selectedBusinessId={selectedBusinessId}
        />
      </UserDesktopSidebar>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className={`mx-0 max-w-[1560px] px-5 py-8 sm:px-6 lg:pl-8 lg:pr-8 lg:py-10 ${contentClassName}`.trim()}>
          {children}
        </div>
      </main>
      </div>
  )
}
