import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const LEVELS = ['ND 1', 'ND 2', 'HND 1', 'HND 2']
const RISK_LEVELS = ['High', 'Medium', 'Low']

export default function CounsellorRiskPage() {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    async function loadPredictions() {
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select(`
            id,
            risk_level,
            explanation,
            created_at,
            profiles:student_id (
              id,
              matric_number,
              full_name,
              academic_level,
              department
            ),
            course_offerings (
              id,
              academic_level,
              semester,
              courses (
                course_code,
                course_title
              )
            ),
            academic_records (
              attendance_percentage,
              participation_score,
              ca_score
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setPredictions(data || [])
      } catch (err) {
        console.error('Error loading predictions:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load risk evaluations.' })
      } finally {
        setLoading(false)
      }
    }

    loadPredictions()
  }, [])

  const highRiskCount = predictions.filter((p) => p.risk_level === 'High').length
  const mediumRiskCount = predictions.filter((p) => p.risk_level === 'Medium').length
  const lowRiskCount = predictions.filter((p) => p.risk_level === 'Low').length

  const filteredPredictions = predictions.filter((p) => {
    const student = p.profiles
      ? { ...p.profiles, level: p.profiles.academic_level || p.profiles.level || 'ND 1' }
      : {}
    if (levelFilter !== 'all' && student.level !== levelFilter) return false
    if (riskFilter !== 'all' && p.risk_level !== riskFilter) return false

    const q = search.toLowerCase()
    return (
      student.matric_number?.toLowerCase().includes(q) ||
      student.full_name?.toLowerCase().includes(q) ||
      p.course_offerings?.courses?.course_code?.toLowerCase().includes(q)
    )
  })

  const riskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> High Risk
          </span>
        )
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Medium Risk
          </span>
        )
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Low Risk
          </span>
        )
      default:
        return (
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            {risk || 'Unknown'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Department Risk Oversight
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Department Risk Monitor
          </h1>
          <p className="text-xs text-slate-500">
            Evaluate academic early warnings, view contributing indicator factors, and triage support.
          </p>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
              High Risk Alerts
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{highRiskCount}</div>
            <div className="text-[11px] text-slate-400">Immediate attention advised</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
              Medium Risk Cases
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{mediumRiskCount}</div>
            <div className="text-[11px] text-slate-400">Watchlist & early tutorial support</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
              Low Risk Standing
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{lowRiskCount}</div>
            <div className="text-[11px] text-slate-400">Satisfactory academic progress</div>
          </div>
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
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by student, matric, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none"
            >
              <option value="all">All Risk Levels</option>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  {r} Risk
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Level:</span>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none"
            >
              <option value="all">All Levels</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            Recorded AI Evaluations ({filteredPredictions.length})
          </h2>
          <span className="text-[11px] text-slate-400">
            Decision-Support Early Warning Signals
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading department risk evaluations...
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No risk records match filters</div>
            <p className="text-xs text-slate-400 mt-1">
              {predictions.length === 0
                ? 'No AI predictions have been logged in the database yet. Lecturers generate evaluations after entering CA and Attendance.'
                : 'Try clearing your search or filter selections.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Student</th>
                  <th className="pb-3 px-3">Course Offering</th>
                  <th className="pb-3 px-3">Risk Level</th>
                  <th className="pb-3 px-3">Indicator Factor Breakdown</th>
                  <th className="pb-3 px-3">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPredictions.map((p) => {
                  const student = p.profiles || {}
                  const offering = p.course_offerings || {}
                  const rec = p.academic_records || {}

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">
                          {student.matric_number || 'PENDING'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700">
                          {student.full_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Level: {student.level || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-indigo-700">
                          {offering.courses?.course_code}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[160px]">
                          {offering.courses?.course_title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {offering.semester}
                        </div>
                      </td>

                      <td className="py-3 px-3">{riskBadge(p.risk_level)}</td>

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {rec.attendance_percentage !== undefined && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-500">Attendance:</span>
                              <span
                                className={`font-bold ${
                                  rec.attendance_percentage < 75 ? 'text-red-600' : 'text-slate-800'
                                }`}
                              >
                                {rec.attendance_percentage}%
                              </span>
                            </div>
                          )}

                          {rec.ca_score !== undefined && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-slate-500">Continuous Assessment:</span>
                              <span
                                className={`font-bold ${
                                  rec.ca_score < 15 ? 'text-amber-600' : 'text-slate-800'
                                }`}
                              >
                                {rec.ca_score} / 30
                              </span>
                            </div>
                          )}

                          {p.explanation && (
                            <div className="text-[10px] text-slate-500 italic max-w-xs truncate">
                              Note: {p.explanation}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
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
