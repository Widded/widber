import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from './AdminLayout';
import StaffLayout from './StaffLayout';

const RoleLayout = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminLayout /> : <StaffLayout />;
};

export default RoleLayout;
