import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getFirstBookingDate } from './lib/bookingDates';
import { BookingProvider } from './context/BookingContext';
import Home from './pages/client/Home';
import BookingWizard from './pages/client/BookingWizard';
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
import NotFound from './pages/NotFound';
import { AuthProvider, useAuth } from './context/AuthContext';

const Reports = lazy(() => import('./pages/admin/Reports'));
const OwnerDashboard = lazy(() => import('./pages/admin/OwnerDashboard'));
const StaffDashboard = lazy(() => import('./pages/admin/StaffDashboard'));

const PageLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div
      className="h-7 w-7 animate-spin rounded-full border-2 border-[#2563EB]/25 border-t-[#2563EB]"
      role="status"
      aria-label="Yükleniyor"
    />
  </div>
);

const AdminIndexRedirect = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin/dashboard' : '/admin/staff'} replace />;
};

const AppointmentsIndexRedirect = () => {
  const firstDate = getFirstBookingDate();

  return (
    <Navigate to={`/admin/appointments/${format(firstDate, 'yyyy-MM-dd')}`} replace />
  );
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
              <Route index element={<AdminIndexRedirect />} />

              {/* Ayrı tam ekran dashboard'lar (menüsüz) */}
              <Route element={<StaffOnlyRoute />}>
                <Route
                  path="staff"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <StaffDashboard />
                    </Suspense>
                  }
                />
              </Route>
              <Route element={<OwnerOnlyRoute />}>
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <OwnerDashboard />
                    </Suspense>
                  }
                />
              </Route>

              {/* Menülü yönetim sayfaları */}
              <Route element={<RoleLayout />}>
                <Route
                  path="reports"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <Reports />
                    </Suspense>
                  }
                />
                <Route path="appointments" element={<AppointmentsIndexRedirect />} />
                <Route path="appointments/:date" element={<AppointmentsDayView />} />
                <Route path="availability" element={<AvailabilityManagement />} />
                <Route path="calendar" element={<CalendarView />} />

                <Route element={<OwnerOnlyRoute />}>
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
