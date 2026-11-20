/**
 * Hợp đồng thực thể động đất & các response của nhóm Earthquakes.
 * Nguồn: contracts/schemas/earthquake.json, docs/api/API.md §3.2.
 * Quy ước I3: WGS84 (`latitude`, `longitude`), timestamp UTC ISO 8601 `Z`.
 * Alias legacy (`time`, `depth`, `status`) giữ optional theo RULE-03 — test/mới dùng canonical.
 */

export interface EarthquakeContract {
  id: string | number;
  time?: string;
  depth?: number;
  latitude: number;
  longitude: number;
  magnitude: number;
  place: string;
  status?: "reviewed" | "automatic" | string;
  source?: string;
  source_event_id?: string;
  event_time?: string;
  depth_km?: number;
  magnitude_type?: string;
  source_url?: string;
  ingested_at?: string;
}

/** Bản ghi canonical trả về bởi `GET /api/v1/earthquakes`. */
export interface EarthquakeItem {
  id: number;
  source: string;
  source_event_id: string;
  event_time: string;
  latitude: number;
  longitude: number;
  depth_km: number;
  magnitude: number;
  magnitude_type?: string;
  place?: string;
  source_url?: string;
  ingested_at?: string;
}

export interface EarthquakeListResponse {
  success: boolean;
  data: EarthquakeItem[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    last_updated?: string;
  };
}

export interface HourlyTimeSeriesPoint {
  time: string;
  count: number;
  avg_mag: number;
}

export interface StatisticsResponse {
  success: boolean;
  data: {
    total_events: number;
    strong_events_count: number;
    moderate_events_count: number;
    minor_events_count?: number;
    recent_24h_count: number;
    avg_magnitude: number;
    max_magnitude: number;
    latest_event_time?: string;
    time_series_preview?: HourlyTimeSeriesPoint[];
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  synced_count: number;
  source: string;
  timestamp: string;
}

/** Tham số `GET /api/v1/earthquakes` — thời gian UTC, bbox WGS84 (docs/api/API.md §3.2). */
export interface QueryEarthquakeParams {
  page?: number;
  limit?: number;
  min_magnitude?: number;
  max_magnitude?: number;
  min_depth?: number;
  max_depth?: number;
  search?: string;
  sort_by?: "event_time" | "magnitude" | "depth_km";
  order?: "asc" | "desc";
  start_time?: string;
  end_time?: string;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
}
