import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Lock, Mail, User, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import ConfigNotice from '../../components/feedback/ConfigNotice'

export default function RegisterPage() {
  const { signUpStudent, isConfigured } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [matricNumber, setMatricNumber] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('Male')
  const [level, setLevel] = useState('ND 1')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isConfigured) {
    return <ConfigNotice />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || !matricNumber.trim() || !email.trim() || !password) {
      setError('Please fill in all required registration fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.')
      return
    }

    try {
      setIsSubmitting(true)
      await signUpStudent({
        email,
        password,
        fullName,
        matricNumber,
        gender,
        level,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate('/student', { replace: true })
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed. Please check your information.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 text-white items-center justify-center shadow-lg shadow-indigo-600/30 mb-3">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 m-0">
          Student Registration
        </h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mt-1">
          Federal Polytechnic Ado-Ekiti • SWD Department
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <div className="mb-5">
            <h2 className="text-base font-bold text-slate-900 m-0">Create your student profile</h2>
            <p className="text-xs text-slate-500 mt-1">
              Register for course enrolment and academic performance early-warning monitoring.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="leading-relaxed">
                Registration successful! Directing you to your student dashboard...
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name (Surname First)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adelugba Joel Temitope"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="matric" className="block text-xs font-semibold text-slate-700 mb-1">
                  Matriculation Number
                </label>
                <input
                  id="matric"
                  type="text"
                  required
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  placeholder="FPA/SWD/24/1001"
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white uppercase font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="level" className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Level
                </label>
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="ND 1">ND 1 (National Diploma 1)</option>
                  <option value="ND 2">ND 2 (National Diploma 2)</option>
                  <option value="HND 1">HND 1 (Higher National Diploma 1)</option>
                  <option value="HND 2">HND 2 (Higher National Diploma 2)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="gender" className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value="Software and Web Dev (SWD)"
                  className="block w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@fedpolyado.edu.ng"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="reg-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-pass"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-pass"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                By registering, your account role will be assigned as <strong className="text-slate-800">Student</strong>. Staff accounts cannot self-register and must be provisioned by the administrator.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              <span>{isSubmitting ? 'Creating account...' : 'Complete Student Registration'}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
            >
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
