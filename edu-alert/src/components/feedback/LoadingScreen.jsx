import { GraduationCap } from 'lucide-react'

export default function LoadingScreen({ message = 'Loading EDU-ALERT...' }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 animate-pulse mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <p className="text-xs text-slate-400 mt-1">Federal Polytechnic Ado-Ekiti • SWD</p>
      </div>
    </div>
  )
}
