import React, { useEffect, useRef, useState } from "react";
import { compactCountdownLabel, nextCountdownTick, REFRESH_CYCLE_SECONDS } from "./header-data.ts";

interface CompactRefreshCountdownProps {
  onRefresh: () => void;
}

/**
 * Đếm ngược chu kỳ 5 phút, rút gọn chỉ còn con số `5:00` — nằm ở footer aside, trên nút theme.
 * Giữ nguyên hành vi mở lại SSE khi về 0 như DataRefreshLabel cũ (RULE-03: tách component mới).
 */
export const CompactRefreshCountdown: React.FC<CompactRefreshCountdownProps> = ({ onRefresh }) => {
  const [remaining, setRemaining] = useState(REFRESH_CYCLE_SECONDS);
  const lastRemaining = useRef(remaining);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => nextCountdownTick(current)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastRemaining.current !== remaining && remaining === REFRESH_CYCLE_SECONDS) onRefresh();
    lastRemaining.current = remaining;
  }, [remaining, onRefresh]);

  return (
    <time
      className="layout__refresh-compact"
      role="timer"
      aria-live="off"
      dateTime={`PT${remaining}S`}
      title="Chu kỳ cập nhật dữ liệu 5 phút"
    >
      {compactCountdownLabel(remaining)}
    </time>
  );
};
