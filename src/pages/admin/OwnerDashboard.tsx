import React from 'react';
import DashboardShell from '../../components/dashboard/DashboardShell';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import { ownerNavItems } from '../../components/dashboard/navItems';

const OwnerDashboard = () => (
  <DashboardShell items={ownerNavItems} homePath="/admin/dashboard">
    <DashboardOverview />
  </DashboardShell>
);

export default OwnerDashboard;
