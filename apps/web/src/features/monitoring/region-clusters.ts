/**
 * Gom sự kiện thành cụm theo QUỐC GIA → KHU VỰC — thuần, test offline.
 * Nguồn địa danh là `place` (BE không có field country/region riêng).
 */

import type { ClusterSummary } from "../../contracts/clusters.ts";
import { countryFromPlace } from "../earthquakes/country-clusters.ts";
import { regionFromPlace } from "../earthquakes/region-filter.ts";

export interface RegionClusterRow {
  country: string;
  region: string;
  eventCount: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
}

type PlaceLike = { place?: string | null; magnitude: number };

/** Gom theo cặp (quốc gia, khu vực); magnitude không hợp lệ → null, không bịa số. */
export function buildRegionClusters(items: readonly PlaceLike[]): RegionClusterRow[] {
  const groups = new Map<string, RegionClusterRow & { magnitudeSum: number; weighted: number }>();

  for (const item of items) {
    const country = countryFromPlace(item.place);
    const region = regionFromPlace(item.place, country);
    const key = `${country}\u0000${region}`;
    const group = groups.get(key) ?? {
      country,
      region,
      eventCount: 0,
      avgMagnitude: null,
      maxMagnitude: null,
      magnitudeSum: 0,
      weighted: 0,
    };

    group.eventCount += 1;
    if (Number.isFinite(item.magnitude)) {
      group.magnitudeSum += item.magnitude;
      group.weighted += 1;
      group.maxMagnitude = Math.max(group.maxMagnitude ?? item.magnitude, item.magnitude);
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ magnitudeSum, weighted, ...row }) => ({
      ...row,
      avgMagnitude: weighted > 0 ? Number((magnitudeSum / weighted).toFixed(2)) : null,
    }))
    .sort(sortRegionRows);
}

/**
 * Gom cụm thật từ `/api/v1/clusters` (GAP-05) — mỗi cụm đã có `event_count`,
 * `avg_magnitude`, `max_magnitude`, `dominant_place` (GAP-01). Không mở rộng
 * thành từng sự kiện giả; dùng số đếm thật, magnitude thiếu → `null`.
 */
export function buildRegionClusterRows(
  clusters: readonly ClusterSummary[],
): RegionClusterRow[] {
  const groups = new Map<string, RegionClusterRow & { magnitudeSum: number; weighted: number }>();

  for (const cluster of clusters) {
    const place = cluster.dominant_place || cluster.name || null;
    const country = countryFromPlace(place);
    const region = regionFromPlace(place, country);
    const key = `${country}\u0000${region}`;
    const group = groups.get(key) ?? {
      country,
      region,
      eventCount: 0,
      avgMagnitude: null,
      maxMagnitude: null,
      magnitudeSum: 0,
      weighted: 0,
    };

    const count = Number.isFinite(cluster.event_count)
      ? Math.max(0, Math.trunc(cluster.event_count))
      : 0;
    group.eventCount += count;
    if (
      count > 0 &&
      typeof cluster.avg_magnitude === "number" &&
      Number.isFinite(cluster.avg_magnitude)
    ) {
      group.magnitudeSum += cluster.avg_magnitude * count;
      group.weighted += count;
    }
    if (
      typeof cluster.max_magnitude === "number" &&
      Number.isFinite(cluster.max_magnitude)
    ) {
      group.maxMagnitude = Math.max(group.maxMagnitude ?? cluster.max_magnitude, cluster.max_magnitude);
    }
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ magnitudeSum, weighted, ...row }) => ({
      ...row,
      avgMagnitude: weighted > 0 ? Number((magnitudeSum / weighted).toFixed(2)) : null,
    }))
    .sort(sortRegionRows);
}

function sortRegionRows(left: RegionClusterRow, right: RegionClusterRow): number {
  return (
    right.eventCount - left.eventCount ||
    left.country.localeCompare(right.country) ||
    left.region.localeCompare(right.region)
  );
}
