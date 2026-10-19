import { useEffect, useState } from 'react'
import {
  HeartHandshake,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled']

export default function CounsellorInterventionsPage() {
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [feedback, setFeedback] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    async function loadInterventions() {
      try {
        const { data, error } = await supabase
          .from('interventions')
          .select(`
            id,
            title,
            message,
            status,
            acknowledged_at,
            created_at,
            created_by,
            profiles:student_id (
              id,
              matric_number,
              full_name,
              academic_level
            ),
            course_offerings (
              id,
              academic_level,
              semester,
              courses (
                course_code,
                course_title
              )
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setInterventions(data || [])
      } catch (err) {
        console.error('Error loading counsellor interventions:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load support interventions.' })
      } finally {
        setLoading(false)
      }
    }

    loadInterventions()
  }, [])

  const handleUpdateStatus = async (interventionId, newStatus) => {
    setUpdatingId(interventionId)
    setFeedback(null)

    try {
      const { error } = await supabase
        .from('interventions')
        .update({ status: newStatus })
        .eq('id', interventionId)

      if (error) throw error

      setInterventions((prev) =>
        prev.map((i) => (i.id === interventionId ? { ...i, status: newStatus } : i))
      )
      setFeedback({ type: 'success', message: `Intervention status updated to ${newStatus}.` })
    } catch (err) {
      console.error('Error updating status:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to update intervention status.' })
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredInterventions = interventions.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      i.title?.toLowerCase().includes(q) ||
      i.profiles?.matric_number?.toLowerCase().includes(q) ||
      i.profiles?.full_name?.toLowerCase().includes(q) ||
      i.course_offerings?.courses?.course_code?.toLowerCase().includes(q)
    )
  })

  const statusBadge = (status) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            Open
          </span>
        )
      case 'In Progress':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
            In Progress
          </span>
        )
      case 'Completed':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            Completed
          </span>
        )
      case 'Cancelled':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
            Cancelled
          </span>
        )
      default:
        return <span className="text-xs text-slate-500">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Support Case Management
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Support Interventions
          </h1>
          <p className="text-xs text-slate-500">
            Track pastoral and academic support actions, monitor student receipt, and record resolution.
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

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by student, matric, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interventions Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Department Interventions ({filteredInterventions.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Adviser & Lecturer Academic Support Log
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading interventions...
          </div>
        ) : filteredInterventions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No interventions found</div>
            <p className="text-xs text-slate-400 mt-1">
              You can log interventions from the Student Directory or Lecturer Records entry pages.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Student</th>
                  <th className="pb-3 px-3">Course Offering</th>
                  <th className="pb-3 px-3">Intervention Details</th>
                  <th className="pb-3 px-3">Student Acknowledgement</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterventions.map((i) => {
                  const student = i.profiles || {}
                  const offering = i.course_offerings || {}

                  return (
                    <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-900">
                          {student.matric_number || 'PENDING'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700">
                          {student.full_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Level: {student.academic_level || student.level || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-indigo-700">
                          {offering.courses?.course_code}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[140px]">
                          {offering.courses?.course_title}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{i.title}</div>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 max-w-sm">
                          {i.message}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Logged: {i.created_at ? new Date(i.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {i.acknowledged_at ? (
                          <div className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Acknowledged ({new Date(i.acknowledged_at).toLocaleDateString()})</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px] flex items-center gap-1 italic">
                            <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span>Unacknowledged</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">{statusBadge(i.status)}</td>

                      <td className="py-3 px-3 text-right">
                        <select
                          value={i.status}
                          disabled={updatingId === i.id}
                          onChange={(e) => handleUpdateStatus(i.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
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
