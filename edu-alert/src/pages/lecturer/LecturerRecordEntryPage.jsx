import { useEffect, useState } from 'react'
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Users,
  Search,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function LecturerRecordEntryPage() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState([])
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [students, setStudents] = useState([])
  const [existingRecords, setExistingRecords] = useState({})
  const [evaluationPeriod, setEvaluationPeriod] = useState('Mid-Semester Assessment')
  const [loadingOfferings, setLoadingOfferings] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [savingStudentId, setSavingStudentId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')

  // Form values per student
  const [formValues, setFormValues] = useState({})

  // 1. Load lecturer's assigned offerings
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

        const queryOfferingId = new URLSearchParams(window.location.search).get('offeringId')
        if (queryOfferingId && list.some((o) => o.id === queryOfferingId)) {
          setSelectedOfferingId(queryOfferingId)
        } else if (list.length > 0) {
          setSelectedOfferingId(list[0].id)
        }
      } catch (err) {
        console.error('Error loading offerings:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load offerings.' })
      } finally {
        setLoadingOfferings(false)
      }
    }

    loadOfferings()
  }, [user])

  // 2. Load registered students when offering changes, SORTED STRICTLY BY MATRIC NUMBER
  useEffect(() => {
    async function loadRoster() {
      if (!selectedOfferingId) {
        setStudents([])
        return
      }

      setLoadingStudents(true)
      setFeedback(null)

      try {
        // Query registrations with profiles
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

        // Fetch existing academic records for this offering
        const { data: recData, error: recErr } = await supabase
          .from('academic_records')
          .select('*')
          .eq('offering_id', selectedOfferingId)

        if (recErr) throw recErr

        const recMap = {}
        const initForm = {}

        ;(recData || []).forEach((r) => {
          recMap[r.student_id] = r
          initForm[r.student_id] = {
            attendance: r.attendance_percentage,
            participation: r.participation_score,
            ca: r.ca_score,
          }
        })

        setExistingRecords(recMap)
        setFormValues(initForm)

        // Strict Requirement: Students sorted by MATRIC NUMBER, not alphabetical name!
        const sortedStudents = (regData || [])
          .map((r) => {
            const p = r.profiles || {}
            return {
              id: r.student_id,
              registration_id: r.id,
              matric_number: p.matric_number || 'Matric Pending',
              full_name: p.full_name || 'Enrolled Student',
              level: p.academic_level || p.level || 'ND 1',
              gender: p.gender || 'N/A',
            }
          })
          .sort((a, b) => (a.matric_number || '').localeCompare(b.matric_number || ''))

        setStudents(sortedStudents)
      } catch (err) {
        console.error('Error loading roster:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load student roster.' })
      } finally {
        setLoadingStudents(false)
      }
    }

    loadRoster()
  }, [selectedOfferingId])

  const handleInputChange = (studentId, field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }))
  }

  const handleSaveRecord = async (studentId) => {
    const values = formValues[studentId] || {}
    const attendance = parseFloat(values.attendance)
    const participation = parseFloat(values.participation)
    const ca = parseFloat(values.ca)

    // Validation per specification FR-07
    if (isNaN(attendance) || attendance < 0 || attendance > 100) {
      setFeedback({
        type: 'error',
        message: 'Attendance percentage must be a number between 0 and 100.',
      })
      return
    }
    if (isNaN(participation) || participation < 0 || participation > 10) {
      setFeedback({
        type: 'error',
        message: 'Class participation score must be a number between 0 and 10.',
      })
      return
    }
    if (isNaN(ca) || ca < 0 || ca > 30) {
      setFeedback({
        type: 'error',
        message: 'Continuous Assessment (CA) score must be a number between 0 and 30.',
      })
      return
    }

    setSavingStudentId(studentId)
    setFeedback(null)

    try {
      const existing = existingRecords[studentId]

      if (existing) {
        // Try dedicated RPC first, fallback to table update
        const { error: rpcErr } = await supabase.rpc('update_academic_record', {
          p_record_id: existing.id,
          p_attendance_percentage: attendance,
          p_participation_score: participation,
          p_ca_score: ca,
        })

        if (rpcErr) {
          const { error: updErr } = await supabase
            .from('academic_records')
            .update({
              attendance_percentage: attendance,
              participation_score: participation,
              ca_score: ca,
              evaluation_period: evaluationPeriod,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (updErr) throw updErr
        }
      } else {
        // Try RPC create or direct insert
        const { error: rpcErr } = await supabase.rpc('create_academic_record', {
          p_student_id: studentId,
          p_offering_id: selectedOfferingId,
          p_attendance_percentage: attendance,
          p_participation_score: participation,
          p_ca_score: ca,
          p_evaluation_period: evaluationPeriod,
        })

        if (rpcErr) {
          const { data: insData, error: insErr } = await supabase
            .from('academic_records')
            .insert([
              {
                student_id: studentId,
                offering_id: selectedOfferingId,
                recorded_by: user.id,
                attendance_percentage: attendance,
                participation_score: participation,
                ca_score: ca,
                evaluation_period: evaluationPeriod,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single()

          if (insErr) throw insErr
          setExistingRecords((prev) => ({ ...prev, [studentId]: insData }))
        }
      }

      setFeedback({
        type: 'success',
        message: 'Academic indicator record saved successfully.',
      })
    } catch (err) {
      console.error('Error saving record:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save academic record.',
      })
    } finally {
      setSavingStudentId(null)
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      (s.matric_number || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.full_name || '').toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Assessment Entry
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Academic Records</h1>
          <p className="text-xs text-slate-500">
            Enter Attendance (0–100%), Participation (0–10), and CA Scores (0–30).
          </p>
        </div>

        {/* Offering Selector */}
        <div className="w-full sm:w-auto">
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Course Offering
          </label>
          <select
            value={selectedOfferingId}
            onChange={(e) => setSelectedOfferingId(e.target.value)}
            disabled={loadingOfferings || offerings.length === 0}
            className="w-full sm:w-72 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
          >
            {offerings.map((off) => (
              <option key={off.id} value={off.id}>
                {off.courses?.course_code}: {off.courses?.course_title} ({off.academic_level || off.level} - {off.semester})
              </option>
            ))}
          </select>
        </div>
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

      {/* Roster Controls & Search */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">Enrolled Students:</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono">
              {students.length}
            </span>
            <span className="text-[11px] text-slate-400">
              (Sorted strictly by matriculation number)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search matric or name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white"
              />
            </div>

            <select
              value={evaluationPeriod}
              onChange={(e) => setEvaluationPeriod(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
            >
              <option value="Mid-Semester Assessment">Mid-Semester Assessment</option>
              <option value="Continuous Assessment 1">Continuous Assessment 1</option>
              <option value="Continuous Assessment 2">Continuous Assessment 2</option>
              <option value="Final Continuous Assessment">Final Continuous Assessment</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        {loadingStudents ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Loading student roster...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No registered students found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Either no students have enrolled in this course offering yet or no matches found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Matric Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 text-center">Attendance % (0-100)</th>
                  <th className="py-2.5 px-3 text-center">Participation (0-10)</th>
                  <th className="py-2.5 px-3 text-center">CA Score (0-30)</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const values = formValues[s.id] || {}
                  const isSaved = Boolean(existingRecords[s.id])
                  const isSaving = savingStudentId === s.id

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {s.matric_number || 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <div>{s.full_name}</div>
                        <div className="text-[10px] text-slate-400">{s.level}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0-100"
                          value={values.attendance ?? ''}
                          onChange={(e) => handleInputChange(s.id, 'attendance', e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          placeholder="0-10"
                          value={values.participation ?? ''}
                          onChange={(e) => handleInputChange(s.id, 'participation', e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                          placeholder="0-30"
                          value={values.ca ?? ''}
                          onChange={(e) => handleInputChange(s.id, 'ca', e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleSaveRecord(s.id)}
                          disabled={isSaving}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                            isSaved
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Saving...' : isSaved ? 'Update' : 'Save'}</span>
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
  )
}
