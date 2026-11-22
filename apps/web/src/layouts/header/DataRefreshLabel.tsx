import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { countdownLabel, nextCountdownTick, REFRESH_CYCLE_SECONDS } from "./header-data.ts";
import { RefreshToast } from "./RefreshToast.tsx";

interface DataRefreshLabelProps {
  onRefresh: () => void;
  /** Key đổi khi SSE xác nhận dữ liệu vừa cập nhật (GAP-13) — toast bắn theo key này. */
  dataRefreshKey?: string | null;
}

/**
 * Đồng hồ đếm ngược chu kỳ 5 phút chạy độc lập (không nhấp nháy theo SSE). Khi về 0 chỉ mở lại
 * SSE để nhận sự kiện mới. Toast "Dữ liệu đã được cập nhật" bắn theo SSE thật, không theo đồng hồ.
 */
export const DataRefreshLabel: React.FC<DataRefreshLabelProps> = ({ onRefresh, dataRefreshKey }) => {
  const [remaining, setRemaining] = useState(REFRESH_CYCLE_SECONDS);
  const [toastOpen, setToastOpen] = useState(false);
  const lastRemaining = useRef(remaining);
  const lastRefreshKey = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => nextCountdownTick(current)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastRemaining.current !== remaining && remaining === REFRESH_CYCLE_SECONDS) {
      onRefresh();
    }
    lastRemaining.current = remaining;
  }, [remaining, onRefresh]);

  useEffect(() => {
    if (!dataRefreshKey || dataRefreshKey === lastRefreshKey.current) return;
    lastRefreshKey.current = dataRefreshKey;
    setToastOpen(true);
  }, [dataRefreshKey]);

  const closeToast = useCallback(() => setToastOpen(false), []);

  return (
    <>
      <div
        className="layout__header-widget layout__refresh"
        style={{ "--countdown-progress": `${(remaining / REFRESH_CYCLE_SECONDS) * 100}%` } as React.CSSProperties}
        role="timer"
        aria-live="off"
        title="Chu kỳ cập nhật dữ liệu 5 phút"
      >
        <RefreshCw className="layout__header-icon h-4 w-4" aria-hidden="true" />
        <span className="layout__refresh-text">Cập nhật sau {countdownLabel(remaining)}</span>
      </div>
      <RefreshToast open={toastOpen} onClose={closeToast} />
    </>
  );
};
