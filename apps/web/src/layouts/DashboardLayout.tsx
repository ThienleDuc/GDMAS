import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Globe,
  Map,
  FileText,
  Settings,
  Menu,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import { SseMarkersProvider } from "../features/monitoring/sse-context.ts";
import { APP_ROUTES } from "../app/routes.tsx";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", path: "/", icon: Layers },
  { label: "Bản đồ Giám sát", path: "/monitoring", icon: Map, badge: "Live" },
  { label: "Danh mục Động đất", path: "/earthquakes", icon: Activity },
  { label: "6 Patterns Phân tích", path: "/statistics", icon: BarChart3 },
  { label: "Báo cáo & Xuất bản", path: "/reports", icon: FileText },
  { label: "Cấu hình Hệ thống", path: "/settings", icon: Settings },
];

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // Revision 2026-11-21: vào Bản đồ giám sát thì tự thu aside, mở rộng không gian.
  // Không tự mở lại ở trang khác — người dùng bấm nút toggle khi cần.
  useEffect(() => {
    if (location.pathname === APP_ROUTES.MONITORING) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Giữ một kết nối SSE duy nhất tại shell; page bản đồ chỉ đọc qua context.
  const sse = useSSE("/api/v1/stream/earthquakes");

  return (
    <div className="layout layout--dashboard app-layout">
      {/* Sidebar */}
      <aside
        className={`layout__sidebar app-sidebar ${sidebarOpen ? "" : "is-collapsed"}`}
      >
        {/* Brand / Logo */}
        <div className="layout__brand">
          <div className="layout__brand-main">
            <div className="layout__brand-mark">
              <Globe className="h-6 w-6" />
            </div>
            {sidebarOpen && (
              <div className="layout__brand-copy">
                <span className="layout__brand-name">GDMAS</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="layout__icon-button"
            title={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="layout__nav sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`layout__nav-link sidebar-nav-item ${isActive ? "active" : ""}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
                {sidebarOpen && (
                  <span className="layout__nav-label">{item.label}</span>
                )}
                {sidebarOpen && item.badge && (
                  <span className="layout__nav-badge">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Service Status */}
        <div className="layout__sidebar-footer" />
      </aside>

      {/* Main Container */}
      <div className="layout__main app-main">
        {/* Top Header */}
        <header className="layout__header app-header">
          <div className="layout__breadcrumb" aria-label="Đường dẫn trang">
            <span className="layout__breadcrumb-current">GDMAS</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="layout__breadcrumb-current">
              {location.pathname === "/" ? "Tổng quan" : location.pathname.replace("/", "")}
            </span>
          </div>

          <div className="layout__header-actions" />
        </header>

        {/* Nested Content rendered via Outlet */}
        <main className="layout__content app-content">
          <SseMarkersProvider value={sse}>
            <Outlet />
          </SseMarkersProvider>
        </main>
      </div>
    </div>
  );
};

