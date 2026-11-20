/**
 * FE-only view model for earthquake clusters grouped by country/region.
 * Derived from ClustersResponse (GET /api/v1/clusters) — no backend schema change.
 */

export interface CountryClusterSummary {
  country: string;
  eventCount: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
  clusterIds: number[];
}
