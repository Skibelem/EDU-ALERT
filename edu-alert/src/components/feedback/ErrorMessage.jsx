import { AlertCircle } from 'lucide-react'

export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null

  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 flex items-start gap-3 my-2">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-red-900">Notice</p>
        <p className="mt-0.5 leading-relaxed">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-semibold text-red-700 hover:text-red-900 underline"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
