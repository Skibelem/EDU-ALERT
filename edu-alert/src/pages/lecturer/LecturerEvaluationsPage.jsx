import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Users,
  Info,
  X,
  Play,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function LecturerEvaluationsPage() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState([])
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [roster, setRoster] = useState([])
  const [predictions, setPredictions] = useState({})
  const [activeModel, setActiveModel] = useState(null)
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // 1. Fetch lecturer's assigned offerings
  useEffect(() => {
    async function loadOfferings() {
      if (!user?.id) return
      setLoadingOfferings(true)

      try {
        const { data, error } = await supabase
          .from('lecturer_assignments')
          .select(`
            offering_id,
            course_offerings (
              id,
              semester,
              academic_level,
              courses (
                course_code,
                course_title
              )
            )
          `)
          .eq('lecturer_id', user.id)

        if (error) throw error

        const list = (data || []).map((d) => d.course_offerings).filter(Boolean)
        setOfferings(list)
        if (list.length > 0) {
          setSelectedOfferingId(list[0].id)
        }

        // Check active model version
        const { data: modelData } = await supabase
          .from('model_versions')
          .select('*')
          .eq('is_active', true)
          .maybeSingle()

        setActiveModel(modelData)
      } catch (err) {
        console.error('Error loading assigned offerings:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load assigned courses.' })
      } finally {
        setLoadingOfferings(false)
      }
    }

    loadOfferings()
  }, [user])

  // 2. Fetch roster, records, and predictions for selected offering
  useEffect(() => {
    async function loadOfferingDetails() {
      if (!selectedOfferingId) {
        setRoster([])
        return
      }

      setLoadingRoster(true)
      setFeedback(null)

      try {
        // Query registrations
        const { data: regData, error: regErr } = await supabase
          .from('course_registrations')
          .select(`
            id,
            student_id,
            status,
            profiles:student_id (
              id,
              matric_number,
              full_name,
              academic_level,
              gender
            )
          `)
          .eq('offering_id', selectedOfferingId)
          .eq('status', 'registered')

        if (regErr) throw regErr

        // Query academic records for this offering
        const { data: recData, error: recErr } = await supabase
          .from('academic_records')
          .select('*')
          .eq('offering_id', selectedOfferingId)

        if (recErr) throw recErr

        const recMap = {}
        ;(recData || []).forEach((r) => {
          recMap[r.student_id] = r
        })

        // Query existing predictions for this offering
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select('*')
          .eq('offering_id', selectedOfferingId)
          .order('created_at', { ascending: false })

        if (predErr) throw predErr

        const predMap = {}
        ;(predData || []).forEach((p) => {
          if (!predMap[p.student_id]) {
            predMap[p.student_id] = p
          }
        })
        setPredictions(predMap)

        // Strict Requirement: Students sorted strictly by MATRIC NUMBER
        const compiled = (regData || [])
          .map((r) => {
            const p = r.profiles || {}
            return {
              id: r.student_id,
              matric_number: p.matric_number || 'Matric Pending',
              full_name: p.full_name || 'Enrolled Student',
              level: p.academic_level || p.level || 'ND 1',
              academicRecord: recMap[r.student_id] || null,
            }
          })
          .filter((s) => s && s.id)
          .sort((a, b) => (a.matric_number || '').localeCompare(b.matric_number || ''))

        setRoster(compiled)
      } catch (err) {
        console.error('Error loading offering details:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load roster records.' })
      } finally {
        setLoadingRoster(false)
      }
    }

    loadOfferingDetails()
  }, [selectedOfferingId])

  const handleTriggerEvaluation = async () => {
    setEvaluating(true)
    setFeedback(null)

    // Master Specification FR-08:
    // "The frontend shall request predictions through a secured backend/API boundary, not by running the model in the browser."
    // "If the model is unavailable or untrained, the system shall display a clear unavailable/not-yet-configured state; it shall not invent a prediction."
    try {
      // In this phase, we check if the backend evaluation service is configured
      const apiUrl = import.meta.env.VITE_AI_SERVICE_URL

      if (!apiUrl) {
        setFeedback({
          type: 'info',
          message:
            'AI Inference Service is awaiting local server launch (FastAPI/Python ML microservice). Academic indicator records have been validated and saved in PostgreSQL.',
        })
        return
      }

      // Get current auth session token from Supabase
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token

      const reqHeaders = {
        'Content-Type': 'application/json',
      }
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`
      }

      // If backend API URL exists, call the secured endpoint
      const response = await fetch(`${apiUrl}/predict/offering/${selectedOfferingId}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          evaluator_id: user.id,
        }),
      })

      if (!response.ok) {
        let errMsg = `Inference service returned status ${response.status}`
        try {
          const errBody = await response.json()
          if (errBody.detail) errMsg = errBody.detail
        } catch {
          // ignore json parse fail
        }
        throw new Error(errMsg)
      }

      const resData = await response.json()

      // Reload latest predictions from Supabase
      const { data: updatedPreds } = await supabase
        .from('predictions')
        .select('*')
        .eq('offering_id', selectedOfferingId)
        .order('created_at', { ascending: false })

      const predMap = {}

      // 1. Immediately display the real evaluated results returned by the Decision Tree model
      if (Array.isArray(resData.results)) {
        resData.results.forEach((p) => {
          if (p.student_id) {
            predMap[p.student_id] = p
          }
        })
      }

      // 2. Merge with any database-persisted rows
      ;(updatedPreds || []).forEach((p) => {
        predMap[p.student_id] = p
      })

      setPredictions(predMap)

      setFeedback({
        type: 'success',
        message: `Evaluation completed successfully. Evaluated ${resData.evaluatedCount || 0} student(s) with Decision Tree model.`,
      })
    } catch (err) {
      console.error('Evaluation request error:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Evaluation request failed.',
      })
    } finally {
      setEvaluating(false)
    }
  }

  const riskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> High Risk
          </span>
        )
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Medium Risk
          </span>
        )
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Low Risk
          </span>
        )
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500">
            Not Evaluated
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Machine Learning Early Warning
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">AI Risk Evaluation</h1>
          <p className="text-xs text-slate-500">
            Course-specific early warning predictions based on validated continuous assessment and attendance.
          </p>
        </div>

        {activeModel && (
          <div className="text-right bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Classifier
            </div>
            <div className="text-xs font-bold text-indigo-700 mt-0.5">
              {activeModel.model_name} ({activeModel.version})
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : feedback.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          ) : feedback.type === 'info' ? (
            <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          )}
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Course Offering Selector & Action */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="w-full md:w-auto flex-1 max-w-md">
          <label className="block text-xs font-semibold text-slate-500 mb-1">
            Assigned Course Offering:
          </label>
          {loadingOfferings ? (
            <div className="text-xs text-slate-400">Loading offerings...</div>
          ) : offerings.length === 0 ? (
            <div className="text-xs text-amber-700 font-semibold">
              No course offerings assigned to your account.
            </div>
          ) : (
            <select
              value={selectedOfferingId}
              onChange={(e) => setSelectedOfferingId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {offerings.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.courses?.course_code} - {off.courses?.course_title} ({off.academic_level || off.level}, {off.semester})
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          onClick={handleTriggerEvaluation}
          disabled={evaluating || roster.length === 0}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{evaluating ? 'Requesting...' : 'Request AI Evaluation'}</span>
        </button>
      </div>

      {/* Roster & Prediction Results */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Registered Students ({roster.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Sorted strictly by Matriculation Number
          </span>
        </div>

        {loadingRoster ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading student evaluations...
          </div>
        ) : roster.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No students registered yet</div>
            <p className="text-xs text-slate-400 mt-1">
              Students will appear here once they enroll for this course offering.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Matric Number</th>
                  <th className="pb-3 px-3">Student Name</th>
                  <th className="pb-3 px-3 text-center">Attendance (0-100)</th>
                  <th className="pb-3 px-3 text-center">Participation (0-10)</th>
                  <th className="pb-3 px-3 text-center">CA Score (0-30)</th>
                  <th className="pb-3 px-3 text-center">AI Risk Assessment</th>
                  <th className="pb-3 px-3">Evaluation Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((s) => {
                  const rec = s.academicRecord
                  const pred = predictions[s.id]

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {s.matric_number || 'PENDING'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {s.full_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rec?.attendance_percentage !== undefined ? (
                          <span
                            className={`font-bold ${
                              rec.attendance_percentage < 75 ? 'text-red-600' : 'text-slate-800'
                            }`}
                          >
                            {rec.attendance_percentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rec?.participation_score !== undefined ? (
                          <span className="font-bold text-slate-800">{rec.participation_score}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {rec?.ca_score !== undefined ? (
                          <span
                            className={`font-bold ${
                              rec.ca_score < 15 ? 'text-amber-600' : 'text-slate-800'
                            }`}
                          >
                            {rec.ca_score}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not entered</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {riskBadge(pred?.risk_level)}
                      </td>
                      <td className="py-3 px-3">
                        {pred?.explanation ? (
                          <div className="text-[11px] text-slate-600 max-w-xs truncate">
                            {pred.explanation}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {rec ? 'Ready for evaluation' : 'Pending score entry'}
                          </span>
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
  )
}
