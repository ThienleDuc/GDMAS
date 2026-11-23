/**
 * Nguồn sự thật duy nhất về chế độ múi giờ (UTC / UTC+7) cho toàn FE (T7).
 * Đặt tại shell (DashboardLayout) nên mọi page toggle ở header là đổi ngay, không reload.
 * Helper thuần vẫn nằm ở `utils/timezone.ts` — context chỉ giữ state + persist.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  getStoredTimezone,
  setStoredTimezone,
  type TimezoneMode,
} from "../utils/timezone.ts";

export interface TimezoneContextValue {
  timezone: TimezoneMode;
  setTimezone: (mode: TimezoneMode) => void;
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezoneState] = useState<TimezoneMode>(() => getStoredTimezone());

  const setTimezone = useCallback((mode: TimezoneMode) => {
    setStoredTimezone(mode); // giữ nguyên hành vi lưu localStorage cũ
    setTimezoneState(mode);
  }, []);

  const value = useMemo(() => ({ timezone, setTimezone }), [timezone, setTimezone]);

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

/** Dùng ở mọi nơi hiển thị thời gian; ném lỗi rõ nếu render ngoài provider. */
export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext);
  if (!context) throw new Error("useTimezone phải được dùng trong <TimezoneProvider>");
  return context;
}
