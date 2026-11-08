import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/lib/types'
import { useAuthStore } from '@/store/auth'
import { FullPageLoader } from '@/components/ui'

export function RequireAuth() {
  const status = useAuthStore((state) => state.status)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <FullPageLoader label="Sessiya yoxlanılır…" />
      </div>
    )
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />
  return <Outlet />
}

export function HomeRedirect() {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

export function GuestOnly() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  if (status === 'authenticated' && user) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
    if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />
    return <Navigate to="/student" replace />
  }
  return <Outlet />
}
