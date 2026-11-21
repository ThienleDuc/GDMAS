import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatClockTime,
  getStoredTimezone,
  setStoredTimezone,
  type TimezoneMode,
} from "../../utils/timezone.ts";

/** Đồng hồ realtime dùng chung mọi trang; chế độ lưu ở localStorage. */
export const RealtimeClock: React.FC = () => {
  const [mode, setMode] = useState<TimezoneMode>(() => getStoredTimezone());
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const toggleMode = () => {
    const next: TimezoneMode = mode === "UTC" ? "UTC+7" : "UTC";
    setMode(next);
    setStoredTimezone(next);
  };

  return (
    <div className="layout__header-widget header-clock">
      <Clock className="layout__header-icon h-4 w-4" aria-hidden="true" />
      <time className="header-clock-time" dateTime={now.toISOString()}>
        {formatClockTime(now, mode)}
      </time>
      <button
        type="button"
        className="header-clock-toggle"
        onClick={toggleMode}
        aria-label={`Đổi múi giờ sang ${mode === "UTC" ? "UTC+7" : "UTC"}`}
      >
        {mode}
      </button>
    </div>
  );
};
