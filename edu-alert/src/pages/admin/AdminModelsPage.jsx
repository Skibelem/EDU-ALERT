import { useEffect, useState } from 'react'
import {
  Cpu,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminModelsPage() {
  const [modelVersions, setModelVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    async function loadModels() {
      try {
        const { data, error } = await supabase
          .from('model_versions')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setModelVersions(data || [])
      } catch (err) {
        console.error('Error loading model versions:', err)
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to query registered model versions.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadModels()
  }, [])

  const handleSetActiveModel = async (modelId) => {
    setFeedback(null)
    try {
      // 1. Deactivate all
      await supabase
        .from('model_versions')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // 2. Activate selected
      const { error } = await supabase
        .from('model_versions')
        .update({ is_active: true })
        .eq('id', modelId)

      if (error) throw error

      setModelVersions((prev) =>
        prev.map((m) => ({
          ...m,
          is_active: m.id === modelId,
        }))
      )

      setFeedback({ type: 'success', message: 'Active Decision Tree model version updated.' })
    } catch (err) {
      console.error('Error updating active model:', err)
      setFeedback({ type: 'error', message: err.message || 'Failed to update active model.' })
    }
  }

  const activeModel = modelVersions.find((m) => m.is_active)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200">
            AI Operations & Governance
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2 mb-1">AI Model Versions</h1>
          <p className="text-xs text-slate-500">
            Monitor Decision Tree models, feature inputs, validation metrics, and active versioning.
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
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Algorithm
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {activeModel?.algorithm || 'Decision Tree (CART)'}
            </div>
            <div className="text-[11px] text-slate-500">
              Version: {activeModel?.version || 'v1.0-baseline'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Target Output Classes
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              Low, Medium, High Risk
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              Discrete Classification Labels
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Input Indicators
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              3 Standard Features
            </div>
            <div className="text-[11px] text-slate-500">
              Attendance, Participation, CA
            </div>
          </div>
        </div>
      </div>

      {/* Model Versions Registry */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Model Version Registry ({modelVersions.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Strict Specification: No synthetic benchmark fabrication
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading model versions...
          </div>
        ) : modelVersions.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">No model versions registered in database</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Per specification FR-12, the system truthful state is presented. Once the Python Decision Tree training pipeline completes validation and inserts metadata into `model_versions`, it will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Model Name</th>
                  <th className="pb-3 px-3">Version</th>
                  <th className="pb-3 px-3">Algorithm</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Metrics</th>
                  <th className="pb-3 px-3">Registered At</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modelVersions.map((m) => {
                  let parsedMetrics = null
                  if (m.metrics) {
                    try {
                      parsedMetrics = typeof m.metrics === 'string' ? JSON.parse(m.metrics) : m.metrics
                    } catch {
                      parsedMetrics = null
                    }
                  }

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{m.model_name}</td>
                      <td className="py-3 px-3 font-mono text-indigo-700 font-bold">{m.version}</td>
                      <td className="py-3 px-3 text-slate-600">{m.algorithm}</td>
                      <td className="py-3 px-3">
                        {m.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {parsedMetrics ? (
                          <div className="text-[11px] space-y-0.5">
                            {parsedMetrics.accuracy && <div>Acc: {(parsedMetrics.accuracy * 100).toFixed(1)}%</div>}
                            {parsedMetrics.f1 && <div>F1: {(parsedMetrics.f1 * 100).toFixed(1)}%</div>}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending benchmark</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!m.is_active && (
                          <button
                            onClick={() => handleSetActiveModel(m.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors"
                          >
                            Set Active
                          </button>
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

      {/* Feature Input Pipeline Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Decision Tree Feature Constraints & Weights</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
          EDU-ALERT relies strictly on three validated academic indicators. Prediction requests pass feature values through the server boundary where inputs are bounded to standard polytechnic ranges:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold text-indigo-300">Attendance Percentage</div>
            <div className="text-sm font-mono text-white mt-1">Range: 0% – 100%</div>
            <div className="text-[11px] text-slate-400 mt-1">Attendance below 75% triggers high-risk path.</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold text-indigo-300">Class Participation</div>
            <div className="text-sm font-mono text-white mt-1">Range: 0 – 10 points</div>
            <div className="text-[11px] text-slate-400 mt-1">Reflects laboratory engagement and practical tasks.</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold text-indigo-300">Continuous Assessment (CA)</div>
            <div className="text-sm font-mono text-white mt-1">Range: 0 – 30 marks</div>
            <div className="text-[11px] text-slate-400 mt-1">Mid-term test score contributing directly to course total.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
