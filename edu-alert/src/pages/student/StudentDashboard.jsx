import { useEffect, useState } from 'react'
import {
  BookOpen,
  AlertTriangle,
  HeartHandshake,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function StudentDashboard() {
  const { profile, user } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [predictions, setPredictions] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadStudentData() {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      try {
        // 1. Fetch student's course registrations with offering and course details
        const { data: regData, error: regErr } = await supabase
          .from('course_registrations')
          .select(`
            id,
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

        // 2. Fetch student's risk predictions
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select(`
            id,
            risk_level,
            explanation,
            created_at,
            course_offerings (
              courses (
                course_code,
                course_title
              )
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (predErr) throw predErr
        setPredictions(predData || [])

        // 3. Fetch interventions assigned to student
        const { data: intData, error: intErr } = await supabase
          .from('interventions')
          .select(`
            id,
            title,
            message,
            status,
            acknowledged_at,
            created_at,
            course_offerings (
              courses (
                course_code
              )
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (intErr) throw intErr
        setInterventions(intData || [])
      } catch (err) {
        console.error('Error loading student dashboard:', err)
        setError(err.message || 'Failed to load student records.')
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()
  }, [user])

  const handleAcknowledge = async (interventionId) => {
    try {
      const { error: rpcErr } = await supabase.rpc('acknowledge_intervention', {
        p_intervention_id: interventionId,
      })

      if (rpcErr) {
        // Fallback update if RPC not yet created
        await supabase
          .from('interventions')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('id', interventionId)
      }

      setInterventions((prev) =>
        prev.map((item) =>
          item.id === interventionId
            ? { ...item, acknowledged_at: new Date().toISOString() }
            : item
        )
      )
    } catch (err) {
      console.error('Error acknowledging intervention:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Student Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Welcome back, {profile?.full_name || 'Student'}
          </h1>
          <p className="text-xs text-slate-500">
            Matric: <strong className="text-slate-700 font-mono">{profile?.matric_number || 'N/A'}</strong> • Level: <strong className="text-slate-700">{profile?.level || 'ND 1'}</strong> • Dept: <strong className="text-slate-700">SWD</strong>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Courses</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{registrations.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active semester enrolment</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Risk Assessments</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{predictions.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Evaluated course signals</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Interventions</span>
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {interventions.filter((i) => i.status !== 'Completed').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Support actions assigned</div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Registrations */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Registered Courses</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Courses enrolled for academic evaluation</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {registrations.length} Total
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading registrations...</div>
          ) : registrations.length === 0 ? (
            <div className="py-10 text-center">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No registered courses found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                You have not registered for course offerings in the active session.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {registrations.map((reg) => {
                const course = reg.course_offerings?.courses
                return (
                  <div key={reg.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {course?.course_code || 'CODE'}: {course?.course_title || 'Course'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Semester: {reg.course_offerings?.semester || 'N/A'} • Status: <span className="text-emerald-700 font-medium capitalize">{reg.status}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      Enrolled
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Academic Risk Status */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Early Warning Evaluations</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Decision-support risk assessments</p>
            </div>
            <ShieldAlert className="w-4 h-4 text-slate-400" />
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading assessments...</div>
          ) : predictions.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No risk predictions recorded</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Evaluations will appear once continuous assessment indicators are processed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {predictions.map((pred) => {
                const code = pred.course_offerings?.courses?.course_code || 'Course'
                const riskColor =
                  pred.risk_level === 'High'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : pred.risk_level === 'Medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'

                return (
                  <div key={pred.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{code}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(pred.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${riskColor}`}
                    >
                      {pred.risk_level} Risk
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Interventions Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Support & Mentorship Interventions</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Guidance notes created by lecturers and counsellors</p>
          </div>
          <HeartHandshake className="w-4 h-4 text-indigo-600" />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading interventions...</div>
        ) : interventions.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No active interventions</p>
            <p className="text-[11px] text-slate-400 mt-1">
              You currently have no open academic support interventions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {interventions.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {item.course_offerings?.courses?.course_code || 'General'}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Status: {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <div className="text-[10px] text-slate-400">
                    Created on {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="shrink-0">
                  {item.acknowledged_at ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(item.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-white font-semibold bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Acknowledge Receipt</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
