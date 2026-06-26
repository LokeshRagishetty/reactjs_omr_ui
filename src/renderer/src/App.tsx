import { JSX } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { TestDetail } from './pages/TestDetail'

function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  return <>{children}</>
}

function App(): JSX.Element {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <div className="min-h-screen bg-gray-50 text-gray-900">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/test/:id"
                element={
                  <ProtectedRoute>
                    <TestDetail />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
