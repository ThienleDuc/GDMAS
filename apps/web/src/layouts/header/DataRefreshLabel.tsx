import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { countdownLabel, nextCountdownTick, REFRESH_CYCLE_SECONDS } from "./header-data.ts";
import { RefreshToast } from "./RefreshToast.tsx";

interface DataRefreshLabelProps {
  onRefresh: () => void;
}

/**
 * Đồng hồ đếm ngược chu kỳ cập nhật 5 phút — chạy độc lập, không phụ thuộc trạng thái SSE
 * nên không bị nhấp nháy. Khi về 0: mở lại SSE để lấy sự kiện mới + hiện toast 5 giây.
 */
export const DataRefreshLabel: React.FC<DataRefreshLabelProps> = ({ onRefresh }) => {
  const [remaining, setRemaining] = useState(REFRESH_CYCLE_SECONDS);
  const [toastOpen, setToastOpen] = useState(false);
  const lastRemaining = useRef(remaining);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => nextCountdownTick(current)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastRemaining.current !== remaining && remaining === REFRESH_CYCLE_SECONDS) {
      onRefresh();
      setToastOpen(true);
    }
    lastRemaining.current = remaining;
  }, [remaining, onRefresh]);

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
