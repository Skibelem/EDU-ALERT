import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import LoadingScreen from '../feedback/LoadingScreen'

export default function ProtectedRoute() {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen message="Verifying authentication session..." />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // If user is authenticated in Supabase Auth but profile is not loaded or missing
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
          <h2 className="text-lg font-bold text-slate-800">Account Initializing</h2>
          <p className="text-sm text-slate-600 mt-2">
            Your authenticated session was found ({user.email}), but your student/staff profile is being set up or verified.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Refresh
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
