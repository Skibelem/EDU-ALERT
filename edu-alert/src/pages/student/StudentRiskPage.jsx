import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck, Info } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function StudentRiskPage() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadRiskEvaluations() {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      try {
        const { data, error: predErr } = await supabase
          .from('predictions')
          .select(`
            id,
            risk_level,
            explanation,
            created_at,
            course_offerings (
              semester,
              academic_level,
              courses (
                course_code,
                course_title,
                department
              )
            ),
            academic_records (
              attendance_percentage,
              participation_score,
              ca_score,
              evaluation_period
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (predErr) throw predErr
        setPredictions(data || [])
      } catch (err) {
        console.error('Error loading risk data:', err)
        setError(err.message || 'Failed to load risk evaluations.')
      } finally {
        setLoading(false)
      }
    }

    loadRiskEvaluations()
  }, [user])

  const getRiskBadge = (level) => {
    switch (level) {
      case 'High':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          desc: 'High Risk — Indicator performance suggests early academic intervention is recommended.',
        }
      case 'Medium':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          desc: 'Medium Risk — Moderate performance; monitoring attendance and test components is advised.',
        }
      case 'Low':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          desc: 'Low Risk — Academic indicators reflect satisfactory progress in continuous assessments.',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Early Warning System
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Academic Risk Status</h1>
          <p className="text-xs text-slate-500">
            Course-specific decision support signals calculated from continuous assessments.
          </p>
        </div>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200/70 rounded-xl flex items-start gap-3 text-xs text-slate-700 leading-relaxed">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Support Signal Notice:</strong> Early warning predictions are supportive guidance
          indicators intended to help academic staff and students coordinate timely support. A
          prediction is not a disciplinary finding or a guaranteed examination outcome.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Evaluations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            Loading academic evaluations...
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Risk Evaluations Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your registered courses have not yet received continuous assessment evaluations from
              assigned lecturers. Once attendance and CA marks are recorded, risk signals will
              display here.
            </p>
          </div>
        ) : (
          predictions.map((pred) => {
            const course = pred.course_offerings?.courses
            const record = pred.academic_records
            const config = getRiskBadge(pred.risk_level)

            return (
              <div
                key={pred.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <div className="text-base font-bold text-slate-900">
                      {course?.course_code || 'CODE'}: {course?.course_title || 'Course Title'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Semester: {pred.course_offerings?.semester}</span>
                      <span>•</span>
                      <span>Evaluated: {new Date(pred.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config.bg}`}
                  >
                    {pred.risk_level} Academic Risk
                  </span>
                </div>

                {/* Score Indicators if linked */}
                {record && (
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Contributing Indicators ({record.evaluation_period || 'Assessment'}):
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">
                          Attendance (100%)
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {record.attendance_percentage}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">
                          Participation (10)
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {record.participation_score} / 10
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">
                          CA Score (30)
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                          {record.ca_score} / 30
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-800 mb-0.5">Assessment Detail:</div>
                  <div className="leading-relaxed">
                    {typeof pred.explanation === 'string'
                      ? pred.explanation
                      : JSON.stringify(pred.explanation) || config.desc}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
