import { useEffect, useState } from 'react'
import {
  HeartHandshake,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function LecturerInterventionsPage() {
  const { user } = useAuth()
  const [interventions, setInterventions] = useState([])
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // New intervention form state
  const [formOfferingId, setFormOfferingId] = useState('')
  const [rosterStudents, setRosterStudents] = useState([])
  const [formStudentId, setFormStudentId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return
      setLoading(true)
      setFeedback(null)

      try {
        // 1. Fetch assigned offerings
        const { data: assignData } = await supabase
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

        const offList = (assignData || []).map((a) => a.course_offerings).filter(Boolean)
        setOfferings(offList)
        if (offList.length > 0) setFormOfferingId(offList[0].id)

        // 2. Fetch interventions created by this lecturer
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
            ),
            course_offerings (
              courses (
                course_code
              )
            )
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })

        if (intErr) throw intErr
        setInterventions(intData || [])
      } catch (err) {
        console.error('Error loading interventions:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load interventions.' })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  // When form offering changes, load eligible registered students
  useEffect(() => {
    async function loadOfferingRoster() {
      if (!formOfferingId) {
        setRosterStudents([])
        return
      }

      try {
        const { data } = await supabase
          .from('course_registrations')
          .select(`
            student_id,
            profiles:student_id (
              id,
              matric_number,
              full_name
            )
          `)
          .eq('offering_id', formOfferingId)
          .eq('status', 'registered')

        const studentList = (data || []).map((d) => ({
          id: d.student_id,
          matric_number: d.profiles?.matric_number || 'Matric Pending',
          full_name: d.profiles?.full_name || 'Enrolled Student',
        }))
        setRosterStudents(studentList)
        if (studentList.length > 0) setFormStudentId(studentList[0].id)
      } catch (err) {
        console.error('Error loading offering students:', err)
      }
    }

    loadOfferingRoster()
  }, [formOfferingId])

  const handleCreateIntervention = async (e) => {
    e.preventDefault()
    if (!formStudentId || !formOfferingId || !formTitle.trim() || !formMessage.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in all required intervention fields.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from('interventions')
        .insert([
          {
            student_id: formStudentId,
            offering_id: formOfferingId,
            created_by: user.id,
            title: formTitle.trim(),
            message: formMessage.trim(),
            status: 'Open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
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
          ),
          course_offerings (
            courses (
              course_code
            )
          )
        `)
        .single()

      if (error) throw error

      setInterventions((prev) => [data, ...prev])
      setFormTitle('')
      setFormMessage('')
      setShowCreateModal(false)
      setFeedback({ type: 'success', message: 'Intervention created successfully!' })
    } catch (err) {
      console.error('Error creating intervention:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to create intervention.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusUpdate = async (interventionId, newStatus) => {
    try {
      const { error } = await supabase
        .from('interventions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', interventionId)

      if (error) throw error

      setInterventions((prev) =>
        prev.map((i) => (i.id === interventionId ? { ...i, status: newStatus } : i))
      )
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Student Support
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            Student Support Interventions
          </h1>
          <p className="text-xs text-slate-500">
            Create guidance and advising actions for students enrolled in your assigned offerings.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Intervention</span>
        </button>
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

      {/* Interventions List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">Logged Interventions</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Support requests initiated for your students</p>
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono">
            {interventions.length} Total
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading interventions...</div>
        ) : interventions.length === 0 ? (
          <div className="py-10 text-center">
            <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No interventions logged</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;New Intervention&quot; above to create academic advising notes for students.
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
                      {item.course_offerings?.courses?.course_code || 'Course'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-700">
                      {item.profiles?.matric_number} ({item.profiles?.full_name})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <div className="text-[10px] text-slate-400 flex items-center gap-3">
                    <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>
                      {item.acknowledged_at ? (
                        <span className="text-emerald-700 font-medium">
                          Acknowledged by student on {new Date(item.acknowledged_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-amber-600">Pending student acknowledgement</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                    className="text-xs px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Creating Intervention */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 m-0">Create Student Intervention</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Offering
                </label>
                <select
                  value={formOfferingId}
                  onChange={(e) => setFormOfferingId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {offerings.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.courses?.course_code}: {off.courses?.course_title} ({off.academic_level || off.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student (From Offering Roster)
                </label>
                <select
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  disabled={rosterStudents.length === 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                >
                  {rosterStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.matric_number} — {st.full_name}
                    </option>
                  ))}
                </select>
                {rosterStudents.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No registered students found in this offering.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Continuous Assessment Advisory"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guidance Message / Advice
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide specific academic guidance or request an advising meeting..."
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rosterStudents.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Save Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
