import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const StaffOnlyRoute = () => {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

export default StaffOnlyRoute;
