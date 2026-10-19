import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import LoadingScreen from '../feedback/LoadingScreen'

export default function RoleRoute({ allowedRoles }) {
  const { role, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Checking permissions..." />
  }

  if (!role || !allowedRoles.includes(role)) {
    // Redirect to user's assigned role dashboard
    const roleRedirects = {
      student: '/student',
      lecturer: '/lecturer',
      counsellor: '/counsellor',
      admin: '/admin',
    }

    const fallbackPath = roleRedirects[role] || '/login'
    return <Navigate to={fallbackPath} replace />
  }

  return <Outlet />
}
