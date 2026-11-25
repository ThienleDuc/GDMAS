/**
 * Helper thuần cho nút "Đồng bộ ngay" (RD-14) — không React/DOM/network, test offline.
 * POST /api/v1/earthquakes/sync có tác dụng phụ ghi DB → luôn xác nhận 2 bước (I5).
 * Timestamp UTC ISO 8601 `Z` giữ nguyên từ BE, không đổi múi giờ ở tầng này (I3).
 */

import type { SyncResponse } from "../../contracts/earthquake.ts";
import { ApiError } from "../../lib/api-client.ts";

export type SyncUiState = "idle" | "confirming" | "loading" | "done" | "error";

export type SyncAction =
  | { type: "ask" }
  | { type: "cancel" }
  | { type: "start" }
  | { type: "success" }
  | { type: "failure" }
  | { type: "dismiss" };

/** State machine: chỉ `start` từ `confirming`; `loading` chỉ thoát bằng success/failure. */
export function syncReducer(state: SyncUiState, action: SyncAction): SyncUiState {
  switch (action.type) {
    case "ask":
      return state === "idle" || state === "done" || state === "error" ? "confirming" : state;
    case "cancel":
      return state === "confirming" ? "idle" : state;
    case "start":
      return state === "confirming" ? "loading" : state;
    case "success":
      return state === "loading" ? "done" : state;
    case "failure":
      return state === "loading" ? "error" : state;
    case "dismiss":
      return state === "done" || state === "error" ? "idle" : state;
  }
}

/** Thông báo dùng số trận thật do BE trả — không bịa. */
export function formatSyncMessage(payload: SyncResponse): string {
  return `Đã đồng bộ ${payload.synced_count} sự kiện từ ${payload.source || "USGS"} lúc ${payload.timestamp}.`;
}

/** Map lỗi API sang thông báo tiếng Việt, không nuốt mã lỗi. */
export function syncErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Nguồn USGS tạm thời không phản hồi (503). Vui lòng thử lại.";
    if (error.status === 500) return "Lỗi cơ sở dữ liệu (500). Vui lòng thử lại.";
    if (error.status === 0) return "Không thể kết nối tới API.";
    return error.message || "Không thể đồng bộ dữ liệu.";
  }
  return "Không thể đồng bộ dữ liệu.";
}
