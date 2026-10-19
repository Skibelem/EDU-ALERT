import { useEffect, useState } from 'react'
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function StudentCoursesPage() {
  const { user, profile } = useAuth()
  const [activeSession, setActiveSession] = useState(null)
  const [availableOfferings, setAvailableOfferings] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const studentLevel = profile?.level || 'ND 1'

  useEffect(() => {
    async function loadCourseData() {
      if (!user?.id) return
      setLoading(true)
      setFeedback(null)

      try {
        // 1. Fetch active session
        const { data: sessionData, error: sessErr } = await supabase
          .from('academic_sessions')
          .select('*')
          .eq('is_active', true)
          .maybeSingle()

        if (sessErr) throw sessErr
        setActiveSession(sessionData)

        // 2. Fetch student's existing registrations
        const { data: regData, error: regErr } = await supabase
          .from('course_registrations')
          .select(`
            id,
            offering_id,
            status,
            registered_at,
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
          .eq('student_id', user.id)

        if (regErr) throw regErr
        setRegistrations(regData || [])

        // 3. Fetch all course offerings for student's level in the active session
        if (sessionData?.id) {
          const { data: offData, error: offErr } = await supabase
            .from('course_offerings')
            .select(`
              id,
              semester,
              academic_level,
              session_id,
              courses (
                id,
                course_code,
                course_title,
                department
              )
            `)
            .eq('session_id', sessionData.id)

          if (offErr) throw offErr

          // Filter by student level if offering has level set, otherwise show department courses
          const eligible = (offData || []).filter((off) => {
            const offLvl = off.academic_level || off.level
            if (offLvl && offLvl !== studentLevel) return false
            return off.courses?.department === 'SWD' || !off.courses?.department
          })

          setAvailableOfferings(eligible)
        } else {
          setAvailableOfferings([])
        }
      } catch (err) {
        console.error('Error loading student course data:', err)
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to load course catalogue.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadCourseData()
  }, [user, studentLevel])

  const handleRegister = async (offeringId) => {
    setRegisteringId(offeringId)
    setFeedback(null)

    try {
      let registeredItem = null

      // 1. Try direct insert
      const { data, error } = await supabase
        .from('course_registrations')
        .insert([
          {
            student_id: user.id,
            offering_id: offeringId,
            status: 'registered',
            registered_at: new Date().toISOString(),
          },
        ])
        .select(`
          id,
          offering_id,
          status,
          registered_at,
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
        .maybeSingle()

      if (!error && data) {
        registeredItem = data
      } else if (error) {
        if (error.code === '23505') {
          throw new Error('You are already registered for this course offering.')
        }

        // If blocked by RLS (42501), attempt the secure RPC function
        if (error.code === '42501') {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('register_student_course', {
            p_offering_id: offeringId,
          })

          if (rpcErr) {
            throw error // Throw original RLS error or message
          }

          if (rpcRes?.id) {
            // Fetch newly registered row with joins
            const { data: fetchedReg } = await supabase
              .from('course_registrations')
              .select(`
                id,
                offering_id,
                status,
                registered_at,
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
              .eq('id', rpcRes.id)
              .maybeSingle()

            registeredItem = fetchedReg
          }
        } else {
          throw error
        }
      }

      if (registeredItem) {
        setRegistrations((prev) => [registeredItem, ...prev])
      } else {
        // Trigger a reload of registrations in case RLS didn't return representation
        const { data: refreshed } = await supabase
          .from('course_registrations')
          .select(`
            id,
            offering_id,
            status,
            registered_at,
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
          .eq('student_id', user.id)

        setRegistrations(refreshed || [])
      }

      setFeedback({
        type: 'success',
        message: 'Course registration completed successfully!',
      })
    } catch (err) {
      console.error('Registration error:', err)
      const msg = err.message?.includes('row-level security')
        ? 'Course registration blocked by database RLS policy. Please apply the registration RLS SQL update in Supabase SQL Editor.'
        : err.message || 'Failed to register for course.'
      setFeedback({
        type: 'error',
        message: msg,
      })
    } finally {
      setRegisteringId(null)
    }
  }

  const registeredOfferingIds = new Set(registrations.map((r) => r.offering_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Course Enrolment
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Course Registration</h1>
          <p className="text-xs text-slate-500">
            Level: <strong className="text-slate-700">{studentLevel}</strong> • Department:{' '}
            <strong className="text-slate-700">Software & Web Development</strong>
          </p>
        </div>

        {activeSession ? (
          <div className="text-right bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              Active Session
            </div>
            <div className="text-xs font-bold text-emerald-950 mt-0.5">
              {activeSession.session_name}
            </div>
          </div>
        ) : (
          <div className="text-right bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
              Session Status
            </div>
            <div className="text-xs font-bold text-amber-950 mt-0.5">
              No active session configured
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Available Offerings for Registration */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Eligible Course Offerings</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Offerings available for {studentLevel} students in the current session
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {availableOfferings.length} Available
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading offerings...</div>
        ) : availableOfferings.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No course offerings available</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Either no academic session is currently active or no course offerings have been created for {studentLevel}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {availableOfferings.map((off) => {
              const course = off.courses
              const isRegistered = registeredOfferingIds.has(off.id)

              return (
                <div
                  key={off.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {course?.course_code || 'CODE'}: {course?.course_title || 'Course Title'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                      <span>Semester: <strong className="text-slate-700">{off.semester}</strong></span>
                      <span>Level: <strong className="text-slate-700">{off.academic_level || off.level || studentLevel}</strong></span>
                      <span>Dept: {course?.department || 'SWD'}</span>
                    </div>
                  </div>

                  <div>
                    {isRegistered ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registered</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRegister(off.id)}
                        disabled={registeringId === off.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{registeringId === off.id ? 'Registering...' : 'Register'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Registered Courses Roster */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">My Confirmed Course Enrolments</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Courses currently enrolled for academic indicators</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {registrations.length} Enrolled
          </span>
        </div>

        {registrations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            You have not registered for any courses yet. Select eligible courses above to enrol.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Course Title</th>
                  <th className="py-2.5 px-3">Semester</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((reg) => {
                  const course = reg.course_offerings?.courses
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                        {course?.course_code || 'CODE'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {course?.course_title || 'Course'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {reg.course_offerings?.semester || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                          {reg.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'N/A'}
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
  )
}
