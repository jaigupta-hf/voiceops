import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import { AlertCircle } from 'lucide-react'

const Login = () => {
  const { login } = useAuth()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)

    const result = await login(credentialResponse.credential)

    if (!result.success) {
      setError(result.error || 'Login failed. Please try again.')
    }
    
    setLoading(false)
  }

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VoiceOps Dashboard</h1>
          <p className="text-gray-600">Sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {loading ? (
            <div className="py-3 px-6 bg-gray-100 rounded-full text-gray-600">
              Signing in...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
