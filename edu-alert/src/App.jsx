import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import RoleRoute from './components/auth/RoleRoute'
import DashboardLayout from './components/layout/DashboardLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import StudentCoursesPage from './pages/student/StudentCoursesPage'
import StudentRiskPage from './pages/student/StudentRiskPage'
import StudentInterventionsPage from './pages/student/StudentInterventionsPage'

// Lecturer Pages
import LecturerDashboard from './pages/lecturer/LecturerDashboard'
import LecturerCoursesPage from './pages/lecturer/LecturerCoursesPage'
import LecturerRecordEntryPage from './pages/lecturer/LecturerRecordEntryPage'
import LecturerEvaluationsPage from './pages/lecturer/LecturerEvaluationsPage'
import LecturerInterventionsPage from './pages/lecturer/LecturerInterventionsPage'

// Counsellor Pages
import CounsellorDashboard from './pages/counsellor/CounsellorDashboard'
import CounsellorStudentsPage from './pages/counsellor/CounsellorStudentsPage'
import CounsellorRiskPage from './pages/counsellor/CounsellorRiskPage'
import CounsellorInterventionsPage from './pages/counsellor/CounsellorInterventionsPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminSessionsPage from './pages/admin/AdminSessionsPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminOfferingsPage from './pages/admin/AdminOfferingsPage'
import AdminStaffPage from './pages/admin/AdminStaffPage'
import AdminModelsPage from './pages/admin/AdminModelsPage'

function RootRedirect() {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const roleRedirects = {
    student: '/student',
    lecturer: '/lecturer',
    counsellor: '/counsellor',
    admin: '/admin',
  }

  return <Navigate to={roleRedirects[role] || '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Student Routes */}
            <Route element={<RoleRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<DashboardLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="courses" element={<StudentCoursesPage />} />
                <Route path="risk" element={<StudentRiskPage />} />
                <Route path="interventions" element={<StudentInterventionsPage />} />
                <Route path="*" element={<StudentDashboard />} />
              </Route>
            </Route>

            {/* Lecturer Routes */}
            <Route element={<RoleRoute allowedRoles={['lecturer']} />}>
              <Route path="/lecturer" element={<DashboardLayout />}>
                <Route index element={<LecturerDashboard />} />
                <Route path="courses" element={<LecturerCoursesPage />} />
                <Route path="records" element={<LecturerRecordEntryPage />} />
                <Route path="evaluations" element={<LecturerEvaluationsPage />} />
                <Route path="interventions" element={<LecturerInterventionsPage />} />
                <Route path="*" element={<LecturerDashboard />} />
              </Route>
            </Route>

            {/* Counsellor Routes */}
            <Route element={<RoleRoute allowedRoles={['counsellor']} />}>
              <Route path="/counsellor" element={<DashboardLayout />}>
                <Route index element={<CounsellorDashboard />} />
                <Route path="students" element={<CounsellorStudentsPage />} />
                <Route path="risk" element={<CounsellorRiskPage />} />
                <Route path="interventions" element={<CounsellorInterventionsPage />} />
                <Route path="*" element={<CounsellorDashboard />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<DashboardLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="sessions" element={<AdminSessionsPage />} />
                <Route path="courses" element={<AdminCoursesPage />} />
                <Route path="offerings" element={<AdminOfferingsPage />} />
                <Route path="staff" element={<AdminStaffPage />} />
                <Route path="models" element={<AdminModelsPage />} />
                <Route path="*" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
