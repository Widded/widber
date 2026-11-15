import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardShell from '../dashboard/DashboardShell';
import { ownerNavItems, staffNavItems } from '../dashboard/navItems';

const RoleLayout = () => {
  const { isAdmin } = useAuth();

  return (
    <DashboardShell
      items={isAdmin ? ownerNavItems : staffNavItems}
      homePath={isAdmin ? '/admin/dashboard' : '/admin/staff'}
    >
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-16 md:px-6 lg:px-8 lg:pt-8">
        <Outlet />
      </div>
    </DashboardShell>
  );
};

export default RoleLayout;
