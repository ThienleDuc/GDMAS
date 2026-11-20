/**
 * Gom sự kiện thành cụm theo QUỐC GIA → KHU VỰC — thuần, test offline.
 * Nguồn địa danh là `place` (BE không có field country/region riêng).
 */

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
    .sort(
      (left, right) =>
        right.eventCount - left.eventCount ||
        left.country.localeCompare(right.country) ||
        left.region.localeCompare(right.region),
    );
}
