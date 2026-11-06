import { fetchApi } from "../lib/api-client";

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
}

/**
 * Lấy danh sách sự kiện địa chấn với bộ lọc và phân trang
 */
export async function getEarthquakes(params: QueryEarthquakeParams = {}): Promise<EarthquakeListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.min_magnitude !== undefined) query.set("min_magnitude", params.min_magnitude.toString());
  if (params.max_magnitude !== undefined) query.set("max_magnitude", params.max_magnitude.toString());
  if (params.min_depth !== undefined) query.set("min_depth", params.min_depth.toString());
  if (params.max_depth !== undefined) query.set("max_depth", params.max_depth.toString());
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.sort_by) query.set("sort_by", params.sort_by);
  if (params.order) query.set("order", params.order);

  const endpoint = `/api/v1/earthquakes${query.toString() ? `?${query.toString()}` : ""}`;
  return fetchApi<EarthquakeListResponse>(endpoint);
}

/**
 * Lấy thông tin chi tiết một sự kiện địa chấn
 */
export async function getEarthquakeDetail(eventId: string | number): Promise<EarthquakeItem> {
  return fetchApi<EarthquakeItem>(`/api/v1/earthquakes/${eventId}`);
}

/**
 * Lấy dữ liệu thống kê KPI và chuỗi thời gian tổng quan
 */
export async function getEarthquakeStatistics(): Promise<StatisticsResponse> {
  return fetchApi<StatisticsResponse>("/api/v1/statistics/earthquakes");
}

/**
 * Kích hoạt đồng bộ hóa dữ liệu trực tiếp từ USGS Feed
 */
export async function syncUsgsData(): Promise<SyncResponse> {
  return fetchApi<SyncResponse>("/api/v1/earthquakes/sync", {
    method: "POST",
  });
}

