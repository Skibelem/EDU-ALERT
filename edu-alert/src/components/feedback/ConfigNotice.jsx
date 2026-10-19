import { AlertTriangle, KeyRound } from 'lucide-react'

export default function ConfigNotice() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-amber-500/30 rounded-xl p-6 shadow-2xl text-slate-100">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Configuration Required</h2>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          EDU-ALERT cannot connect to Supabase because the required environment variables are missing or incomplete.
        </p>

        <div className="bg-slate-950/80 rounded-lg p-4 font-mono text-xs text-amber-300 border border-slate-700 space-y-2 mb-6">
          <div className="flex items-center gap-2 text-slate-400">
            <KeyRound className="w-4 h-4" />
            <span>Required in .env:</span>
          </div>
          <div>VITE_SUPABASE_URL=https://your-project.supabase.co</div>
          <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
        </div>

        <p className="text-xs text-slate-400 leading-normal">
          Create or update the <code className="text-amber-300">.env</code> file in the project root with your project credentials, then refresh this page.
        </p>
      </div>
    </div>
  )
}
