/**
 * Hàm thuần cho widget header — không React/DOM/network, chạy offline trong node:test (I7).
 * Nguồn dữ liệu là contract có sẵn: ClustersResponse (GET /api/v1/clusters).
 */

import type { ClustersResponse } from "../../contracts/clusters.ts";
import type { SSEEventPayload } from "../../contracts/sse.ts";
import type {
  ServiceHealth,
  ServiceKey,
  SystemStatusResponse,
} from "../../contracts/system-status.ts";
import { SERVICE_LABELS } from "../../contracts/system-status.ts";
import { groupClustersByCountry } from "../../features/earthquakes/country-clusters.ts";
import {
  evaluateServiceFreshness,
  formatElapsedMinutes,
  TERMINAL_KEYS,
  TERMINAL_SPECS,
  type FreshnessState,
} from "../../lib/transforms/settings-data.ts";

export interface CountryOption {
  country: string;
  eventCount: number;
  clusterIds: number[];
}

/**
 * Suy danh mục quốc gia theo cụm từ payload API thật.
 * Payload rỗng / 404 / sai hình → [] — không bịa quốc gia (I5).
 */
export function countriesFromClusters(payload: ClustersResponse | null | undefined): CountryOption[] {
  const clusters = payload?.data?.clusters;
  if (!Array.isArray(clusters)) return [];

  return groupClustersByCountry(clusters).map((row) => ({
    country: row.country,
    eventCount: row.eventCount,
    clusterIds: row.clusterIds,
  }));
}

/** Chu kỳ cập nhật lấy từ cấu hình T2 (TERMINAL_SPECS) — không hardcode ở UI. */
const cycleMinutes = Number.parseInt(TERMINAL_SPECS.ingestion.cycle, 10);
export const REFRESH_CYCLE_SECONDS = (Number.isFinite(cycleMinutes) ? cycleMinutes : 5) * 60;

/** Giây tiếp theo: giảm 1, về 0 thì quay lại đầy đủ 5 phút. */
export function nextCountdownTick(remainingSeconds: number): number {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 1) return REFRESH_CYCLE_SECONDS;
  return Math.trunc(remainingSeconds) - 1;
}

/** Thời gian tự đóng của toast báo cập nhật (giây). */
export const TOAST_SECONDS = 5;

/**
 * Key đổi mỗi lần SSE xác nhận worker T2 hoàn thành chu kỳ 5 phút (GAP-13).
 * Toast "Dữ liệu đã được cập nhật" bắn theo key này thay vì đồng hồ cục bộ.
 */
export function dataRefreshKey(event: SSEEventPayload | null | undefined): string | null {
  if (!event || event.event !== "ingestion_cycle_completed") return null;
  return `${event.timestamp ?? ""}:${event.id ?? ""}`;
}

/** Giây tiếp theo của toast; chạm 0 thì dừng (component sẽ ẩn toast). */
export function nextToastTick(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.trunc(seconds) - 1;
}

/** Định dạng mm:ss, luôn nằm trong [00:00, 05:00]. */
export function countdownLabel(remainingSeconds: number): string {
  const total =
    Number.isFinite(remainingSeconds) && remainingSeconds > 0
      ? Math.min(Math.trunc(remainingSeconds), REFRESH_CYCLE_SECONDS)
      : REFRESH_CYCLE_SECONDS;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Một dòng trong panel trạng thái 7 Terminals (RD-16). */
export interface TerminalStatusRow {
  key: ServiceKey;
  terminalId: string;
  name: string;
  status: ServiceHealth;
  freshness: FreshnessState;
  freshnessLabel: string;
  lastRunLabel: string;
}

/**
 * Map payload `/api/v1/system/status` → 7 dòng T1…T7.
 * Service thiếu (kể cả postgres/api/frontend vốn không có `last_run`) → `unknown`,
 * không suy diễn "đang chạy" (I3, docs/architecture.md §9.4).
 */
export function terminalStatusRows(
  payload: SystemStatusResponse | null | undefined,
  now: Date = new Date(),
): TerminalStatusRow[] {
  return TERMINAL_KEYS.map((key) => {
    const service = payload?.data?.services?.[key] ?? null;
    const freshness = evaluateServiceFreshness(service, now);
    return {
      key,
      terminalId: TERMINAL_SPECS[key].terminalId,
      name: SERVICE_LABELS[key],
      status: service?.status ?? "unknown",
      freshness: freshness.state,
      freshnessLabel: freshness.label,
      lastRunLabel: formatElapsedMinutes(freshness.diffMinutes),
    };
  });
}

/** Nhãn tiếng Việt cho trạng thái dịch vụ (không bịa trạng thái lạ). */
export function terminalStatusLabel(status: ServiceHealth): string {
  const labels: Record<ServiceHealth, string> = {
    running: "Đang chạy",
    active: "Hoạt động",
    idle: "Không hoạt động",
    stopped: "Đã dừng",
    error: "Lỗi",
    unknown: "Không xác định",
  };
  return labels[status] ?? labels.unknown;
}

/** Chỉ đếm service `active|running` **và** dữ liệu còn tươi là healthy. */
export function summarizeTerminalRows(
  rows: readonly TerminalStatusRow[],
): { healthy: number; total: number } {
  const healthy = rows.filter(
    (row) =>
      (row.status === "active" || row.status === "running") &&
      row.freshness === "fresh",
  ).length;
  return { healthy, total: rows.length };
}
