import { useEffect, useRef, useState } from "react";
import type { SSEEventPayload } from "../contracts";
import { useSSE } from "./useSSE";

export interface DatabaseResetInfo {
  /** Tăng mỗi lần nhận `database_cleared` (Demo Bước 2/3). */
  resetVersion: number;
  /**
   * Tăng khi CSDL bị xoá **hoặc** khi worker chạy lại phục hồi (Demo Bước 6).
   * Dùng làm dependency của `useEffect` để nạp lại dữ liệu.
   */
  refreshVersion: number;
  /** `true` từ sau `database_cleared` tới khi có sự kiện phục hồi đầu tiên. */
  isCleared: boolean;
  lastResetAt: Date | null;
  lastRestoreAt: Date | null;
}

/**
 * Phản ứng với luồng SSE đã có sẵn ở trang (trang đã tự gọi `useSSE`).
 * Không mở thêm kết nối, không giữ mock: UI phải tự chuyển Empty State khi `isCleared`.
 */
export function useDatabaseResetFromEvent(sseData: SSEEventPayload | null): DatabaseResetInfo {
  const [resetVersion, setResetVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [lastResetAt, setLastResetAt] = useState<Date | null>(null);
  const [lastRestoreAt, setLastRestoreAt] = useState<Date | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const wasClearedRef = useRef(false);

  useEffect(() => {
    if (!sseData) return;
    const key = `${sseData.event}:${sseData.timestamp ?? ""}:${sseData.id ?? ""}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    if (sseData.event === "database_cleared") {
      wasClearedRef.current = true;
      setResetVersion((v) => v + 1);
      setRefreshVersion((v) => v + 1);
      setIsCleared(true);
      setLastResetAt(new Date());
      return;
    }

    // Worker chạy lại thành công sau khi CSDL bị xoá → phục hồi (Demo Bước 6).
    if (
      sseData.event === "ingestion_cycle_completed" ||
      sseData.event === "earthquake_detected" ||
      sseData.event === "earthquake_alert"
    ) {
      if (!wasClearedRef.current) return;
      wasClearedRef.current = false;
      setIsCleared(false);
      setLastRestoreAt(new Date());
      setRefreshVersion((v) => v + 1);
    }
  }, [sseData]);

  return { resetVersion, refreshVersion, isCleared, lastResetAt, lastRestoreAt };
}

/**
 * Dùng cho trang **không** tự mở SSE (Reports, Settings, Monitoring Map):
 * tự mở kết nối mặc định rồi chuyển sang `useDatabaseResetFromEvent`.
 */
export function useDatabaseReset(): DatabaseResetInfo {
  const { data } = useSSE();
  return useDatabaseResetFromEvent(data);
}
