import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { EarthquakesPage } from "../features/earthquakes/EarthquakesPage";
import { MonitoringMapPage } from "../features/monitoring/MonitoringMapPage";
const StatisticsRoutes = React.lazy(() =>
  import("../features/statistics/StatisticsRoutes").then((module) => ({ default: module.StatisticsRoutes })),
);
import { APP_ROUTES } from "./routes";

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <section className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-border bg-card p-10 text-center text-card-foreground">
    <div className="max-w-md space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">Đang xây dựng…</p>
    </div>
  </section>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout duy nhất: aside điều hướng + vùng chứa nội dung (Outlet) */}
        <Route element={<DashboardLayout />}>
          <Route path={APP_ROUTES.HOME} element={<PlaceholderPage title="Tổng quan" />} />
          <Route path={APP_ROUTES.MONITORING} element={<MonitoringMapPage />} />
          <Route path={APP_ROUTES.EARTHQUAKES} element={<EarthquakesPage />} />
          <Route
            path={`${APP_ROUTES.STATISTICS}/*`}
            element={
              <React.Suspense fallback={<PlaceholderPage title="6 nhóm phân tích" />}>
                <StatisticsRoutes />
              </React.Suspense>
            }
          />
          <Route path={APP_ROUTES.REPORTS} element={<PlaceholderPage title="Báo cáo & Xuất bản" />} />
          <Route path={APP_ROUTES.SETTINGS} element={<PlaceholderPage title="Cấu hình Hệ thống" />} />
        </Route>

        {/* Điều hướng mặc định nếu route không tồn tại */}
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
