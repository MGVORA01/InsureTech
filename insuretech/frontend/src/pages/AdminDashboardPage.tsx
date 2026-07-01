import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import baseApi from '../api/baseApi'
import { useAuth } from '../hooks/useAuth'

interface DashboardStats {
  total_users: number
  active_users: number
  inactive_users: number
}

interface UploadResult {
  document_id: string
  filename: string
  chunks_count: number
}

interface KnowledgeDocument {
  id: string
  file_name: string
  file_size: number | null
  chunks_count: number
  created_at: string
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25MB

// ---- SVG Icons (inline, no dependency) ---------------

function LogoIcon({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-sm ${className ?? 'h-8 w-8'}`}
      style={{ background: 'var(--color-secondary)' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12L11 14L15.5 9.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function IconShield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
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

function IconUpload(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
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
    </svg>
  )
}

function IconRefresh(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

function IconUserCheck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </svg>
  )
}

function IconUserX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 8 5 5M22 8l-5 5" />
    </svg>
  )
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </svg>
  )
}

function IconMenu(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function IconAlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconCheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ---- helpers --------------------------------------------------------------

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name?: string) {
  if (!name) return 'A'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ---- navigation sections --------------------------------------------------

const NAV_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconHome },
  { id: 'upload-pdf', label: 'Upload PDF', icon: IconUpload },
  { id: 'documents', label: 'Documents', icon: IconFileText },
  { id: 'profile', label: 'Profile', icon: IconUser },
] as const

// ---- scroll-reveal hook ----------------------------------------------------
// Sections fade/slide into place the first time they enter the viewport, so the
// page reads as a guided sequence rather than a wall of cards. Respects
// prefers-reduced-motion and only fires once per section.

function useRevealed<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

function revealClass(visible: boolean) {
  return `transition-all duration-700 ease-out will-change-transform ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
  }`
}

// ---- small shared UI pieces ------------------------------------------------

function Banner({
  tone,
  icon: Icon,
  children,
  onDismiss,
}: {
  tone: 'success' | 'error' | 'warning'
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
  children: React.ReactNode
  onDismiss?: () => void
}) {
  const tones = {
    success: { border: '#a7f3d0', bg: '#ecfdf5', fg: '#065f46', icon: '#059669' },
    error: { border: '#fecaca', bg: '#fef2f2', fg: '#991b1b', icon: '#dc2626' },
    warning: { border: '#fde68a', bg: '#fffbeb', fg: '#92400e', icon: '#d97706' },
  }[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className="mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{ borderColor: tones.border, backgroundColor: tones.bg, color: tones.fg }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tones.icon }} />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="rounded p-0.5 transition hover:opacity-70">
          <IconX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded ${className ?? ''}`} style={{ backgroundColor: 'var(--color-surface-alt)' }} />
}

// ---- sidebar content (shared between desktop rail and mobile drawer) ------

function SidebarContent({
  activeSection,
  onNavigate,
  user,
  initials,
  onLogout,
}: {
  activeSection: string
  onNavigate: (id: string) => void
  user: { fullName?: string; email?: string; role?: string } | null | undefined
  initials: string
  onLogout: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoIcon />
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
          InsureTech
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: 'var(--color-secondary)', color: '#fff' }}
        >
          <IconShield className="h-3 w-3" />
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Dashboard sections">
        <p className="px-2 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
          Overview
        </p>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={active ? 'true' : undefined}
              className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
                active ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          )
        })}

        <p className="px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
          Administration
        </p>
        <Link
          to="/admin/users"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <IconUsers className="h-4 w-4 shrink-0" />
          Manage Users
        </Link>
      </nav>

      <div className="mt-auto border-t px-3 py-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--color-secondary)' }}
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user?.fullName || 'Admin'}
            </p>
            <p className="truncate text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {user?.email || '—'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          type="button"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-risk-high)' }}
        >
          <IconLogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  )
}

// ---- component ------------------------------------------------------------

