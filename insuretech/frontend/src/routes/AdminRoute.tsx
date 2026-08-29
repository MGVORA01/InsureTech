import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader } from '@/components/Loader'
import { useAuth } from '../hooks/useAuth.ts'

function AdminRoute() {
  const { user, isAuthenticated, status, loadCurrentUser } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (status === 'idle' && !isAuthenticated) {
      loadCurrentUser()
    }
  }, [status, isAuthenticated, loadCurrentUser])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader variant="badge-check" label="Checking admin access…" size={56} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default AdminRoute
