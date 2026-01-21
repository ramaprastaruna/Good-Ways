import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: (value: boolean) => void
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return context
}

interface ConfirmProviderProps {
  children: ReactNode
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        ...options,
        isOpen: true,
        resolve
      })
    })
  }, [])

  // Disable body scroll when confirm dialog is open
  useEffect(() => {
    if (confirmState?.isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [confirmState?.isOpen])

  const handleConfirm = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(true)
      setConfirmState(null)
    }
  }, [confirmState])

  const handleCancel = useCallback(() => {
    if (confirmState) {
      confirmState.resolve(false)
      setConfirmState(null)
    }
  }, [confirmState])

  const typeStyles = {
    danger: {
      button: 'bg-red-500 hover:bg-red-600',
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    warning: {
      button: 'bg-yellow-500 hover:bg-yellow-600',
      icon: (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      button: 'bg-blue-500 hover:bg-blue-600',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Confirm Dialog */}
      {confirmState?.isOpen && (
        <div
          className="fixed inset-0 z-[9999] w-full touch-none"
          onClick={handleCancel}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 w-full backdrop-blur-[2px] bg-black/10" />

          {/* Dialog Container */}
          <div className="relative flex items-center justify-center min-h-screen w-full p-4">
            <div
              className="relative w-full max-w-xs backdrop-blur-xl bg-white/50 rounded-2xl border border-white/20 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Icon */}
            <div className="flex justify-center pt-4 pb-3">
              {typeStyles[confirmState.type || 'info'].icon}
            </div>

            {/* Content */}
            <div className="px-4 pb-3 text-center">
              <h3 className="text-sm font-bold text-black mb-1.5">
                {confirmState.title}
              </h3>
              <p className="text-xs text-gray-600 whitespace-pre-line">
                {confirmState.message}
              </p>
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-black/10 flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 h-8 bg-white/40 hover:bg-white/60 border border-white/30 rounded-lg text-[10px] font-semibold text-gray-700 transition-all"
              >
                {confirmState.cancelText || 'Batal'}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 h-8 ${typeStyles[confirmState.type || 'info'].button} text-white rounded-lg text-[10px] font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
              >
                {confirmState.confirmText || 'Ya'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
