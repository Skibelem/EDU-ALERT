import { useEffect, useState } from 'react'
import { Users, AlertTriangle, HeartHandshake, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function CounsellorDashboard() {
  const { profile } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [interventions, setInterventions] = useState([])
  const [studentsCount, setStudentsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadCounsellorData() {
      setLoading(true)
      setError(null)

      try {
        // 1. Total students in SWD department
        const { count, error: countErr } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('department', 'SWD')

        if (!countErr) setStudentsCount(count || 0)

        // 2. Fetch risk predictions
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select(`
            id,
            risk_level,
            explanation,
            created_at,
            profiles:student_id (
              matric_number,
              full_name,
              academic_level
            ),
            course_offerings (
              courses (
                course_code,
                course_title
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20)

        if (predErr) throw predErr
        setPredictions(predData || [])

        // 3. Fetch support interventions
        const { data: intData, error: intErr } = await supabase
          .from('interventions')
          .select(`
            id,
            title,
            message,
            status,
            acknowledged_at,
            created_at,
            profiles:student_id (
              matric_number,
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20)

        if (intErr) throw intErr
        setInterventions(intData || [])
      } catch (err) {
        console.error('Error loading counsellor data:', err)
        setError(err.message || 'Failed to load advising records.')
      } finally {
        setLoading(false)
      }
    }

    loadCounsellorData()
  }, [])

  const highRiskCount = predictions.filter((p) => p.risk_level === 'High').length
  const mediumRiskCount = predictions.filter((p) => p.risk_level === 'Medium').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Staff Adviser & Counselling Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Welcome, {profile?.full_name || 'Staff Adviser'}
          </h1>
          <p className="text-xs text-slate-500">
            Department Scope: <strong className="text-slate-700">Software & Web Development</strong> • All Levels (ND 1 - HND 2)
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">SWD Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{studentsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Enrolled department cohort</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Risk Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{highRiskCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Immediate intervention needed</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Medium Risk Flags</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{mediumRiskCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Academic monitoring target</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Interventions</span>
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{interventions.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active guidance actions</div>
        </div>
      </div>

      {/* Early Warning Risk Feed */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Early Warning Risk Signals (SWD Cohort)</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Automated Decision-Support risk classifications</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {predictions.length} Total Signals
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading risk predictions...</div>
        ) : predictions.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No student risk alerts currently logged</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Course indicators will populate this monitor as continuous assessments are scored.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student Matric</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3 text-center">Risk Level</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p) => {
                  const riskBadge =
                    p.risk_level === 'High'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : p.risk_level === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {p.profiles?.matric_number || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{p.profiles?.full_name || 'Student'}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">{p.profiles?.academic_level || p.profiles?.level || 'ND 1'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {p.course_offerings?.courses?.course_code || 'Course'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${riskBadge}`}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(p.created_at).toLocaleDateString()}
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
