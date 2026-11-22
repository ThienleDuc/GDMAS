/**
 * Adapter thuần cho fallback cụm (RD-15): khi `GET /api/v1/clusters` trả 404, dùng
 * `clustering_summary` của `GET /api/v1/patterns` (dữ liệu thật đang có) rồi map
 * alias legacy → `ClusterSummary` canonical.
 *
 * Nguồn: contracts/README.md §3.4 (bảng alias) + §3.8.3 (quy tắc fallback),
 * docs/task/fe-be-integration-ready.md RD-15.
 *
 * Không mock, không nội suy số, không đổi chữ ký `normalizeClusters()` (I2/I3/I5).
 * Hàm thuần — chạy được trong node:test offline.
 */

import type {
  ClusterSummary,
  ClustersResponse,
  PatternsResponse,
} from "../../contracts/index.ts";

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Chuyển payload `/api/v1/patterns` sang `ClustersResponse` canonical.
 * Trả `null` khi payload rỗng, empty-state hoặc không có cụm hợp lệ — service
 * khi đó giữ nguyên cờ `unavailable`, tuyệt đối không tạo cụm giả.
 */
export function clustersFromPatterns(
  payload: PatternsResponse | null | undefined,
): ClustersResponse | null {
  if (!payload || payload.success !== true) return null;
  const summary = payload.clustering_summary;
  if (!summary || !Array.isArray(summary.clusters)) return null;

  const clusters: ClusterSummary[] = [];
  for (const raw of summary.clusters) {
    if (typeof raw !== "object" || raw === null) continue;

    const clusterId = toFiniteNumber(raw.id);
    const latitude = toFiniteNumber(raw.lat);
    const longitude = toFiniteNumber(raw.lon);
    const eventCount = toFiniteNumber(raw.events_count);
    if (clusterId === null || latitude === null || longitude === null || eventCount === null) {
      continue;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue;
    }

    clusters.push({
      cluster_id: Math.trunc(clusterId),
      center_latitude: latitude,
      center_longitude: longitude,
      event_count: Math.trunc(eventCount),
      avg_magnitude: toFiniteNumber(raw.avg_mag),
      max_magnitude: null,
      radius_km: null,
      name: toStringOrNull(raw.name),
    });
  }

  if (clusters.length === 0) return null;
  return { success: true, data: { clusters } };
}
