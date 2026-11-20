/**
 * Chia sẻ kết quả của kết nối SSE duy nhất đã được giữ tại `DashboardLayout`
 * cho các trang con (T7.04 bản đồ) — KHÔNG tạo `EventSource` mới (T7.10 / I1).
 */

import { createContext, useContext } from "react";
import type { UseSSEResult } from "../../hooks/useSSE.ts";

const SseMarkersContext = createContext<UseSSEResult | null>(null);

/** Provider đặt tại shell, bọc quanh `<Outlet />`. */
export const SseMarkersProvider = SseMarkersContext.Provider;

/** Trả `null` nếu page dùng ngoài shell (không có kết nối SSE). */
export function useSseMarkers(): UseSSEResult | null {
  return useContext(SseMarkersContext);
}
