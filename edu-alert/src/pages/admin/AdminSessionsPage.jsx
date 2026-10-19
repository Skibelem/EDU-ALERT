import { useEffect, useState } from 'react'
import { PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionName, setSessionName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    async function loadSessions() {
      try {
        const { data, error } = await supabase
          .from('academic_sessions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setSessions(data || [])
      } catch (err) {
        console.error('Error loading sessions:', err)
        setFeedback({ type: 'error', message: err.message || 'Failed to load sessions.' })
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [])

  const handleCreateSession = async (e) => {
    e.preventDefault()
    if (!sessionName.trim()) return

    setIsSubmitting(true)
    setFeedback(null)

    try {
      // If setting as active, deactivate other sessions
      if (isActive) {
        await supabase.from('academic_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      }

      const { data, error } = await supabase
        .from('academic_sessions')
        .insert([
          {
            session_name: sessionName.trim(),
            start_date: startDate || null,
            end_date: endDate || null,
            is_active: isActive,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error

      setSessions((prev) => [data, ...prev.map((s) => (isActive ? { ...s, is_active: false } : s))])
      setSessionName('')
      setStartDate('')
      setEndDate('')
      setIsActive(false)
      setFeedback({ type: 'success', message: 'Academic session created successfully!' })
    } catch (err) {
      console.error('Error creating session:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to create academic session.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (sessionId, currentActive) => {
    if (currentActive) return // Already active

    try {
      // 1. Deactivate all
      await supabase.from('academic_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
      // 2. Activate target
      await supabase.from('academic_sessions').update({ is_active: true }).eq('id', sessionId)

      setSessions((prev) =>
        prev.map((s) => ({
          ...s,
          is_active: s.id === sessionId,
        }))
      )
      setFeedback({ type: 'success', message: 'Active academic session updated.' })
    } catch (err) {
      console.error('Error toggling active session:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to update active session.' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
            System Configuration
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">Academic Sessions</h1>
          <p className="text-xs text-slate-500">
            Manage institutional academic sessions and designate the currently active session.
          </p>
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

      {/* Grid: Create Form + Session List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Form */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 h-fit">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 m-0">Add Academic Session</h2>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2025/2026 Academic Session"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is-active" className="text-xs text-slate-700 font-medium">
                Set as Active Session immediately
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Saving...' : 'Create Session'}
            </button>
          </form>
        </div>

        {/* Sessions List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">Configured Sessions</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Academic sessions on record</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {sessions.length} Total
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No academic sessions configured yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <div key={s.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{s.session_name}</span>
                      {s.is_active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Session
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {s.start_date || 'N/A'} — {s.end_date || 'N/A'}
                    </div>
                  </div>

                  <div>
                    {!s.is_active && (
                      <button
                        onClick={() => handleToggleActive(s.id, s.is_active)}
                        className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded text-xs font-semibold transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
