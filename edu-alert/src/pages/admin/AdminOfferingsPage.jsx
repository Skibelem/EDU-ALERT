import { useEffect, useState } from 'react'
import {
  Building2,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

const LEVELS = ['ND 1', 'ND 2', 'HND 1', 'HND 2']
const SEMESTERS = [
  { value: 'First', label: 'First Semester' },
  { value: 'Second', label: 'Second Semester' },
  { value: '1st', label: '1st Semester' },
  { value: '2nd', label: '2nd Semester' },
]

export default function AdminOfferingsPage() {
  const [offerings, setOfferings] = useState([])
  const [courses, setCourses] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)

  // Creation Form state
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('ND 1')
  const [selectedSemester, setSelectedSemester] = useState('First')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [filterLevel, setFilterLevel] = useState('all')
  const [filterSemester, setFilterSemester] = useState('all')
  const [deletingId, setDeletingId] = useState(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const { data: sessData, error: sessErr } = await supabase
          .from('academic_sessions')
          .select('*')
          .order('is_active', { ascending: false })

        if (sessErr) throw sessErr
        if (!isMounted) return
        setSessions(sessData || [])

        const active = (sessData || []).find((s) => s.is_active)
        if (active) {
          setSelectedSessionId(active.id)
        } else if (sessData && sessData.length > 0) {
          setSelectedSessionId(sessData[0].id)
        }

        const { data: crsData, error: crsErr } = await supabase
          .from('courses')
          .select('*')
          .order('course_code', { ascending: true })

        if (crsErr) throw crsErr
        if (!isMounted) return
        setCourses(crsData || [])
        if (crsData && crsData.length > 0) {
          setSelectedCourseId(crsData[0].id)
        }

        const { data: offData, error: offErr } = await supabase
          .from('course_offerings')
          .select(`
            id,
            academic_level,
            semester,
            created_at,
            courses (
              id,
              course_code,
              course_title
            ),
            academic_sessions (
              id,
              session_name,
              is_active
            ),
            lecturer_assignments (
              id,
              profiles (
                full_name
              )
            ),
            course_registrations (
              id
            )
          `)
          .order('created_at', { ascending: false })

        if (offErr) throw offErr
        if (!isMounted) return
        setOfferings(offData || [])
      } catch (err) {
        if (!isMounted) return
        console.error('Error loading initial data for offerings:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load prerequisite data.' })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [reloadTrigger])

  const handleCreateOffering = async (e) => {
    e.preventDefault()
    if (!selectedSessionId || !selectedCourseId || !selectedLevel || !selectedSemester) {
      setFeedback({ type: 'error', message: 'Please select all required fields.' })
      return
    }

    // Check duplicate in local state
    const isDuplicate = offerings.some(
      (o) =>
        o.courses?.id === selectedCourseId &&
        o.academic_sessions?.id === selectedSessionId &&
        (o.academic_level || o.level) === selectedLevel &&
        o.semester === selectedSemester
    )

    if (isDuplicate) {
      setFeedback({
        type: 'error',
        message: 'This course offering already exists for the selected session, level, and semester.',
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const { error } = await supabase.from('course_offerings').insert([
        {
          course_id: selectedCourseId,
          session_id: selectedSessionId,
          academic_level: selectedLevel,
          semester: selectedSemester,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      setReloadTrigger((prev) => prev + 1)
      setFeedback({ type: 'success', message: 'Course offering scheduled successfully!' })
    } catch (err) {
      console.error('Error creating offering:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to create course offering.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteOffering = async (offeringId, courseCode) => {
    if (!window.confirm(`Delete offering for ${courseCode}? Associated student registrations and records will be affected.`)) {
      return
    }

    setDeletingId(offeringId)
    setFeedback(null)

    try {
      const { error } = await supabase.from('course_offerings').delete().eq('id', offeringId)
      if (error) throw error

      setOfferings((prev) => prev.filter((o) => o.id !== offeringId))
      setFeedback({ type: 'success', message: `Offering for ${courseCode} removed.` })
    } catch (err) {
      console.error('Error deleting offering:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete offering. It may have student registrations.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filteredOfferings = offerings.filter((o) => {
    const lvl = o.academic_level || o.level
    if (filterLevel !== 'all' && lvl !== filterLevel) return false
    if (filterSemester !== 'all' && o.semester !== filterSemester) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
            Curriculum Scheduling
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Course Offerings</h1>
          <p className="text-xs text-slate-500">
            Schedule course catalogue items by linking them to Academic Sessions, Levels, and Semesters.
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

      {/* Form + Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Schedule New Offering</h2>
          </div>

          {sessions.length === 0 || courses.length === 0 ? (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <strong>Prerequisites missing:</strong>
              <p>You must create at least one Academic Session and one Course Catalogue item before scheduling offerings.</p>
            </div>
          ) : (
            <form onSubmit={handleCreateOffering} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.session_name} {s.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} - {c.course_title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SEMESTERS.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Scheduling...' : 'Schedule Offering'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Offerings Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Scheduled Offerings ({filteredOfferings.length})
              </h2>
            </div>

            {/* Level / Semester Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">All Levels</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">All Semesters</option>
                {SEMESTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading scheduled offerings...
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">No offerings scheduled</div>
              <p className="text-xs text-slate-400 mt-1">
                Schedule course offerings using the form on the left.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Course</th>
                    <th className="pb-3 px-3">Session & Sem</th>
                    <th className="pb-3 px-3">Target Level</th>
                    <th className="pb-3 px-3 text-center">Enrolled</th>
                    <th className="pb-3 px-3">Lecturer</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOfferings.map((o) => {
                    const lecturers = o.lecturer_assignments || []
                    const enrolledCount = o.course_registrations?.length || 0

                    return (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-indigo-700">
                            {o.courses?.course_code}
                          </div>
                          <div className="text-[11px] text-slate-600 truncate max-w-[180px]">
                            {o.courses?.course_title}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">
                            {o.academic_sessions?.session_name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {o.semester}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                            {o.academic_level || o.level}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                            <Users className="w-3 h-3 text-slate-400" />
                            {enrolledCount}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {lecturers.length === 0 ? (
                            <span className="text-amber-600 font-medium text-[11px]">Unassigned</span>
                          ) : (
                            <div className="text-[11px] font-medium text-slate-700">
                              {lecturers.map((l) => l.profiles?.full_name).filter(Boolean).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDeleteOffering(o.id, o.courses?.course_code)}
                            disabled={deletingId === o.id}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                            title="Delete Offering"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  )
}
