import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import Home from './pages/client/Home';
import BookingWizard from './pages/client/BookingWizard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AppointmentsList from './pages/admin/AppointmentsList';
import AppointmentsDayView from './pages/admin/AppointmentsDayView';
import CalendarView from './pages/admin/CalendarView';
import ServicesManagement from './pages/admin/ServicesManagement';
import BarbersManagement from './pages/admin/BarbersManagement';
import AvailabilityManagement from './pages/admin/AvailabilityManagement';
import Login from './pages/admin/Login';
import Layout from './components/layout/Layout';
import RoleLayout from './components/layout/RoleLayout';
import OwnerOnlyRoute from './components/layout/OwnerOnlyRoute';
import StaffOnlyRoute from './components/layout/StaffOnlyRoute';
import ProtectedRoute from './components/layout/ProtectedRoute';
import StaffDashboard from './pages/staff/StaffDashboard';
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './context/AuthContext';

const AdminIndexRedirect = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/admin/staff'} replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <BookingProvider>
          <Routes>
            {/* Client Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="booking" element={<BookingWizard />} />
            </Route>

            {/* Admin / Staff Login */}
            {/* /admin/login       -> Personel girişi */}
            {/* /admin/login/staff -> Yönetici girişi */}
            <Route path="/admin/login" element={<Login mode="staff" />} />
            <Route path="/admin/login/staff" element={<Login mode="admin" />} />

            {/* Protected Admin / Staff Area */}
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<RoleLayout />}>
                <Route index element={<AdminIndexRedirect />} />

                <Route element={<StaffOnlyRoute />}>
                  <Route path="staff" element={<StaffDashboard />} />
                </Route>

                <Route path="appointments" element={<AppointmentsList />} />
                <Route path="appointments/:date" element={<AppointmentsDayView />} />
                <Route path="availability" element={<AvailabilityManagement />} />
                <Route path="calendar" element={<CalendarView />} />

                <Route element={<OwnerOnlyRoute />}>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="services" element={<ServicesManagement />} />
                  <Route path="barbers" element={<BarbersManagement />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BookingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
