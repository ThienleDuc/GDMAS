import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { APP_ROUTES } from "./routes";

/**
 * Trang tạm thay thế các feature page cũ trong giai đoạn tái cấu trúc FE.
 * Styling dùng design system khai báo trong styles/globals.css kết hợp với
 * utility của Tailwind v4 (được import qua styles/index.css).
 */
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <section className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
    <div className="max-w-md space-y-3">
      <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        Giao diện đang được tái cấu trúc. Nội dung mới sẽ được xây dựng trên nền
        design system <code className="font-mono text-cyan-400">globals.css</code>.
      </p>
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
          <Route path={APP_ROUTES.MONITORING} element={<PlaceholderPage title="Bản đồ Giám sát" />} />
          <Route path={APP_ROUTES.EARTHQUAKES} element={<PlaceholderPage title="Danh mục Động đất" />} />
          <Route path={APP_ROUTES.STATISTICS} element={<PlaceholderPage title="6 Patterns Phân tích" />} />
          <Route path={APP_ROUTES.REPORTS} element={<PlaceholderPage title="Báo cáo & Xuất bản" />} />
          <Route path={APP_ROUTES.SETTINGS} element={<PlaceholderPage title="Cấu hình Hệ thống" />} />
        </Route>

        {/* Điều hướng mặc định nếu route không tồn tại */}
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
};
