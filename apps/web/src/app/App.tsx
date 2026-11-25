import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";

// Mỗi page được tải riêng khi route được kích hoạt — giảm bundle ban đầu & tải API.
const OverviewPage = React.lazy(() =>
  import("../features/overview/OverviewPage.tsx").then((module) => ({ default: module.OverviewPage })),
);
const MonitoringMapPage = React.lazy(() =>
  import("../features/monitoring/MonitoringMapPage.tsx").then((module) => ({
    default: module.MonitoringMapPage,
  })),
);
const EarthquakesPage = React.lazy(() =>
  import("../features/earthquakes/EarthquakesPage.tsx").then((module) => ({
    default: module.EarthquakesPage,
  })),
);
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
          <Route
            path={APP_ROUTES.HOME}
            element={
              <React.Suspense fallback={<PlaceholderPage title="Tổng quan" />}>
                <OverviewPage />
              </React.Suspense>
            }
          />
          <Route
            path={APP_ROUTES.MONITORING}
            element={
              <React.Suspense fallback={<PlaceholderPage title="Bản đồ giám sát" />}>
                <MonitoringMapPage />
              </React.Suspense>
            }
          />
          <Route
            path={APP_ROUTES.EARTHQUAKES}
            element={
              <React.Suspense fallback={<PlaceholderPage title="Danh mục động đất" />}>
                <EarthquakesPage />
              </React.Suspense>
            }
          />
          <Route
            path={`${APP_ROUTES.STATISTICS}/*`}
            element={
              <React.Suspense fallback={<PlaceholderPage title="6 nhóm phân tích" />}>
                <StatisticsRoutes />
              </React.Suspense>
            }
          />
        </Route>

        {/* Điều hướng mặc định nếu route không tồn tại */}
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
