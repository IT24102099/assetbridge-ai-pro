import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Layout Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardOverviewPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Future vertical placeholders ready for feature modules */}
          <Route path="/assets" element={<DashboardOverviewPage />} />
          <Route path="/incidents" element={<DashboardOverviewPage />} />
          <Route path="/providers" element={<DashboardOverviewPage />} />
          <Route path="/maintenance" element={<DashboardOverviewPage />} />
          <Route path="/quotations" element={<DashboardOverviewPage />} />
          <Route path="/workflows" element={<DashboardOverviewPage />} />
          <Route path="/continuity" element={<DashboardOverviewPage />} />
          <Route path="/audit" element={<DashboardOverviewPage />} />
        </Route>
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
