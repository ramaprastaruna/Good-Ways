import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onLogin: (user: { id: string; username: string; role: string }) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pinString = pin.join('')

    if (pinString.length !== 6) {
      setError('Masukkan 6 digit PIN')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pinString)
        .single()

      if (supabaseError || !data) {
        setError('PIN salah')
        setPin(['', '', '', '', '', ''])
        document.getElementById('pin-0')?.focus()
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onLogin({
          id: data.id,
          username: data.username,
          role: data.role
        })
      }, 1000)

    } catch (err) {
      setError('Terjadi kesalahan')
      setPin(['', '', '', '', '', ''])
      document.getElementById('pin-0')?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Light gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLW9wYWNpdHk9IjAuMDIiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-100/40 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="Good Ways"
              className="h-32 mx-auto"
            />
          </div>

          {/* Frosted glass container */}
          <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-xl shadow-black/10 p-8">

            {/* Instruction text */}
            <div className="text-center mb-6">
              <h2 className="text-base font-semibold text-black mb-1">Masukkan PIN Anda</h2>
              <p className="text-xs text-gray-500">Gunakan 6 digit PIN untuk masuk</p>
            </div>

            {/* PIN Input Form */}
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

              {/* PIN Boxes */}
              <div className="flex justify-center gap-2">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${index}`}
                    name={`pin-digit-${index}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading || success}
                    autoFocus={index === 0}
                    autoComplete="off"
                    data-form-type="other"
                    className="w-10 h-11 text-center text-base font-bold text-black bg-white/70 backdrop-blur-xl border-2 border-black/10 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 disabled:opacity-50 hover:border-black/20"
                    style={{
                      caretColor: 'transparent'
                    }}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="backdrop-blur-xl bg-red-50/80 border border-red-200 rounded-xl p-3 animate-shake">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="backdrop-blur-xl bg-green-50/80 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs font-medium">Login berhasil!</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || pin.join('').length !== 6 || success}
                className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memverifikasi...
                  </span>
                ) : success ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Berhasil
                  </span>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
