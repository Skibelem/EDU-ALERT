import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  AlertTriangle,
  HeartHandshake,
  ClipboardList,
  Users,
  Cpu,
  LogOut,
  Menu,
  X,
  Calendar,
  Building2,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'

export default function DashboardLayout() {
  const { profile, role, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Sign out failed:', err)
      setIsSigningOut(false)
    }
  }

  // Define navigation links per role
  const getNavLinks = () => {
    switch (role) {
      case 'student':
        return [
          { to: '/student', label: 'My Dashboard', icon: LayoutDashboard },
          { to: '/student/courses', label: 'Registered Courses', icon: BookOpen },
          { to: '/student/risk', label: 'Academic Risk Status', icon: AlertTriangle },
          { to: '/student/interventions', label: 'My Interventions', icon: HeartHandshake },
        ]
      case 'lecturer':
        return [
          { to: '/lecturer', label: 'Lecturer Dashboard', icon: LayoutDashboard },
          { to: '/lecturer/courses', label: 'Assigned Courses', icon: BookOpen },
          { to: '/lecturer/records', label: 'Score Entry (CA / Att)', icon: ClipboardList },
          { to: '/lecturer/evaluations', label: 'AI Risk Evaluation', icon: Cpu },
          { to: '/lecturer/interventions', label: 'Student Interventions', icon: HeartHandshake },
        ]
      case 'counsellor':
        return [
          { to: '/counsellor', label: 'Adviser Dashboard', icon: LayoutDashboard },
          { to: '/counsellor/students', label: 'SWD Student Directory', icon: Users },
          { to: '/counsellor/risk', label: 'Department Risk Monitor', icon: AlertTriangle },
          { to: '/counsellor/interventions', label: 'Support Interventions', icon: HeartHandshake },
        ]
      case 'admin':
        return [
          { to: '/admin', label: 'System Overview', icon: LayoutDashboard },
          { to: '/admin/sessions', label: 'Academic Sessions', icon: Calendar },
          { to: '/admin/courses', label: 'Course Catalogue', icon: BookOpen },
          { to: '/admin/offerings', label: 'Course Offerings', icon: Building2 },
          { to: '/admin/staff', label: 'Staff & Assignments', icon: Users },
          { to: '/admin/models', label: 'AI Model Versions', icon: Cpu },
        ]
      default:
        return []
    }
  }

  const roleStyles = {
    student: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Student',
    },
    lecturer: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Lecturer',
    },
    counsellor: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'Staff Adviser / Counsellor',
    },
    admin: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      label: 'System Administrator',
    },
  }

  const activeRoleConfig = roleStyles[role] || {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    label: role || 'User',
  }

  const navLinks = getNavLinks()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white m-0">EDU-ALERT</h1>
            <p className="text-[10px] text-slate-400">FedPoly Ado-Ekiti • SWD</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white leading-none">
                EDU-ALERT
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">
                Academic Early Warning
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Active Context
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">
              Federal Poly, Ado-Ekiti
            </div>
            <div className="text-[11px] text-indigo-400 font-medium">
              Dept. of Software & Web Dev.
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${role}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm shrink-0">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {profile?.full_name || 'Authenticated User'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {profile?.matric_number || profile?.email || ''}
              </div>
            </div>
          </div>

          <div className="mb-3">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${activeRoleConfig.bg}`}
            >
              {activeRoleConfig.label}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 text-xs font-semibold border border-slate-700/80 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-3.5 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
              FPA • SWD Dept
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              Decision-Support Academic Early Warning System
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-800">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-[11px] text-slate-500">
                {activeRoleConfig.label} {(profile?.academic_level || profile?.level) ? `(${profile?.academic_level || profile?.level})` : ''}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
