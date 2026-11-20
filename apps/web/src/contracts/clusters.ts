/**
 * Hợp đồng `GET /api/v1/clusters` (DBSCAN) + alias legacy từ `clustering_summary`.
 * Nguồn: contracts/schemas/clusters.json, docs/api/API.md §3.4, contracts/README.md §3.4.
 * Trường canonical: `cluster_id`, `center_latitude`, `center_longitude` (WGS84).
 */

export interface ClusterSummary {
  cluster_id: number;
  center_latitude: number;
  center_longitude: number;
  event_count: number;
  avg_magnitude: number | null;
  max_magnitude: number | null;
  radius_km?: number | null;
  name?: string | null;
  dominant_place?: string | null;
}

export interface ClusterParameters {
  eps_km?: number;
  eps_degrees?: number;
  min_samples?: number;
  metric?: string;
}

export interface ClustersResponse {
  success: boolean;
  data: {
    algorithm?: string;
    parameters?: ClusterParameters;
    clusters_count?: number;
    noise_count?: number;
    calculated_at?: string;
    clusters: ClusterSummary[];
    noise_points?: Array<{
      event_id?: number;
      latitude: number;
      longitude: number;
    }>;
  };
  message?: string;
  last_updated?: string;
}

/** Payload legacy do T4/demo_seeder sinh — adapter nằm ở `src/lib/transforms/map-data.ts`. */
export interface LegacyClusterItem {
  id: number;
  name?: string | null;
  lat: number;
  lon: number;
  events_count: number;
  avg_mag?: number | null;
}

export interface ClusteringSummary {
  clusters?: LegacyClusterItem[];
  [key: string]: unknown;
}
