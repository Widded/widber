import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import { staffNavItems } from '../../components/dashboard/navItems';

const StaffDashboard = () => (
  <DashboardShell items={staffNavItems} homePath="/admin/staff">
    <DashboardOverview />
  </DashboardShell>
);

export default StaffDashboard;
