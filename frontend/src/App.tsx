import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import PatientDashboard from './pages/PatientDashboard'
import StaffDashboard from './pages/StaffDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminClinicConfig from './pages/AdminClinicConfig'
import AdminUserManagement from './pages/AdminUserManagement'
import { ProtectedRoute, RoleProtectedRoute } from './context/auth-context'
import BookAppointment from "./pages/BookAppointment";
import ClinicOperatingHours from './pages/ClinicOperatingHours'
import DoctorTimeSlotManagement from './pages/DoctorTimeSlotManagement'
import DoctorManagement from './pages/DoctorManagement'

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
            <StaffDashboard />
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
        <Route
          path="/admin/dashboard"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <AdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/user-management"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <AdminUserManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/clinic-config"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <AdminClinicConfig />
            </RoleProtectedRoute>
          }
        />
            <Route
          path="/admin/clinic-operating-hours"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <ClinicOperatingHours />
            </RoleProtectedRoute>
          }
        />            <Route
          path="/admin/doctor-time-slot"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <DoctorTimeSlotManagement />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/doctor-management"
          element={
            <RoleProtectedRoute role={["ROLE_ADMIN"]}>
              <DoctorManagement />
            </RoleProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
