import { RefreshCw } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'

function App() {
  const { isAuthenticated, loading: authLoading, user, logout } = useAuth()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return <Dashboard user={user} logout={logout} />
}

export default App
