/**
 * Hàm thuần cho widget header — không React/DOM/network, chạy offline trong node:test (I7).
 * Nguồn dữ liệu là contract có sẵn: ClustersResponse (GET /api/v1/clusters).
 */

import type { ClustersResponse } from "../../contracts/clusters.ts";
import { groupClustersByCountry } from "../../features/earthquakes/country-clusters.ts";
import { TERMINAL_SPECS } from "../../lib/transforms/settings-data.ts";

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
