import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, JSX } from 'react'

export function Login(): JSX.Element {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-600 text-3xl">PDF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">PDF Test Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to manage your PDF tests</p>
        </div>
        <div className="mt-8">
          <button
            onClick={async () => {
              try {
                await login()
              } catch (e: unknown) {
                alert('Login error: ' + (e instanceof Error ? e.message : String(e)))
              }
            }}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">Secure • Firebase Authentication</p>
      </div>
    </div>
  )
}
