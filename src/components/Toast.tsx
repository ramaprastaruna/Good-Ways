import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, type, title, message, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const icons = {
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const styles = {
    success: 'bg-green-500/90 text-white border-green-400/50',
    error: 'bg-red-500/90 text-white border-red-400/50',
    warning: 'bg-yellow-500/90 text-white border-yellow-400/50',
    info: 'bg-blue-500/90 text-white border-blue-400/50'
  }

  return (
    <div className="toast-enter">
      <div className={`min-w-64 max-w-sm backdrop-blur-xl ${styles[type]} rounded-xl border shadow-2xl overflow-hidden`}>
        <div className="p-3">
          <div className="flex items-start gap-2">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {icons[type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold mb-0.5">{title}</h3>
              {message && (
                <p className="text-[10px] opacity-90 whitespace-pre-line">{message}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => onClose(id)}
              className="flex-shrink-0 w-5 h-5 rounded-lg hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/20">
          <div
            className="h-full bg-white/40 toast-progress"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  )
}
