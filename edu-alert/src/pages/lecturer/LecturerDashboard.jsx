import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Users, ClipboardList, Cpu, AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function LecturerDashboard() {
  const { profile, user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [recentRecords, setRecentRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadLecturerData() {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      try {
        // 1. Fetch lecturer assignments joined with offerings and courses
        const { data: assignData, error: assignErr } = await supabase
          .from('lecturer_assignments')
          .select(`
            id,
            assigned_at,
            course_offerings (
              id,
              semester,
              academic_level,
              courses (
                id,
                course_code,
                course_title,
                department
              )
            )
          `)
          .eq('lecturer_id', user.id)

        if (assignErr) throw assignErr

        // 2. Fetch enrolled student count for each offering
        const assignmentsWithCounts = await Promise.all(
          (assignData || []).map(async (item) => {
            const offId = item.course_offerings?.id
            if (!offId) return { ...item, studentCount: 0 }

            const { count } = await supabase
              .from('course_registrations')
              .select('id', { count: 'exact', head: true })
              .eq('offering_id', offId)
              .eq('status', 'registered')

            return {
              ...item,
              studentCount: count || 0,
            }
          })
        )

        setAssignments(assignmentsWithCounts)

        // 3. Fetch recent academic records recorded by this lecturer
        const { data: recData, error: recErr } = await supabase
          .from('academic_records')
          .select(`
            id,
            attendance_percentage,
            participation_score,
            ca_score,
            evaluation_period,
            created_at,
            profiles:student_id (
              matric_number,
              full_name,
              academic_level
            ),
            course_offerings (
              courses (
                course_code
              )
            )
          `)
          .eq('recorded_by', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (recErr) throw recErr
        setRecentRecords(recData || [])
      } catch (err) {
        console.error('Error loading lecturer dashboard:', err)
        setError(err.message || 'Failed to load assigned offerings.')
      } finally {
        setLoading(false)
      }
    }

    loadLecturerData()
  }, [user])

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Faculty Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Welcome, {profile?.full_name || 'Lecturer'}
          </h1>
          <p className="text-xs text-slate-500">
            Department: <strong className="text-slate-700">Software & Web Development</strong> • Institutional Staff Account
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Courses</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{assignments.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Teaching allocations</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Students Offering</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {assignments.reduce((sum, a) => sum + (a.studentCount || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Enrolled across your courses</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Academic Marks Logged</span>
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{recentRecords.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Recorded assessment entries</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Evaluation Service</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-bold text-slate-700 mt-1">Active Backend</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Decision Tree risk scoring</div>
        </div>
      </div>

      {/* Assigned Offerings */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Your Teaching Allocations</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Course offerings assigned by academic administration with current student enrollments
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {assignments.length} Assigned
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading teaching assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No course offerings assigned</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Contact the department administrator to allocate course offerings for the current session.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((item) => {
              const offering = item.course_offerings
              const course = offering?.courses
              return (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {course?.course_code || 'CODE'}: {course?.course_title || 'Course Title'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Semester: <strong className="text-slate-700">{offering?.semester || 'N/A'}</strong> • Level: <strong className="text-slate-700">{offering?.academic_level || offering?.level || 'ND 1'}</strong> • Dept: {course?.department || 'SWD'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{item.studentCount || 0} Student{item.studentCount === 1 ? '' : 's'} Offering</span>
                    </span>
                    <Link
                      to={`/lecturer/records?offeringId=${offering?.id}`}
                      className="text-xs font-bold px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <span>Enter Marks</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Evaluations Log */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Recent Academic Indicator Entries</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Attendance (0-100), Participation (0-10), CA (0-30)</p>
          </div>
          <ClipboardList className="w-4 h-4 text-slate-400" />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading indicators...</div>
        ) : recentRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-1" />
            <p className="font-semibold text-slate-700">No continuous assessment records logged yet.</p>
            <p className="text-slate-400 max-w-md mx-auto">
              Students offering your courses are ready for continuous assessment. Click <strong>Enter Marks</strong> above or open <strong>Enter Records</strong> in the sidebar to log Attendance, Participation, and CA scores.
            </p>
            {assignments.length > 0 && (
              <Link
                to={`/lecturer/records?offeringId=${assignments[0]?.course_offerings?.id}`}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold text-xs transition-colors"
              >
                <span>Enter Assessment Records</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student Matric</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3 text-center">Attendance %</th>
                  <th className="py-2.5 px-3 text-center">Participation (10)</th>
                  <th className="py-2.5 px-3 text-center">CA Score (30)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {r.profiles?.matric_number || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{r.profiles?.full_name || 'Student'}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {r.course_offerings?.courses?.course_code || 'Course'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {r.attendance_percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {r.participation_score}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                      {r.ca_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