function AdminDashboardPage() {
  const { user, loadCurrentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsError, setDocumentsError] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<KnowledgeDocument | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!user) loadCurrentUser()
  }, [user, loadCurrentUser])

  // ---- IntersectionObserver for active nav --------------------------------
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )

    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [documents])

  // ---- mobile drawer: lock scroll + escape-to-close -----------------------
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  // ---- delete modal: focus + escape-to-close ------------------------------
  useEffect(() => {
    if (!deleteConfirm) return
    cancelButtonRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteConfirm(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [deleteConfirm])

  // ---- data fetching ------------------------------------------------------

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(false)
    try {
      const res = await baseApi.get('/admin/stats')
      const body = res.data
      setStats(body?.data ?? body)
    } catch {
      setStats(null)
      setStatsError(true)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchDocuments = useCallback(async () => {
    setDocumentsLoading(true)
    setDocumentsError(false)
    try {
      const res = await baseApi.get('/admin/documents')
      const body = res.data
      setDocuments(body?.data ?? [])
    } catch {
      setDocuments([])
      setDocumentsError(true)
    } finally {
      setDocumentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchDocuments()
  }, [fetchStats, fetchDocuments])

  // ---- upload helpers ------------------------------------------------------

  const validateAndSetFile = (file: File | null) => {
    setUploadResult(null)
    setUploadError(null)
    if (!file) {
      setUploadFile(null)
      return
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.')
      setUploadFile(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(`File is too large. Maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`)
      setUploadFile(null)
      return
    }
    setUploadFile(file)
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await baseApi.post('/admin/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const body = res.data
      setUploadResult(body?.data ?? body)
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchDocuments()
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Upload failed. Please try again.'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await baseApi.delete(`/admin/documents/${deleteConfirm.id}`)
      setDeleteConfirm(null)
      fetchDocuments()
    } catch {
      setDeleteConfirm(null)
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/', { replace: true })
    } catch {
      // handled by slice
    }
  }

  const scrollTo = (id: string) => {
    setDrawerOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const initials = useMemo(() => getInitials(user?.fullName), [user?.fullName])
  const greeting = useMemo(() => getGreeting(), [])
  const firstName = user?.fullName?.split(' ')[0] || 'Admin'
  const activeLabel = NAV_SECTIONS.find((s) => s.id === activeSection)?.label ?? 'Dashboard'

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total_users,
      icon: IconUsers,
      borderColor: 'var(--color-primary)',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Active Users',
      value: stats?.active_users,
      icon: IconUserCheck,
      borderColor: '#10b981',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Inactive Users',
      value: stats?.inactive_users,
      icon: IconUserX,
      borderColor: '#f87171',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-red-500',
    },
  ]

  // reveal hooks — one per section that appears below the first fold
  const uploadReveal = useRevealed<HTMLElement>()
  const documentsReveal = useRevealed<HTMLElement>()
  const profileReveal = useRevealed<HTMLElement>()

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* ===== MOBILE TOP BAR ============================================= */}
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <LogoIcon className="h-7 w-7" />
          <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
            InsureTech
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: 'var(--color-risk-high)' }}
        >
          <IconLogOut className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ===== MOBILE DRAWER + BACKDROP =================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100"
            >
              <IconX className="h-4 w-4" />
            </button>
            <SidebarContent
              activeSection={activeSection}
              onNavigate={scrollTo}
              user={user}
              initials={initials}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ============================================= */}
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-white lg:flex"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <SidebarContent
          activeSection={activeSection}
          onNavigate={scrollTo}
          user={user}
          initials={initials}
          onLogout={handleLogout}
        />
      </aside>

      {/* ===== MAIN ======================================================= */}
      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:py-10">
          {/* breadcrumb */}
          <p className="mb-4 hidden text-xs font-semibold uppercase tracking-widest lg:block" style={{ color: 'var(--color-text-tertiary)' }}>
            {activeLabel}
          </p>

          {/* ================================================================ */}
          {/*  DASHBOARD SECTION                                              */}
          {/* ================================================================ */}
          <section id="dashboard">
            {/* Welcome Banner */}
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-12 text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
            >
              <span className="absolute -bottom-8 -right-8 opacity-[0.07]">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L3 6V11C3 16.5 6.8 20.7 12 22C17.2 20.7 21 16.5 21 11V6L12 2Z" />
                </svg>
              </span>
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-widest text-white/60">{greeting}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">{firstName} 👋</h1>
                <p className="mt-1.5 text-sm text-white/70">Here's what's happening with your platform today.</p>
              </div>

              {/* Mini stat row inside banner */}
              <div className="mt-8 flex flex-wrap gap-6 sm:gap-10">
                {statsLoading ? (
                  <>
                    <SkeletonBlock className="h-12 w-28" />
                    <SkeletonBlock className="h-12 w-28" />
                    <SkeletonBlock className="h-12 w-28" />
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-2xl font-bold">{stats?.total_users ?? 0}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/60">Total Users</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-300">{stats?.active_users ?? 0}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/60">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-300">{stats?.inactive_users ?? 0}</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-white/60">Inactive</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {statsError && (
              <Banner tone="warning" icon={IconAlertTriangle}>
                <div className="flex items-center justify-between gap-3">
                  <span>Couldn't load the latest stats. Please try again.</span>
                  <button
                    type="button"
                    onClick={fetchStats}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-amber-50"
                    style={{ color: '#92400e' }}
                  >
                    <IconRefresh className="h-3.5 w-3.5" />
                    Retry
                  </button>
                </div>
              </Banner>
            )}

            {/* Stats Cards */}
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {statsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                      <SkeletonBlock className="h-5 w-24" />
                      <SkeletonBlock className="mt-3 h-8 w-16" />
                    </div>
                  ))
                : statCards.map((card, i) => {
                    const Icon = card.icon
                    return (
                      <div
                        key={card.label}
                        className="group relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        {/* Colored top accent bar */}
                        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: card.borderColor }} />

                        <div className="flex items-center gap-4">
                          <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover:scale-110 ${card.iconBg} ${card.iconColor}`}>
                            <Icon className="h-6 w-6" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
                              {card.label}
                            </p>
                            <p className={`mt-0.5 text-2xl font-bold tracking-tight ${card.valueColor}`}>
                              {card.value ?? 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
            </div>

            {/* Quick link to Manage Users */}
            <Link
              to="/admin/users"
              className="mt-6 flex items-center justify-between rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-secondary)', color: '#fff' }}>
                  <IconUsers className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Manage Users</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>View, activate, or deactivate user accounts.</p>
                </div>
              </div>
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-tertiary)' }}>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </section>

          {/* ================================================================ */}
          {/*  TWO-COLUMN: UPLOAD + DOCUMENTS SUMMARY                        */}
          {/* ================================================================ */}
          <div className="mt-10 grid gap-6 lg:grid-cols-5">
            {/* Upload — takes 2 columns */}
            <section id="upload-pdf" ref={uploadReveal.ref} className={`lg:col-span-2 ${revealClass(uploadReveal.visible)}`}>
              <div className="rounded-xl border bg-white p-6 shadow-sm h-full" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-secondary)', color: '#fff' }}>
                    <IconUpload className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Upload PDF</h2>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Add documents to the AI knowledge base.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="pdf-upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0] ?? null) }}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition"
                    style={{
                      borderColor: isDragging ? 'var(--color-secondary)' : 'var(--color-border-strong)',
                      backgroundColor: isDragging ? 'var(--overlay-secondary-10, rgba(13,115,119,0.1))' : 'var(--color-surface-alt)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <IconUpload className="h-6 w-6 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                    <span className="truncate">{uploadFile ? uploadFile.name : 'Choose or drag a PDF…'}</span>
                    {uploadFile && (
                      <span className="ml-auto shrink-0 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        {formatBytes(uploadFile.size)}
                      </span>
                    )}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                <button
                  type="button"
                  disabled={!uploadFile || uploading}
                  onClick={handleUpload}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  {uploading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <IconUpload className="h-4 w-4" />
                      Upload PDF
                    </>
                  )}
                </button>

                {uploadResult && (
                  <Banner tone="success" icon={IconCheckCircle} onDismiss={() => setUploadResult(null)}>
                    <p className="font-semibold">{uploadResult.filename}</p>
                    <p className="mt-0.5" style={{ color: '#047857' }}>{uploadResult.chunks_count} chunks indexed</p>
                  </Banner>
                )}
                {uploadError && (
                  <Banner tone="error" icon={IconAlertTriangle} onDismiss={() => setUploadError(null)}>
                    {uploadError}
                  </Banner>
                )}
              </div>
            </section>

            {/* Documents summary card — takes 3 columns */}
            <section id="documents" ref={documentsReveal.ref} className={`lg:col-span-3 ${revealClass(documentsReveal.visible)}`}>
              <div className="rounded-xl border bg-white p-6 shadow-sm h-full" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                      <IconFileText className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Knowledge Base</h2>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {documentsLoading ? 'Loading…' : `${documents.length} document${documents.length === 1 ? '' : 's'} indexed`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDocuments}
                    disabled={documentsLoading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-50 disabled:opacity-50"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    <IconRefresh className={`h-3 w-3 ${documentsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {documentsError && !documentsLoading && (
                  <Banner tone="warning" icon={IconAlertTriangle}>
                    Couldn't load documents. Try refreshing.
                  </Banner>
                )}

                {documentsLoading ? (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-10" />)}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center">
                    <IconFileText className="h-8 w-8" style={{ color: 'var(--color-text-tertiary)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>No documents yet.</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Upload a PDF to get started.</p>
                  </div>
                ) : (
                  <div className="mt-4 max-h-[260px] overflow-y-auto -mx-2 px-2 space-y-1.5">
                    {documents.slice(0, 6).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition hover:bg-[var(--color-surface-alt)]"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconFileText className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{doc.file_name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{formatBytes(doc.file_size)}</span>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(doc)}
                            className="rounded p-1 transition hover:bg-red-50"
                            style={{ color: 'var(--color-risk-high)' }}
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {documents.length > 6 && (
                      <p className="pt-1 text-center text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
                        +{documents.length - 6} more documents
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ================================================================ */}
          {/*  PROFILE SECTION                                                */}
          {/* ================================================================ */}
          <section id="profile" ref={profileReveal.ref} className={`mt-6 ${revealClass(profileReveal.visible)}`}>
            <div className="rounded-xl border bg-white p-6 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <LogoIcon className="h-9 w-9" />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Admin Profile</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Your account information.</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: 'var(--color-secondary)' }}
                >
                  {initials}
                </span>
                <div className="grid flex-1 gap-5 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>Full Name</label>
                    <p className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{user?.fullName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>Email</label>
                    <p className="mt-1 break-all font-medium" style={{ color: 'var(--color-text-primary)' }}>{user?.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>Role</label>
                    <p className="mt-1">
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize"
                        style={{ backgroundColor: 'var(--overlay-secondary-10, rgba(13,115,119,0.1))', color: 'var(--color-secondary)' }}
                      >
                        {user?.role || '—'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ===== DELETE CONFIRMATION MODAL ================================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-doc-title"
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#fef2f2' }}>
                <IconTrash className="h-5 w-5" style={{ color: 'var(--color-risk-high)' }} />
              </span>
              <h3 id="delete-doc-title" className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Delete Document
              </h3>
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>{deleteConfirm.file_name}</strong>?
              This will remove all its chunks and cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="rounded-md px-4 py-2 text-sm font-semibold transition hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-50 disabled:hover:brightness-100"
                style={{ backgroundColor: 'var(--color-risk-high)' }}
              >
                {deleting && (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboardPage
