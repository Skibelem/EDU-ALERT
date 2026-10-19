import { useEffect, useState } from 'react'
import { HeartHandshake, CheckCircle2, Clock, AlertTriangle, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { supabase } from '../../lib/supabase'

export default function StudentInterventionsPage() {
  const { user } = useAuth()
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [acknowledgingId, setAcknowledgingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadInterventions() {
      if (!user?.id) return
      setLoading(true)
      setError(null)

      try {
        const { data, error: intErr } = await supabase
          .from('interventions')
          .select(`
            id,
            title,
            message,
            status,
            acknowledged_at,
            created_at,
            course_offerings (
              semester,
              courses (
                course_code,
                course_title
              )
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (intErr) throw intErr
        setInterventions(data || [])
      } catch (err) {
        console.error('Error loading interventions:', err)
        setError(err.message || 'Failed to load support interventions.')
      } finally {
        setLoading(false)
      }
    }

    loadInterventions()
  }, [user])

  const handleAcknowledge = async (interventionId) => {
    setAcknowledgingId(interventionId)

    try {
      // Call dedicated RPC if available, fallback to direct update
      const { error: rpcErr } = await supabase.rpc('acknowledge_intervention', {
        p_intervention_id: interventionId,
      })

      if (rpcErr) {
        await supabase
          .from('interventions')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('id', interventionId)
      }

      setInterventions((prev) =>
        prev.map((item) =>
          item.id === interventionId
            ? { ...item, acknowledged_at: new Date().toISOString() }
            : item
        )
      )
    } catch (err) {
      console.error('Error acknowledging intervention:', err)
    } finally {
      setAcknowledgingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Student Support
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
            My Academic Interventions
          </h1>
          <p className="text-xs text-slate-500">
            Advising and mentoring notices initiated by course lecturers and staff counsellors.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading interventions...
        </div>
      ) : interventions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Interventions Assigned</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            You currently have no active or completed support interventions recorded by academic
            staff.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interventions.map((item) => {
            const course = item.course_offerings?.courses
            const isAcknowledged = Boolean(item.acknowledged_at)

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">{item.title}</h3>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {course?.course_code ? `${course.course_code} • ` : 'General • '}
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                      Status: {item.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                  {item.message}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-400">
                    {isAcknowledged ? (
                      <span>
                        Acknowledged on {new Date(item.acknowledged_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">
                        Action required: Acknowledge receipt
                      </span>
                    )}
                  </div>

                  <div>
                    {isAcknowledged ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledged</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(item.id)}
                        disabled={acknowledgingId === item.id}
                        className="inline-flex items-center gap-1.5 text-xs text-white font-semibold bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{acknowledgingId === item.id ? 'Saving...' : 'Acknowledge Receipt'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
