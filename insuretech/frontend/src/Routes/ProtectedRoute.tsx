import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.ts'

function ProtectedRoute() {
  const { isAuthenticated, status, loadCurrentUser } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (status === 'idle' && !isAuthenticated) {
      loadCurrentUser()
    }
  }, [status, isAuthenticated, loadCurrentUser])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Checking authentication…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
