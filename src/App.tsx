import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import Students from './pages/Students'
import Teachers from './pages/Teachers'
import Schedule from './pages/Schedule'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import WeeklyReport from './pages/WeeklyReport'
import Invitations from './pages/Invitations'
import Charts from './pages/Charts'
import StudentProfile from './pages/StudentProfile'
import Notes from './pages/Notes'
import Logs from './pages/Logs'
import Settings from './pages/Settings'
import PendingApproval from './pages/PendingApproval'
import PublicAttendance from './pages/PublicAttendance'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profile, profileLoading } = useAuth()

  // Show loading only if we're still initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    )
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If profile is still loading, show loading
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Загрузка профиля...</div>
      </div>
    )
  }

  // If no profile or not approved, show pending approval
  if (!profile || profile.status !== 'approved') {
    return <PendingApproval />
  }

  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/public/attendance" element={<PublicAttendance />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Students />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute>
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute>
            <Teachers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schedule"
        element={
          <ProtectedRoute>
            <Schedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weekly-report"
        element={
          <ProtectedRoute>
            <WeeklyReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invitations"
        element={
          <ProtectedRoute>
            <Invitations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/charts"
        element={
          <ProtectedRoute>
            <Charts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/logs"
        element={
          <ProtectedRoute>
            <Logs />
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
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App

