import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const OwnerOnlyRoute = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/admin/staff" replace />;
  }

  return <Outlet />;
};

export default OwnerOnlyRoute;
