import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import ConfigNotice from '../../components/feedback/ConfigNotice'

export default function LoginPage() {
  const { signIn, user, role, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && role) {
      const from = location.state?.from?.pathname
      const roleRedirects = {
        student: '/student',
        lecturer: '/lecturer',
        counsellor: '/counsellor',
        admin: '/admin',
      }
      navigate(from || roleRedirects[role] || `/${role}`, { replace: true })
    }
  }, [user, role, navigate, location])

  if (!isConfigured) {
    return <ConfigNotice />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Please enter both your email and password.')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await signIn(email, password)
      const userRole = res.profile?.role

      const roleRedirects = {
        student: '/student',
        lecturer: '/lecturer',
        counsellor: '/counsellor',
        admin: '/admin',
      }

      if (userRole && roleRedirects[userRole]) {
        navigate(roleRedirects[userRole], { replace: true })
      } else {
        navigate('/student', { replace: true })
      }
    } catch (err) {
      console.error('Sign in error:', err)
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please verify your credentials and try again.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Your email has not been confirmed. Please check your inbox or contact the administrator.')
      } else {
        setError(msg || 'An error occurred while signing in. Please check your connection.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 text-white items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 m-0">
          EDU-ALERT
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mt-1">
          Federal Polytechnic Ado-Ekiti
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Department of Software & Web Development (SWD)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 m-0">Sign in to your account</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your credentials to access the academic early warning dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional / Account Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@fedpolyado.edu.ng"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{isSubmitting ? 'Verifying credentials...' : 'Sign In'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-center text-xs text-slate-600">
              New SWD Student?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                Register your student account
              </Link>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed text-center">
              <span className="font-semibold text-slate-700">Staff Notice:</span> Lecturer, Counsellor, and Administrator accounts are provisioned through official administrative onboarding.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
