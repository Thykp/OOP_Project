import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import PatientDashboard from './pages/PatientDashboard'
import ViewAppointment from './pages/ViewAppointment'
import { ProtectedRoute, RoleProtectedRoute } from './context/auth-context'
import BookAppointment from "./pages/BookAppointment";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={
          <RoleProtectedRoute role={["ROLE_ADMIN"]}>
            <SignUpPage />
          </RoleProtectedRoute>} />
        <Route path="/viewappointment" element={
          <RoleProtectedRoute role={["ROLE_STAFF"]}>
            <ViewAppointment />
          </RoleProtectedRoute>
        } />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookappointment"
          element={
            <ProtectedRoute>
              <BookAppointment />
            </ProtectedRoute>
          }>
        </Route>
      </Routes>
    </>
  )
}

export default App
