/**
 * Tổng hợp khu vực giám sát từ dữ liệu sự kiện USGS (do BE suy `country`/`region`).
 * Module thuần — không React, không leaflet, không mạng → test offline 100% (I7).
 * Chỉ đọc field có sẵn; khi BE chưa trả thì fallback helper suy từ `place` (I2).
 */

import type { MapEarthquake } from "../../lib/transforms/map-types.ts";
import { countryFromPlace } from "../earthquakes/country-clusters.ts";
import { regionFromPlace } from "../earthquakes/region-filter.ts";
import type { RegionClusterRow } from "./region-clusters.ts";

type EventLike = Pick<MapEarthquake, "magnitude" | "place" | "country" | "region">;

type Accumulator = RegionClusterRow & { magnitudeSum: number; weighted: number };

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Khoá khu vực dùng chung — trim + casefold để gộp biến thể cùng danh xưng. */
export function regionKey(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function rowKey(row: Pick<RegionClusterRow, "country" | "region">): string {
  return `${row.country}\u0000${regionKey(row.region)}`;
}

function sortRows(left: RegionClusterRow, right: RegionClusterRow): number {
  return (
    right.eventCount - left.eventCount ||
    left.country.localeCompare(right.country) ||
    left.region.localeCompare(right.region)
  );
}

function toRows(groups: Map<string, Accumulator>): RegionClusterRow[] {
  return [...groups.values()]
    .map(({ magnitudeSum, weighted, ...row }) => ({
      ...row,
      avgMagnitude: weighted > 0 ? Number((magnitudeSum / weighted).toFixed(2)) : null,
    }))
    .sort(sortRows);
}

/**
 * Gom sự kiện thành dòng (quốc gia, khu vực) với số đếm & magnitude thật.
 * Ưu tiên `country`/`region` từ BE; thiếu thì suy từ `place`; magnitude hỏng → null.
 */
export function buildMonitoringRegionRows(items: readonly EventLike[]): RegionClusterRow[] {
  const groups = new Map<string, Accumulator>();

  for (const item of items) {
    const place = item.place ?? null;
    const country = nonEmpty(item.country) ?? countryFromPlace(place);
    const region = nonEmpty(item.region) ?? regionFromPlace(place, country);
    const key = `${country}\u0000${regionKey(region)}`;
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

  return toRows(groups);
}

/**
 * Gộp nguồn sự kiện (primary) với nguồn cụm cũ (fallback), dedupe theo cặp
 * (quốc gia, khu vực). Dòng có sự kiện thật luôn thắng; giữ dòng fallback
 * khi chưa có sự kiện — không xoá nguồn cũ (RULE-03 / I2).
 */
export function mergeRegionRows(
  primary: readonly RegionClusterRow[],
  fallback: readonly RegionClusterRow[],
): RegionClusterRow[] {
  const merged = new Map<string, RegionClusterRow>();
  for (const row of fallback) merged.set(rowKey(row), row);
  for (const row of primary) {
    const existing = merged.get(rowKey(row));
    if (!existing || row.eventCount > 0) merged.set(rowKey(row), row);
  }
  return [...merged.values()].sort(sortRows);
}
