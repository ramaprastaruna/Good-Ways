import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Home from './pages/Home'
import { ToastProvider } from './components/ToastContainer'
import { ConfirmProvider } from './components/ConfirmDialog'

interface User {
  id: string
  username: string
  role: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is logged in (from sessionStorage)
  useEffect(() => {
    const savedUser = sessionStorage.getItem('goodways_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (err) {
        sessionStorage.removeItem('goodways_user')
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: User) => {
    setUser(userData)
    sessionStorage.setItem('goodways_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    sessionStorage.removeItem('goodways_user')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        {user ? <Home user={user} onLogout={handleLogout} /> : <Login onLogin={handleLogin} />}
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
