import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { PatientLayout } from '../layouts/PatientLayout';
import { DoctorLayout } from '../layouts/DoctorLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { DoctorDirectoryPage } from '../pages/public/DoctorDirectoryPage';
import { DoctorDetailPage } from '../pages/public/DoctorDetailPage';
import { HomeRemediesDirectoryPage } from '../pages/public/HomeRemediesDirectoryPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPatientPage } from '../pages/public/RegisterPatientPage';
import { RegisterDoctorPage } from '../pages/public/RegisterDoctorPage';

// Patient Pages
import { PatientDashboard } from '../pages/patient/PatientDashboard';
import { PatientAppointmentsPage } from '../pages/patient/PatientAppointmentsPage';
import { PatientRecordsPage } from '../pages/patient/PatientRecordsPage';
import { PatientPrescriptionsPage } from '../pages/patient/PatientPrescriptionsPage';
import { AiHealthcareAssistantPage } from '../pages/patient/AiHealthcareAssistantPage';
import { AiVoiceAssistantPage } from '../pages/patient/AiVoiceAssistantPage';
import { AiHomeRemediesPage } from '../pages/patient/AiHomeRemediesPage';
import { PatientProfilePage } from '../pages/patient/PatientProfilePage';

// Doctor Pages
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard';
import { DoctorAppointmentsPage } from '../pages/doctor/DoctorAppointmentsPage';
import { DoctorAvailabilityPage } from '../pages/doctor/DoctorAvailabilityPage';
import { DoctorPatientsPage } from '../pages/doctor/DoctorPatientsPage';
import { DoctorPrescriptionsPage } from '../pages/doctor/DoctorPrescriptionsPage';
import { AiPrescriptionAssistantPage } from '../pages/doctor/AiPrescriptionAssistantPage';
import { DoctorProfilePage } from '../pages/doctor/DoctorProfilePage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminDoctorsPage } from '../pages/admin/AdminDoctorsPage';
import { AdminPatientsPage } from '../pages/admin/AdminPatientsPage';
import { AdminSpecialtiesPage } from '../pages/admin/AdminSpecialtiesPage';
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage';
import { PranAdminAuthPage } from '../pages/admin/PranAdminAuthPage';

// Consultation Room
import { ConsultationRoomPage } from '../pages/consultation/ConsultationRoomPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's assigned portal
    if (user.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/doctors" element={<DoctorDirectoryPage />} />
        <Route path="/doctors/:id" element={<DoctorDetailPage />} />
        <Route path="/remedies" element={<HomeRemediesDirectoryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/patient" element={<RegisterPatientPage />} />
        <Route path="/register/doctor" element={<RegisterDoctorPage />} />
      </Route>

      {/* Dedicated Pran Admin Portal Auth Route */}
      <Route path="/pran_admin" element={<PranAdminAuthPage />} />
      <Route path="/pran_admin/login" element={<Navigate to="/pran_admin" replace />} />

      {/* Patient Portal */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN', 'DOCTOR']}>
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/patient/dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="appointments" element={<PatientAppointmentsPage />} />
        <Route path="records" element={<PatientRecordsPage />} />
        <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
        <Route path="ai-assistant" element={<AiHealthcareAssistantPage />} />
        <Route path="voice-assistant" element={<AiVoiceAssistantPage />} />
        <Route path="home-remedies" element={<AiHomeRemediesPage />} />
        <Route path="profile" element={<PatientProfilePage />} />
      </Route>

      {/* Doctor Portal */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/doctor/dashboard" replace />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="appointments" element={<DoctorAppointmentsPage />} />
        <Route path="availability" element={<DoctorAvailabilityPage />} />
        <Route path="patients" element={<DoctorPatientsPage />} />
        <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
        <Route path="ai-prescription" element={<AiPrescriptionAssistantPage />} />
        <Route path="profile" element={<DoctorProfilePage />} />
      </Route>

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="doctors" element={<AdminDoctorsPage />} />
        <Route path="patients" element={<AdminPatientsPage />} />
        <Route path="specialties" element={<AdminSpecialtiesPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
      </Route>

      {/* Shared Consultation Room */}
      <Route
        path="/consultations/:id"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
              <ConsultationRoomPage />
            </div>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
