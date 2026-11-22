import React from "react";
import { DataRefreshLabel } from "./DataRefreshLabel.tsx";
import { GlobalCountryFilter } from "./GlobalCountryFilter.tsx";
import { HeaderFilterContext } from "./HeaderFilterContext.tsx";
import { RealtimeClock } from "./RealtimeClock.tsx";
import { SystemStatusPanel } from "./SystemStatusPanel.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

interface HeaderActionsProps {
  onRefresh: () => void;
  /** Key đổi khi SSE báo worker T2 hoàn thành chu kỳ 5 phút (GAP-13). */
  dataRefreshKey?: string | null;
}

/** Cụm widget phía tay phải header — dùng chung mọi giao diện FE. */
export const HeaderActions: React.FC<HeaderActionsProps> = ({ onRefresh, dataRefreshKey }) => (
  <div className="layout__header-actions app-header-actions">
    <HeaderFilterContext />
    <GlobalCountryFilter />
    <DataRefreshLabel onRefresh={onRefresh} dataRefreshKey={dataRefreshKey} />
    <SystemStatusPanel />
    <RealtimeClock />
    <ThemeToggle />
  </div>
);
