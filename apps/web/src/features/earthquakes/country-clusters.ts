/**
 * Pure helpers to aggregate DBSCAN clusters by country for the catalog page.
 * No React/DOM/network. Unknown locations fall back to "Khác" — never invent data.
 */

import type { ClusterSummary } from "../../contracts/clusters.ts";
import type { CountryClusterSummary } from "../../contracts/country-clusters.ts";

const COUNTRY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/california|alaska|hawaii|united states|\busa\b/i, "USA"],
  [/japan|honshu|hokkaido/i, "Japan"],
  [/indonesia|sumatra|java|sunda/i, "Indonesia"],
  [/tonga/i, "Tonga"],
  [/chile/i, "Chile"],
  [/philippines/i, "Philippines"],
  [/new zealand/i, "New Zealand"],
  [/papua/i, "Papua New Guinea"],
  [/vanuatu/i, "Vanuatu"],
  [/fiji/i, "Fiji"],
  [/mexico/i, "Mexico"],
  [/turkey|türkiye/i, "Turkey"],
  [/iceland/i, "Iceland"],
  [/greece/i, "Greece"],
  [/china|taiwan/i, "China"],
];

/** Resolve a human-readable country/region label from a place or dominant_place string. */
export function countryFromPlace(place: string | null | undefined): string {
  if (!place?.trim()) return "Khác";
  for (const [pattern, country] of COUNTRY_PATTERNS) {
    if (pattern.test(place)) return country;
  }
  const parts = place.split(",");
  const lastSegment = parts[parts.length - 1]?.trim();
  return lastSegment || "Khác";
}

interface Aggregate {
  eventCount: number;
  magnitudeSum: number;
  magnitudeWeight: number;
  maxMagnitude: number | null;
  clusterIds: number[];
}

/** Group clusters by resolved country, sorted by event count desc. */
export function groupClustersByCountry(clusters: readonly ClusterSummary[]): CountryClusterSummary[] {
  const groups = new Map<string, Aggregate>();
  for (const cluster of clusters) {
    const country = countryFromPlace(cluster.dominant_place || cluster.name);
    const current = groups.get(country) ?? {
      eventCount: 0,
      magnitudeSum: 0,
      magnitudeWeight: 0,
      maxMagnitude: null,
      clusterIds: [],
    };
    current.eventCount += cluster.event_count;
    current.clusterIds.push(cluster.cluster_id);
    if (cluster.avg_magnitude !== null) {
      current.magnitudeSum += cluster.avg_magnitude * cluster.event_count;
      current.magnitudeWeight += cluster.event_count;
    }
    if (cluster.max_magnitude !== null) {
      current.maxMagnitude = Math.max(current.maxMagnitude ?? cluster.max_magnitude, cluster.max_magnitude);
    }
    groups.set(country, current);
  }

  return [...groups.entries()]
    .map(([country, value]) => ({
      country,
      eventCount: value.eventCount,
      avgMagnitude: value.magnitudeWeight > 0 ? value.magnitudeSum / value.magnitudeWeight : null,
      maxMagnitude: value.maxMagnitude,
      clusterIds: value.clusterIds,
    }))
    .sort((left, right) => right.eventCount - left.eventCount);
}
