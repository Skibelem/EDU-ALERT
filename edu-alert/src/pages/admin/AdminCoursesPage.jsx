import { useEffect, useState } from 'react'
import {
  BookOpen,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState(null)

  // Form states (Create)
  const [courseCode, setCourseCode] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [creditUnit, setCreditUnit] = useState('3')
  const [department, setDepartment] = useState('SWD')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal states (Edit)
  const [editingCourse, setEditingCourse] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUnit, setEditUnit] = useState('3')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete state
  const [deletingCourseId, setDeletingCourseId] = useState(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('course_code', { ascending: true })

        if (error) throw error
        setCourses(data || [])
      } catch (err) {
        console.error('Error loading courses:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load course catalogue.' })
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  const handleCreateCourse = async (e) => {
    e.preventDefault()
    const code = courseCode.trim().toUpperCase()
    const title = courseTitle.trim()
    const unit = parseInt(creditUnit, 10)

    if (!code || !title || isNaN(unit) || unit <= 0) {
      setFeedback({ type: 'error', message: 'Please provide a valid course code, title, and credit unit.' })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            course_code: code,
            course_title: title,
            department: department.trim() || 'SWD',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      setCourses((prev) => [...prev, data].sort((a, b) => a.course_code.localeCompare(b.course_code)))
      setCourseCode('')
      setCourseTitle('')
      setCreditUnit('3')
      setFeedback({ type: 'success', message: `Course ${code} added to catalogue.` })
    } catch (err) {
      console.error('Error creating course:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to create course.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (course) => {
    setEditingCourse(course)
    setEditTitle(course.course_title)
    setEditUnit(String(course.credit_unit || 3))
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingCourse) return

    const title = editTitle.trim()
    const unit = parseInt(editUnit, 10)

    if (!title || isNaN(unit) || unit <= 0) {
      setFeedback({ type: 'error', message: 'Please provide valid course title and credit units.' })
      return
    }

    setIsSavingEdit(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          course_title: title,
        })
        .eq('id', editingCourse.id)

      if (error) throw error

      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourse.id ? { ...c, course_title: title } : c))
      )
      setFeedback({ type: 'success', message: `Updated ${editingCourse.course_code} successfully.` })
      setEditingCourse(null)
    } catch (err) {
      console.error('Error updating course:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to update course.' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteCourse = async (courseId, courseCode) => {
    if (!window.confirm(`Are you sure you want to delete course ${courseCode}? This cannot be undone if offerings are linked.`)) {
      return
    }

    setDeletingCourseId(courseId)
    setFeedback(null)

    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId)
      if (error) throw error

      setCourses((prev) => prev.filter((c) => c.id !== courseId))
      setFeedback({ type: 'success', message: `Course ${courseCode} removed from catalogue.` })
    } catch (err) {
      console.error('Error deleting course:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete course. It may be linked to active course offerings.',
      })
    } finally {
      setDeletingCourseId(null)
    }
  }

  const filteredCourses = courses.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.course_code?.toLowerCase().includes(q) ||
      c.course_title?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
            Curriculum Administration
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Course Catalogue</h1>
          <p className="text-xs text-slate-500">
            Define departmental curriculum and manage course metadata for SWD.
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
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Layout Grid: Add Form + Catalogue List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Registration Form */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Add New Course</h2>
          </div>

          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SWD 111"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
              <span className="text-[11px] text-slate-400">Department standard prefix (e.g. SWD, COM)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Web Development Fundamentals"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={creditUnit}
                  onChange={(e) => setCreditUnit(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-600 font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-600/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Course'}</span>
            </button>
          </form>
        </div>

        {/* Courses Table / List */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Registered Courses ({filteredCourses.length})
              </h2>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading course catalogue...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">No courses found</div>
              <p className="text-xs text-slate-400 mt-1">
                {search ? 'Try adjusting your search criteria.' : 'Add your first course using the form on the left.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Code</th>
                    <th className="pb-3 px-3">Course Title</th>
                    <th className="pb-3 px-3 text-center">Units</th>
                    <th className="pb-3 px-3">Dept</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {c.course_code}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {c.course_title}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                          {c.credit_unit || 3}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {c.department || 'SWD'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            title="Edit Course"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.course_code)}
                            disabled={deletingCourseId === c.id}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                            title="Delete Course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Edit {editingCourse.course_code}
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Credit Unit
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
