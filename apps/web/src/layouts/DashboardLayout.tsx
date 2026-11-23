import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Activity, BarChart3, Globe, Map, Layers, ChevronRight } from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import { SseMarkersProvider } from "../features/monitoring/sse-context.ts";
import { NAV_META, routeLabel, type NavMeta } from "./navigation.ts";
import { HeaderActions } from "./header/HeaderActions.tsx";
import { CompactRefreshCountdown } from "./header/CompactRefreshCountdown.tsx";
import { ThemeToggle } from "./header/ThemeToggle.tsx";
import { dataRefreshKey } from "./header/header-data.ts";
import { APP_ROUTES } from "../app/routes.tsx";
import { TimezoneProvider } from "../contexts/timezone-context.tsx";
import { useCatalogSelection } from "../features/earthquakes/useCatalogSelection.ts";

interface NavItem extends NavMeta {
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ICONS: ReadonlyArray<React.ComponentType<{ className?: string }>> = [
  Layers,
  Map,
  Activity,
  BarChart3,
];

/** NAV_ITEMS giữ nguyên tên để tương thích test/CSS cũ; giờ lấy nhãn từ navigation.ts. */
const NAV_ITEMS: NavItem[] = NAV_META.map((meta, index) => ({
  ...meta,
  icon: NAV_ICONS[index],
}));

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const { withSelection } = useCatalogSelection();

  // Giữ một kết nối SSE duy nhất tại shell; page bản đồ chỉ đọc qua context.
  // RD-17: dùng default chuẩn /api/v1/events/stream từ services/sse-api.ts (giữ 1 kết nối tại shell).
  const sse = useSSE();
  // GAP-13: toast bắn theo event SSE thật (worker T2, 5 phút) — không theo đồng hồ cục bộ.
  const sseRefreshKey = dataRefreshKey(sse.data);

  return (
    // Provider phải bọc CẢ shell (kể cả header chứa RealtimeClock), không chỉ <Outlet>.
    <TimezoneProvider>
    <div className="layout layout--dashboard app-layout">
      {/* Aside dạng rail cố định: luôn sẵn sàng, hover/focus hiện card mô tả. */}
      <aside className="layout__sidebar app-sidebar">
        <div className="layout__brand">
          <div className="layout__brand-main">
            <div className="layout__brand-mark">
              <Globe className="h-6 w-6" />
            </div>
          </div>
        </div>

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
                to={withSelection(item.path)}
                className={`layout__nav-link layout__nav-link--rail group ${isActive ? "active" : ""}`}
                aria-label={item.label}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
                <span className="layout__nav-popover" role="tooltip">
                  <span className="layout__nav-popover-head">
                    <strong className="layout__nav-popover-label">{item.label}</strong>
                    {item.badge && <em className="layout__nav-badge">{item.badge}</em>}
                  </span>
                </span>
              </NavLink>
            );
          })}
        </nav>

        <div className="layout__sidebar-footer">
          <CompactRefreshCountdown onRefresh={sse.reconnect} />
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Container */}
      <div className="layout__main app-main">
        <header className="layout__header app-header">
          <div className="layout__breadcrumb" aria-label="Đường dẫn trang">
            <span className="layout__breadcrumb-current">GDMAS</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="layout__breadcrumb-current">{routeLabel(location.pathname)}</span>
          </div>

          <HeaderActions onRefresh={sse.reconnect} dataRefreshKey={sseRefreshKey} sseData={sse.data} />
        </header>

        <main
          className={`layout__content app-content ${
            location.pathname === APP_ROUTES.MONITORING ? "layout__content--map" : ""
          }`}
        >
          <SseMarkersProvider value={sse}>
            <Outlet />
          </SseMarkersProvider>
        </main>
      </div>
    </div>
    </TimezoneProvider>
  );
};
