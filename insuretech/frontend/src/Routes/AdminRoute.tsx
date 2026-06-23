import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
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
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
