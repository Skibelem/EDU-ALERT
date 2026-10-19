import { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  BookOpen,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Shield,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState([])
  const [offerings, setOfferings] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  // Active form tab: 'create' | 'assign'
  const [activeTab, setActiveTab] = useState('create')

  // Staff creation form state
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('lecturer')
  const [newStaffDept, setNewStaffDept] = useState('SWD')
  const [isCreatingStaff, setIsCreatingStaff] = useState(false)

  // Assignment form state
  const [selectedLecturerId, setSelectedLecturerId] = useState('')
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [deletingAssignId, setDeletingAssignId] = useState(null)

  // Filter
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch staff profiles
        const { data: staffData, error: staffErr } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['lecturer', 'counsellor', 'admin'])
          .order('full_name', { ascending: true })

        if (staffErr) throw staffErr
        setStaffList(staffData || [])

        // Set default selected lecturer if any
        const lecturers = (staffData || []).filter((s) => s.role === 'lecturer')
        if (lecturers.length > 0) {
          setSelectedLecturerId(lecturers[0].id)
        }

        // 2. Fetch offerings for assignment
        const { data: offData, error: offErr } = await supabase
          .from('course_offerings')
          .select(`
            id,
            academic_level,
            semester,
            courses (
              course_code,
              course_title
            ),
            academic_sessions (
              session_name,
              is_active
            )
          `)
          .order('created_at', { ascending: false })

        if (offErr) throw offErr
        setOfferings(offData || [])
        if (offData && offData.length > 0) {
          setSelectedOfferingId(offData[0].id)
        }

        // 3. Fetch current lecturer assignments
        const { data: assignData, error: assignErr } = await supabase
          .from('lecturer_assignments')
          .select(`
            id,
            lecturer_id,
            offering_id,
            assigned_at,
            profiles (
              id,
              full_name,
              email
            ),
            course_offerings (
              id,
              academic_level,
              semester,
              courses (
                course_code,
                course_title
              ),
              academic_sessions (
                session_name
              )
            )
          `)
          .order('assigned_at', { ascending: false })

        if (assignErr) throw assignErr
        setAssignments(assignData || [])
      } catch (err) {
        console.error('Error loading staff & assignment data:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load staff records.' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      setFeedback({ type: 'error', message: 'Please provide full name, email, and password.' })
      return
    }

    if (newStaffPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' })
      return
    }

    setIsCreatingStaff(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase.rpc('create_staff_account', {
        p_email: newStaffEmail.trim().toLowerCase(),
        p_password: newStaffPassword,
        p_full_name: newStaffName.trim(),
        p_role: newStaffRole,
        p_department: newStaffDept.trim() || 'SWD',
      })

      if (error) {
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error(
            'Database function "create_staff_account" not found. Run the provided 1-time SQL helper in Supabase SQL Editor to enable in-app account creation.'
          )
        }
        throw error
      }

      setFeedback({
        type: 'success',
        message: `Staff account created successfully for ${newStaffName.trim()} (${newStaffRole})!`,
      })

      // Reset form
      setNewStaffName('')
      setNewStaffEmail('')
      setNewStaffPassword('')

      // Reload staff list
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['lecturer', 'counsellor', 'admin'])
        .order('full_name', { ascending: true })

      setStaffList(staffData || [])

      if (newStaffRole === 'lecturer' && data?.user_id) {
        setSelectedLecturerId(data.user_id)
        setActiveTab('assign')
      }
    } catch (err) {
      console.error('Error creating staff account:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to create staff account.',
      })
    } finally {
      setIsCreatingStaff(false)
    }
  }

  const handleAssignLecturer = async (e) => {
    e.preventDefault()
    if (!selectedLecturerId || !selectedOfferingId) {
      setFeedback({ type: 'error', message: 'Please select both a lecturer and a course offering.' })
      return
    }

    // Check duplicate
    const exists = assignments.some(
      (a) => a.lecturer_id === selectedLecturerId && a.offering_id === selectedOfferingId
    )
    if (exists) {
      setFeedback({
        type: 'error',
        message: 'This lecturer is already assigned to the selected course offering.',
      })
      return
    }

    setIsAssigning(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from('lecturer_assignments')
        .insert([
          {
            lecturer_id: selectedLecturerId,
            offering_id: selectedOfferingId,
            assigned_at: new Date().toISOString(),
          },
        ])
        .select(`
          id,
          lecturer_id,
          offering_id,
          assigned_at,
          profiles (
            id,
            full_name,
            email
          ),
          course_offerings (
            id,
            academic_level,
            semester,
            courses (
              course_code,
              course_title
            ),
            academic_sessions (
              session_name
            )
          )
        `)
        .single()

      if (error) throw error

      setAssignments((prev) => [data, ...prev])
      setFeedback({ type: 'success', message: 'Lecturer assigned to course offering successfully!' })
    } catch (err) {
      console.error('Error assigning lecturer:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to assign lecturer.' })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this lecturer allocation?')) {
      return
    }

    setDeletingAssignId(assignmentId)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from('lecturer_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
      setFeedback({ type: 'success', message: 'Assignment allocation removed.' })
    } catch (err) {
      console.error('Error removing assignment:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to remove assignment.' })
    } finally {
      setDeletingAssignId(null)
    }
  }

  const roleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" /> Admin
          </span>
        )
      case 'counsellor':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <HeartHandshake className="w-3 h-3" /> Counsellor
          </span>
        )
      case 'lecturer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <GraduationCap className="w-3 h-3" /> Lecturer
          </span>
        )
      default:
        return <span className="text-[11px] font-semibold text-slate-500">{role}</span>
    }
  }

  const lecturersList = staffList.filter((s) => s.role === 'lecturer')
  const filteredStaff = staffList.filter((s) => {
    if (roleFilter === 'all') return true
    return s.role === roleFilter
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
            Faculty & Staff Management
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Staff & Assignments</h1>
          <p className="text-xs text-slate-500">
            View staff accounts, monitor faculty directory, and assign lecturers to course offerings.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid: Assign Form + Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create Staff or Assign Lecturer */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          {/* Tab Bar */}
          <div className="flex border-b border-slate-100 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assign')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeTab === 'assign'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Assign Lecturer</span>
            </button>
          </div>

          {activeTab === 'create' ? (
            /* Create Staff Form */
            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engr. O. A. Adeleke"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. lecturer.swd@edualert.edu.ng"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="lecturer">Lecturer</option>
                    <option value="counsellor">Counsellor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value)}
                    placeholder="SWD"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingStaff}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreatingStaff ? 'Creating Account...' : 'Create Staff Account'}</span>
              </button>
            </form>
          ) : (
            /* Assign Lecturer Form */
            <div>
              {lecturersList.length === 0 || offerings.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-2">
                  <strong>Prerequisites needed:</strong>
                  <p>At least one lecturer account and one scheduled course offering must exist to create assignments.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="text-xs font-bold text-indigo-700 underline block"
                  >
                    + Click here to add a lecturer account first
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAssignLecturer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Lecturer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLecturerId}
                      onChange={(e) => setSelectedLecturerId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {lecturersList.map((lec) => (
                        <option key={lec.id} value={lec.id}>
                          {lec.full_name} ({lec.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Course Offering <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedOfferingId}
                      onChange={(e) => setSelectedOfferingId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {offerings.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.courses?.course_code} - {off.academic_level || off.level} ({off.semester})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAssigning ? 'Assigning...' : 'Confirm Assignment'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Active Allocations Summary */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Recent Assignments ({assignments.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 truncate">
                      {a.course_offerings?.courses?.course_code} • {a.course_offerings?.academic_level || a.course_offerings?.level}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {a.profiles?.full_name}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAssignment(a.id)}
                    disabled={deletingAssignId === a.id}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors disabled:opacity-50 shrink-0"
                    title="Remove assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Directory Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Staff Directory ({filteredStaff.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">All Roles</option>
                <option value="lecturer">Lecturers</option>
                <option value="counsellor">Counsellors</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading staff accounts...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">No staff accounts found</div>
              <p className="text-xs text-slate-400 mt-1">
                Staff accounts are provisioned via administrative channels in Supabase.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Name</th>
                    <th className="pb-3 px-3">Role</th>
                    <th className="pb-3 px-3">Department</th>
                    <th className="pb-3 px-3">Assigned Offerings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStaff.map((staff) => {
                    const staffAssignments = assignments.filter((a) => a.lecturer_id === staff.id)

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{staff.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{staff.email}</div>
                        </td>
                        <td className="py-3 px-3">{roleBadge(staff.role)}</td>
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {staff.department || 'SWD'}
                        </td>
                        <td className="py-3 px-3">
                          {staff.role === 'lecturer' ? (
                            staffAssignments.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">None assigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {staffAssignments.map((a) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold"
                                  >
                                    <BookOpen className="w-2.5 h-2.5" />
                                    {a.course_offerings?.courses?.course_code} ({a.course_offerings?.academic_level || a.course_offerings?.level})
                                  </span>
                                ))}
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">Department-wide</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
