import { useEffect, useState } from 'react'
import { BookOpen, Users, Calendar, ArrowRight, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function LecturerCoursesPage() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadAssignments() {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      try {
        const { data, error: assignErr } = await supabase
          .from('lecturer_assignments')
          .select(`
            id,
            offering_id,
            assigned_at,
            course_offerings (
              id,
              semester,
              academic_level,
              session_id,
              courses (
                id,
                course_code,
                course_title,
                department
              ),
              academic_sessions (
                session_name,
                is_active
              )
            )
          `)
          .eq('lecturer_id', user.id)

        if (assignErr) throw assignErr

        // For each offering, get student registration count
        const offeringList = (data || []).map((item) => item.course_offerings).filter(Boolean)

        const offeringsWithCounts = await Promise.all(
          offeringList.map(async (off) => {
            const { count } = await supabase
              .from('course_registrations')
              .select('id', { count: 'exact', head: true })
              .eq('offering_id', off.id)
              .eq('status', 'registered')

            return {
              ...off,
              studentCount: count || 0,
            }
          })
        )

        setOfferings(offeringsWithCounts)
      } catch (err) {
        console.error('Error loading assignments:', err)
        setError(err.message || 'Failed to load assigned course offerings.')
      } finally {
        setLoading(false)
      }
    }

    loadAssignments()
  }, [user])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Teaching Allocations
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Assigned Courses</h1>
          <p className="text-xs text-slate-500">
            Course offerings allocated to you for continuous assessment and student monitoring.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Offerings Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading assigned courses...
        </div>
      ) : offerings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Course Offerings Assigned</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            You do not currently have any course offerings allocated by the department administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offerings.map((off) => {
            const course = off.courses
            const session = off.academic_sessions

            return (
              <div
                key={off.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {course?.course_code || 'CODE'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {off.academic_level || off.level || 'ND 1'} • {off.semester}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {course?.course_title || 'Course Title'}
                  </h3>

                  <div className="text-xs text-slate-500 mt-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Session: {session?.session_name || 'Current'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Enrolled Students: <strong className="text-slate-800">{off.studentCount}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Dept: {course?.department || 'SWD'}
                  </span>
                  <Link
                    to="/lecturer/records"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Record Indicators</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
