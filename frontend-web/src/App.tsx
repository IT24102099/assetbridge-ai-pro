import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { useAuth } from './context/AuthContext';
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { ManagerDashboardPage } from './pages/manager/ManagerDashboardPage';
import { AssetListPage } from './pages/assets/AssetListPage';
import { AssetDetailPage } from './pages/assets/AssetDetailPage';
import { IncidentListPage } from './pages/incidents/IncidentListPage';
import { IncidentDetailPage } from './pages/incidents/IncidentDetailPage';
import { AiAssistantPage } from './pages/ai/AiAssistantPage';
import { OwnerReportsPage } from './pages/reports/OwnerReportsPage';
import { RepresentativeListPage } from './pages/representatives/RepresentativeListPage';
import { RepresentativeDetailPage } from './pages/representatives/RepresentativeDetailPage';
import { ProviderListPage } from './pages/providers/ProviderListPage';
import { ProviderDetailPage } from './pages/providers/ProviderDetailPage';
import { ProviderSearchPage } from './pages/providers/ProviderSearchPage';
import { ProviderAvailabilityPage } from './pages/providers/ProviderAvailabilityPage';
import { AssignmentsPage } from './pages/manager/AssignmentsPage';
import { VerificationsPage } from './pages/manager/VerificationsPage';
import MaintenanceDashboardPage from './pages/maintenance/MaintenanceDashboardPage';
import InspectionListPage from './pages/inspections/InspectionListPage';
import InspectionDetailPage from './pages/inspections/InspectionDetailPage';
import QuotationListPage from './pages/quotations/QuotationListPage';
import QuotationDetailPage from './pages/quotations/QuotationDetailPage';
import CompareQuotationsPage from './pages/quotations/CompareQuotationsPage';
import MaintenanceJobListPage from './pages/maintenance/MaintenanceJobListPage';
import MaintenanceJobDetailPage from './pages/maintenance/MaintenanceJobDetailPage';
import MaterialCatalogPage from './pages/maintenance/MaterialCatalogPage';
import MaintenanceReportsPage from './pages/maintenance/MaintenanceReportsPage';
import WorkflowDashboardPage from './pages/workflows/WorkflowDashboardPage';
import WorkflowDetailPage from './pages/workflows/WorkflowDetailPage';
import AiProposalReviewPage from './pages/workflows/AiProposalReviewPage';
import AgentActivityPage from './pages/workflows/AgentActivityPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import FollowUpContinuityPage from './pages/continuity/FollowUpContinuityPage';

import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'Manager' || user?.role === 'Admin') {
    return <ManagerDashboardPage />;
  }
  return <OwnerDashboardPage />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes using Wireframe AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/manager" element={<ManagerDashboardPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Member 1: Asset & Incident Management Routes */}
          <Route path="/assets" element={<AssetListPage />} />
          <Route path="/assets/:id" element={<AssetDetailPage />} />
          <Route path="/incidents" element={<IncidentListPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/reports" element={<OwnerReportsPage />} />

          {/* Member 2: Representative & Service Provider Management Routes */}
          <Route path="/representatives" element={<RepresentativeListPage />} />
          <Route path="/representatives/:id" element={<RepresentativeDetailPage />} />
          <Route path="/providers" element={<ProviderListPage />} />
          <Route path="/providers/:id" element={<ProviderDetailPage />} />
          <Route path="/providers/search" element={<ProviderSearchPage />} />
          <Route path="/provider-search" element={<ProviderSearchPage />} />
          <Route path="/provider-availability" element={<ProviderAvailabilityPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/verifications" element={<VerificationsPage />} />

          {/* Member 3: Maintenance, Inspection & Quotations Routes */}
          <Route path="/maintenance" element={<MaintenanceDashboardPage />} />
          <Route path="/inspections" element={<InspectionListPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />
          <Route path="/quotations" element={<QuotationListPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/quotations/compare" element={<CompareQuotationsPage />} />
          <Route path="/maintenance/jobs" element={<MaintenanceJobListPage />} />
          <Route path="/maintenance/jobs/:id" element={<MaintenanceJobDetailPage />} />
          <Route path="/maintenance/catalog" element={<MaterialCatalogPage />} />
          <Route path="/maintenance/reports" element={<MaintenanceReportsPage />} />

          {/* Member 4: Workflow, Approval, Audit & Continuity Routes */}
          <Route path="/workflows" element={<WorkflowDashboardPage />} />
          <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
          <Route path="/workflows/:id/proposal" element={<AiProposalReviewPage />} />
          <Route path="/workflows/agents" element={<AgentActivityPage />} />
          <Route path="/approvals" element={<Navigate to="/workflows" replace />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/follow-up" element={<FollowUpContinuityPage />} />
          <Route path="/continuity" element={<FollowUpContinuityPage />} />
          <Route path="/settings" element={<DashboardOverviewPage />} />
          <Route path="/profile" element={<DashboardOverviewPage />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
