import { useEffect, useState } from 'react'
import {
  Users,
  Search,
  AlertTriangle,
  HeartHandshake,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/useAuth'

const LEVELS = ['ND 1', 'ND 2', 'HND 1', 'HND 2']

export default function CounsellorStudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [feedback, setFeedback] = useState(null)

  // Quick intervention modal state
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentOfferings, setStudentOfferings] = useState([])
  const [targetOfferingId, setTargetOfferingId] = useState('')
  const [interventionTitle, setInterventionTitle] = useState('')
  const [interventionMessage, setInterventionMessage] = useState('')
  const [isSubmittingIntervention, setIsSubmittingIntervention] = useState(false)

  useEffect(() => {
    async function loadStudents() {
      try {
        // 1. Fetch all SWD students
        const { data: stdData, error: stdErr } = await supabase
          .from('profiles')
          .select(`
            id,
            matric_number,
            full_name,
            email,
            academic_level,
            gender,
            department,
            created_at
          `)
          .eq('role', 'student')
          .eq('department', 'SWD')

        if (stdErr) throw stdErr

        // 2. Fetch registrations, predictions, and interventions to compile summaries
        const [
          { data: regData },
          { data: predData },
          { data: intData },
        ] = await Promise.all([
          supabase.from('course_registrations').select('student_id, offering_id, status'),
          supabase.from('predictions').select('student_id, risk_level, created_at'),
          supabase.from('interventions').select('student_id, status'),
        ])

        // Map registrations count
        const regCountMap = {}
        ;(regData || []).forEach((r) => {
          if (r.status === 'registered') {
            regCountMap[r.student_id] = (regCountMap[r.student_id] || 0) + 1
          }
        })

        // Map highest risk
        const riskMap = {}
        ;(predData || []).forEach((p) => {
          const cur = riskMap[p.student_id]
          if (!cur || p.risk_level === 'High' || (p.risk_level === 'Medium' && cur !== 'High')) {
            riskMap[p.student_id] = p.risk_level
          }
        })

        // Map active interventions count
        const intCountMap = {}
        ;(intData || []).forEach((i) => {
          if (i.status === 'Open' || i.status === 'In Progress') {
            intCountMap[i.student_id] = (intCountMap[i.student_id] || 0) + 1
          }
        })

        // Combine and SORT STRICTLY BY MATRIC NUMBER
        const compiled = (stdData || [])
          .map((s) => ({
            ...s,
            level: s.academic_level || s.level || 'ND 1',
            registeredCoursesCount: regCountMap[s.id] || 0,
            currentRisk: riskMap[s.id] || 'Not Evaluated',
            activeInterventionsCount: intCountMap[s.id] || 0,
          }))
          .sort((a, b) => (a.matric_number || '').localeCompare(b.matric_number || ''))

        setStudents(compiled)
      } catch (err) {
        console.error('Error loading SWD students:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load students directory.' })
      } finally {
        setLoading(false)
      }
    }

    loadStudents()
  }, [])

  // Open modal to create intervention for a specific student
  const openInterventionModal = async (student) => {
    setSelectedStudent(student)
    setInterventionTitle(`Academic Advising Session - ${student.full_name}`)
    setInterventionMessage('')
    setFeedback(null)

    try {
      // Fetch student's registered offerings
      const { data, error } = await supabase
        .from('course_registrations')
        .select(`
          offering_id,
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
        .eq('student_id', student.id)
        .eq('status', 'registered')

      if (error) throw error

      const offList = (data || []).map((d) => d.course_offerings).filter(Boolean)
      setStudentOfferings(offList)
      if (offList.length > 0) {
        setTargetOfferingId(offList[0].id)
      } else {
        setTargetOfferingId('')
      }
    } catch (err) {
      console.error('Error loading offerings for student:', err)
      setFeedback({ type: 'error', message: 'Could not load student course offerings.' })
    }
  }

  const handleCreateIntervention = async (e) => {
    e.preventDefault()
    if (!selectedStudent || !targetOfferingId || !interventionTitle.trim() || !interventionMessage.trim()) {
      setFeedback({ type: 'error', message: 'Please complete all required fields.' })
      return
    }

    setIsSubmittingIntervention(true)
    setFeedback(null)

    try {
      const { error } = await supabase.from('interventions').insert([
        {
          student_id: selectedStudent.id,
          offering_id: targetOfferingId,
          title: interventionTitle.trim(),
          message: interventionMessage.trim(),
          status: 'Open',
          created_by: user.id,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      // Update local state count
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? { ...s, activeInterventionsCount: s.activeInterventionsCount + 1 }
            : s
        )
      )

      setFeedback({
        type: 'success',
        message: `Intervention logged for ${selectedStudent.matric_number} (${selectedStudent.full_name}).`,
      })
      setSelectedStudent(null)
    } catch (err) {
      console.error('Error logging intervention:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to create intervention.' })
    } finally {
      setIsSubmittingIntervention(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    if (levelFilter !== 'all' && s.level !== levelFilter) return false
    const q = search.toLowerCase()
    return (
      s.matric_number?.toLowerCase().includes(q) ||
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  })

  const riskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3" /> High Risk
          </span>
        )
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Medium Risk
          </span>
        )
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Low Risk
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
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
            Adviser Student Directory
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">SWD Student Directory</h1>
          <p className="text-xs text-slate-500">
            Comprehensive roster of students across ND 1 to HND 2 in Software & Web Development.
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
            placeholder="Search by matric number or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500">Filter Level:</label>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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

      {/* Student List Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Department Students ({filteredStudents.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Roster sorted strictly by Matriculation Number
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading student directory...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No students found</div>
            <p className="text-xs text-slate-400 mt-1">
              {search || levelFilter !== 'all'
                ? 'Try adjusting your search query or level filter.'
                : 'No student accounts have registered yet in the SWD department.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Matric Number</th>
                  <th className="pb-3 px-3">Student Name</th>
                  <th className="pb-3 px-3">Level</th>
                  <th className="pb-3 px-3 text-center">Courses</th>
                  <th className="pb-3 px-3">Risk Assessment</th>
                  <th className="pb-3 px-3 text-center">Interventions</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {s.matric_number || 'PENDING'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {s.full_name}
                      <div className="text-[11px] text-slate-400 font-normal">{s.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[11px]">
                        {s.level || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                        <BookOpen className="w-3 h-3 text-indigo-400" />
                        {s.registeredCoursesCount}
                      </span>
                    </td>
                    <td className="py-3 px-3">{riskBadge(s.currentRisk)}</td>
                    <td className="py-3 px-3 text-center">
                      {s.activeInterventionsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          <HeartHandshake className="w-3 h-3" />
                          {s.activeInterventionsCount} Active
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openInterventionModal(s)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                      >
                        <HeartHandshake className="w-3.5 h-3.5" />
                        Intervene
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Intervention Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Open Support Intervention
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {selectedStudent.matric_number} ({selectedStudent.full_name})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentOfferings.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-2">
                <strong>No course registrations:</strong>
                <p>
                  This student has not registered for any active course offerings. Interventions must be anchored to an academic course offering.
                </p>
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-white text-slate-700 border border-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateIntervention} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Course Offering <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetOfferingId}
                    onChange={(e) => setTargetOfferingId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {studentOfferings.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.courses?.course_code} - {off.courses?.course_title} ({off.academic_level || off.level}, {off.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Intervention Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={interventionTitle}
                    onChange={(e) => setInterventionTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Action Plan & Advice Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe recommended steps, counseling session time, tutorial assignments..."
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-400">
                    The student will be able to review this guidance and acknowledge receipt.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingIntervention}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{isSubmittingIntervention ? 'Logging...' : 'Log Intervention'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
