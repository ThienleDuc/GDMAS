import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { FullscreenMapLayout } from "../layouts/FullscreenMapLayout";
import { ReportLayout } from "../layouts/ReportLayout";
import { DashboardOverviewPage } from "../features/dashboard/DashboardOverviewPage";
import { EarthquakesPage } from "../features/earthquakes/EarthquakesPage";
import { StatisticsPage } from "../features/statistics/StatisticsPage";
import { MonitoringMapPage } from "../features/monitoring/MonitoringMapPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { APP_ROUTES } from "./routes";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Nhóm Layout 1: Dashboard Layout (Sidebar + Topbar + Content Outlet) */}
        <Route element={<DashboardLayout />}>
          <Route path={APP_ROUTES.HOME} element={<DashboardOverviewPage />} />
          <Route path={APP_ROUTES.EARTHQUAKES} element={<EarthquakesPage />} />
          <Route path={APP_ROUTES.STATISTICS} element={<StatisticsPage />} />
          <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />
        </Route>

        {/* Nhóm Layout 2: Fullscreen Map Layout (Floating Glassmorphism + Map Viewport Outlet) */}
        <Route element={<FullscreenMapLayout />}>
          <Route path={APP_ROUTES.MONITORING} element={<MonitoringMapPage />} />
        </Route>

        {/* Nhóm Layout 3: Report Layout (Tài liệu in ấn + Xuất bản PDF/Print Outlet) */}
        <Route element={<ReportLayout />}>
          <Route path={APP_ROUTES.REPORTS} element={<ReportsPage />} />
        </Route>

        {/* Điều hướng mặc định nếu route không tồn tại */}
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
