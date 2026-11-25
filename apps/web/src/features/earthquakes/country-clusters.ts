/**
 * Pure helpers to aggregate DBSCAN clusters by country for the catalog page.
 * No React/DOM/network. Unknown locations fall back to "Khác" — never invent data.
 */

import type { ClusterSummary } from "../../contracts/clusters.ts";
import type { CountryClusterSummary } from "../../contracts/country-clusters.ts";

/** Mã quốc gia ngắn ở cuối địa danh USGS — đồng bộ với BE geo.py. */
const COUNTRY_CODES: Readonly<Record<string, string>> = { MX: "Mexico" };

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

/** Tên bang Mỹ đầy đủ — "..., Tennessee" cũng là USA (Revision 2026-11-22). */
const US_STATE_NAMES = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota",
  "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york",
  "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington",
  "west virginia", "wisconsin", "wyoming", "district of columbia",
]);

/** Mã bang Mỹ thường xuất hiện ở cuối địa danh USGS (Revision 2026-11-21). */
const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WA", "WV", "WI", "WY", "DC",
]);

/** Resolve a human-readable country/region label from a place or dominant_place string. */
export function countryFromPlace(place: string | null | undefined): string {
  if (!place?.trim()) return "Khác";

  // Ưu tiên đoạn cuối là mã bang Mỹ ("12 km NE of San Francisco, CA" → USA).
  const segments = place.split(",").map((part) => part.trim()).filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && COUNTRY_CODES[last.toUpperCase()]) return COUNTRY_CODES[last.toUpperCase()];
  if (last && (US_STATE_CODES.has(last.toUpperCase()) || US_STATE_NAMES.has(last.toLowerCase()))) return "USA";

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
