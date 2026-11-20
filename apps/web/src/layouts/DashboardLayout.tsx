import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Globe,
  Map,
  FileText,
  Settings,
  Radio,
  Menu,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useSSE } from "../hooks/useSSE";

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
  const [currentTimeUtc, setCurrentTimeUtc] = useState("");
  const location = useLocation();

  // Giữ kết nối SSE để hiển thị trạng thái stream; phần UI còn lại đang tái cấu trúc.
  const { status: sseStatus } = useSSE("/api/v1/stream/earthquakes");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUtc(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
                <span className="layout__brand-caption">
                  Disaster Monitoring
                </span>
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
                    isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-300"
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
        <div className="layout__sidebar-footer">
          {sidebarOpen ? (
            <div className="layout__service-status">
              <div className="layout__service-status-line">
                <span className="layout__service-dot" />
                <span>7 Terminals Sẵn Sàng</span>
              </div>
              <p className="layout__service-status-caption">FastAPI, PostgreSQL & 4 Workers</p>
            </div>
          ) : (
            <div className="layout__service-status-line" title="7 Terminals Sẵn Sàng">
              <span className="layout__service-dot" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="layout__main app-main">
        {/* Top Header */}
        <header className="layout__header app-header">
          <div className="layout__breadcrumb">
            <span className="layout__breadcrumb-current">GDMAS Console</span>
            <ChevronRight className="h-4 w-4" />
            <span className="layout__breadcrumb-current">
              {location.pathname === "/" ? "Tổng quan" : location.pathname.replace("/", "")}
            </span>
          </div>

          <div className="layout__header-actions">
            <span className="text-xs text-slate-400">{sseStatus}</span>
            <div className="layout__clock hidden sm:flex">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>{currentTimeUtc || "UTC SYNC"}</span>
            </div>
            <div className="layout__database-state">
              <span className="layout__service-dot"></span>
              <span>PostgreSQL Connected</span>
            </div>
          </div>
        </header>

        {/* Nested Content rendered via Outlet */}
        <main className="layout__content app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

