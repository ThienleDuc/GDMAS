import React from "react";
import type { SSEEventPayload } from "../../contracts/sse.ts";
import { catalogFromSse } from "./header-data.ts";
import { GlobalCountryFilter } from "./GlobalCountryFilter.tsx";
import { GlobalRegionFilter } from "./GlobalRegionFilter.tsx";
import { HeaderFilterContext } from "./HeaderFilterContext.tsx";
import { RealtimeClock } from "./RealtimeClock.tsx";
import { RefreshToastHost } from "./RefreshToastHost.tsx";
import { SystemStatusPanel } from "./SystemStatusPanel.tsx";

interface HeaderActionsProps {
  /** Giữ chữ ký cũ cho caller (I2) — countdown ở aside nay nhận trực tiếp từ shell. */
  onRefresh: () => void;
  /** Key đổi khi SSE báo worker T2 hoàn thành chu kỳ 5 phút (GAP-13). */
  dataRefreshKey?: string | null;
  /** Payload SSE shell — BE chỉ đính `catalog` khi dữ liệu đổi (2026-11-24). */
  sseData?: SSEEventPayload | null;
}

/** Cụm widget phía tay phải header — dùng chung mọi giao diện FE. */
export const HeaderActions: React.FC<HeaderActionsProps> = ({ dataRefreshKey, sseData }) => {
  const catalog = catalogFromSse(sseData);
  return (
  <div className="layout__header-actions app-header-actions">
    <HeaderFilterContext />
    <GlobalCountryFilter catalog={catalog ?? undefined} />
    <GlobalRegionFilter catalog={catalog ?? undefined} />
    <SystemStatusPanel />
    <RealtimeClock />
    <RefreshToastHost dataRefreshKey={dataRefreshKey} />
  </div>
  );
};
