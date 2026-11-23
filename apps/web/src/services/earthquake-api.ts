import { ApiError, fetchApi } from "../lib/api-client.ts";
import { clustersFromPatterns } from "../lib/transforms/cluster-fallback.ts";
import { isUtcTimestamp, isWgs84Bounds } from "../contracts/common.ts";
import { geoQuery, type GeoFilter } from "../contracts/geo-filter.ts";
import type { MonthlyPeaksResponse } from "../contracts/monthly-peaks.ts";
import type {
  ClassificationsResponse,
  ClustersResponse,
  CorrelationResponse,
  EarthquakeItem,
  EarthquakeListResponse,
  HealthResponse,
  OptionalApiResult,
  PatternsResponse,
  PredictionsResponse,
  QueryEarthquakeParams,
  SeasonalityResponse,
  StatisticsResponse,
  SyncResponse,
  SystemStatusResponse,
  TemporalResponse,
  TrendResponse,
} from "../contracts/index.ts";

/**
 * Các kiểu dữ liệu API giờ nằm trong `src/contracts/` (tách theo schema).
 * Re-export để mọi import cũ dạng `from "../services/earthquake-api"` vẫn hoạt động (RULE-03).
 */
export type {
  EarthquakeItem,
  EarthquakeListResponse,
  HourlyTimeSeriesPoint,
  StatisticsResponse,
  SyncResponse,
  PatternItem,
  LegacyClusterItem,
  ClusteringSummary,
  PatternsResponse,
  QueryEarthquakeParams,
} from "../contracts/index.ts";

function assertQueryWindow(startTime?: string, endTime?: string): void {
  if (startTime !== undefined && !isUtcTimestamp(startTime)) {
    throw new TypeError("start_time phải là timestamp ISO 8601 UTC có hậu tố Z.");
  }
  if (endTime !== undefined && !isUtcTimestamp(endTime)) {
    throw new TypeError("end_time phải là timestamp ISO 8601 UTC có hậu tố Z.");
  }
  if (startTime && endTime && Date.parse(startTime) > Date.parse(endTime)) {
    throw new TypeError("start_time không được lớn hơn end_time.");
  }
}

function assertBbox(params: QueryEarthquakeParams): void {
  const bounds = {
    min_lat: params.min_lat,
    max_lat: params.max_lat,
    min_lon: params.min_lon,
    max_lon: params.max_lon,
  };
  if (!isWgs84Bounds(bounds)) {
    throw new TypeError("Bounding box phải nằm trong phạm vi WGS84 và min không được lớn hơn max.");
  }
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Lấy danh sách sự kiện địa chấn với bộ lọc và phân trang.
 * Hỗ trợ khoảng thời gian UTC (`start_time`/`end_time`) và bounding box WGS84.
 */
export async function getEarthquakes(
  params: QueryEarthquakeParams = {},
  signal?: AbortSignal,
): Promise<EarthquakeListResponse> {
  assertQueryWindow(params.start_time, params.end_time);
  assertBbox(params);
  const qs = buildQuery({
    page: params.page,
    limit: params.limit,
    min_magnitude: params.min_magnitude,
    max_magnitude: params.max_magnitude,
    min_depth: params.min_depth,
    max_depth: params.max_depth,
    search: params.search?.trim(),
    country: params.country,
    region: params.region,
    sort_by: params.sort_by,
    order: params.order,
    start_time: params.start_time,
    end_time: params.end_time,
    min_lat: params.min_lat,
    max_lat: params.max_lat,
    min_lon: params.min_lon,
    max_lon: params.max_lon,
  });

  const response = await fetchApi<EarthquakeListResponse>(`/api/v1/earthquakes${qs}`, { signal });
  // Audit B1: BE trả 200 + {success:false, data:null, message} khi DB rỗng → chuẩn hoá thành [].
  if (!response || !Array.isArray(response.data)) {
    return {
      success: false,
      data: [],
      metadata: { total: 0, page: params.page ?? 1, limit: params.limit ?? 20, total_pages: 0 },
    };
  }
  return response;
}

/**
 * Lấy thông tin chi tiết một sự kiện địa chấn
 */
export async function getEarthquakeDetail(
  eventId: string | number,
  signal?: AbortSignal,
): Promise<EarthquakeItem> {
  return fetchApi<EarthquakeItem>(`/api/v1/earthquakes/${eventId}`, { signal });
}

/**
 * Lấy dữ liệu thống kê KPI và chuỗi thời gian tổng quan
 */
export async function getEarthquakeStatistics(
  signal?: AbortSignal,
  filter?: GeoFilter | null,
  window?: { start_time?: string; end_time?: string } | null,
): Promise<StatisticsResponse> {
  const qs = buildQuery({ ...geoQuery(filter), ...window });
  return fetchApi<StatisticsResponse>(`/api/v1/statistics/earthquakes${qs}`, { signal });
}

/** Số sự kiện theo tháng (UTC) — biểu đồ cao điểm theo tháng. */
export async function getMonthlyPeaks(
  filter?: GeoFilter | null,
  signal?: AbortSignal,
): Promise<MonthlyPeaksResponse> {
  const qs = buildQuery(geoQuery(filter));
  return fetchApi<MonthlyPeaksResponse>(`/api/v1/statistics/monthly-peaks${qs}`, { signal });
}

/**
 * Kích hoạt đồng bộ hóa dữ liệu trực tiếp từ USGS Feed
 */
export async function syncUsgsData(signal?: AbortSignal): Promise<SyncResponse> {
  return fetchApi<SyncResponse>("/api/v1/earthquakes/sync", {
    method: "POST",
    signal,
  });
}

/**
 * Lấy danh sách và kết quả 6 Patterns phân tích chuỗi thời gian từ CSDL
 */
export async function getPatterns(signal?: AbortSignal): Promise<PatternsResponse> {
  return fetchApi<PatternsResponse>("/api/v1/patterns", { signal });
}

/**
 * Gọi một endpoint "có thể chưa tồn tại" trên Backend.
 *
 * - 200 → `{ data, unavailable: false }`
 * - 404 → `{ data: null, unavailable: true }` (UI hiển thị "BE chưa triển khai endpoint",
 *   **không** thay bằng mock — quy tắc §3.8 contracts/README.md)
 * - lỗi khác (0/500/…) → ném `ApiError` để trang hiển thị Error State.
 */
export async function getOptionalApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<OptionalApiResult<T>> {
  try {
    const data = await fetchApi<T>(path, init);
    return { data, unavailable: false, status: 200 };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { data: null, unavailable: true, status: 404, message: error.message };
    }
    throw error;
  }
}

/** GET /api/v1/health — Database API + kết nối PostgreSQL (T6 + T1). */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return fetchApi<HealthResponse>("/api/v1/health", { signal });
}

/** GET /api/v1/health nhưng chịu được 404 (endpoint chưa triển khai). */
export async function getHealthOptional(
  signal?: AbortSignal,
): Promise<OptionalApiResult<HealthResponse>> {
  return getOptionalApi<HealthResponse>("/api/v1/health", { signal });
}

/** GET /api/v1/system/status — trạng thái 7 Terminals + `last_run`. */
export async function getSystemStatus(
  signal?: AbortSignal,
): Promise<SystemStatusResponse> {
  return fetchApi<SystemStatusResponse>("/api/v1/system/status", { signal });
}

/** GET /api/v1/system/status nhưng chịu được 404. */
export async function getSystemStatusOptional(
  signal?: AbortSignal,
): Promise<OptionalApiResult<SystemStatusResponse>> {
  return getOptionalApi<SystemStatusResponse>("/api/v1/system/status", { signal });
}

/** Pattern 1 — `GET /api/v1/analysis/temporal`. */
export async function getTemporalAnalysis(
  params: {
    interval?: "day" | "week" | "month";
    start_time?: string;
    end_time?: string;
    country?: string;
    region?: string;
  } = {},
  signal?: AbortSignal,
): Promise<TemporalResponse> {
  const qs = buildQuery({
    interval: params.interval,
    start_time: params.start_time,
    end_time: params.end_time,
    ...geoQuery(params),
  });
  return fetchApi<TemporalResponse>(`/api/v1/analysis/temporal${qs}`, { signal });
}

/**
 * Pattern 2 — `GET /api/v1/analysis/trend`.
 * API.md §3.3: `resample_freq`/`metric` là tham số chuẩn; từ 2026-11-23 BE có thêm
 * cửa sổ `start_time`/`end_time` (tính on-the-fly) để lọc Ngày/Tuần/Tháng trên Overview.
 */
export async function getTrendAnalysis(
  params: {
    resample_freq?: "D" | "W" | "M";
    metric?: "count" | "avg_magnitude" | "max_magnitude";
    /** Cửa sổ thời gian UTC — BE tính on-the-fly khi có (2026-11-23). */
    start_time?: string;
    end_time?: string;
    country?: string;
    region?: string;
  } = {},
  signal?: AbortSignal,
): Promise<TrendResponse> {
  const qs = buildQuery({
    resample_freq: params.resample_freq,
    metric: params.metric,
    start_time: params.start_time,
    end_time: params.end_time,
    ...geoQuery(params),
  });
  return fetchApi<TrendResponse>(`/api/v1/analysis/trend${qs}`, { signal });
}

/**
 * Pattern 3 — `GET /api/v1/analysis/seasonality`.
 * API.md §3.3: BE nhận cửa sổ start_time/end_time cho đường có filter (2026-11-24).
 */
export async function getSeasonalityAnalysis(
  params: {
    /** @deprecated BE /analysis/seasonality không nhận resample_freq — xem API.md §3.3. */
    resample_freq?: "D" | "W" | "M";
    /** @deprecated BE /analysis/seasonality không nhận start_time — xem API.md §3.3. */
    start_time?: string;
    /** @deprecated BE /analysis/seasonality không nhận end_time — xem API.md §3.3. */
    end_time?: string;
    country?: string;
    region?: string;
    /** Ép chu kỳ: week (7 ngày) hoặc month (12 tháng). */
    interval?: "week" | "month";
  } = {},
  signal?: AbortSignal,
): Promise<SeasonalityResponse> {
  const qs = buildQuery({
    ...geoQuery(params),
    start_time: params.start_time,
    end_time: params.end_time,
    interval: params.interval,
  });
  return fetchApi<SeasonalityResponse>(`/api/v1/analysis/seasonality${qs}`, { signal });
}

/**
 * Pattern 4 — `GET /api/v1/analysis/correlation`.
 * API.md §3.3: BE không nhận query param nào; giữ params cũ để tương thích (RULE-03).
 */
export async function getCorrelationAnalysis(
  params: {
    /** @deprecated BE /analysis/correlation không nhận start_time — xem API.md §3.3. */
    start_time?: string;
    /** @deprecated BE /analysis/correlation không nhận end_time — xem API.md §3.3. */
    end_time?: string;
    country?: string;
    region?: string;
  } = {},
  signal?: AbortSignal,
): Promise<CorrelationResponse> {
  const qs = buildQuery(geoQuery(params));
  return fetchApi<CorrelationResponse>(`/api/v1/analysis/correlation${qs}`, { signal });
}

/** Pattern 5 — `GET /api/v1/predictions`. */
export async function getPredictions(
  signal?: AbortSignal,
  filter?: GeoFilter | null,
): Promise<PredictionsResponse> {
  const qs = buildQuery(geoQuery(filter));
  return fetchApi<PredictionsResponse>(`/api/v1/predictions${qs}`, { signal });
}

/** Pattern 6 — `GET /api/v1/classifications`. */
export async function getClassifications(
  signal?: AbortSignal,
  filter?: GeoFilter | null,
): Promise<ClassificationsResponse> {
  const qs = buildQuery(geoQuery(filter));
  return fetchApi<ClassificationsResponse>(`/api/v1/classifications${qs}`, { signal });
}

/** Kết quả DBSCAN mới nhất — `GET /api/v1/clusters` (có thể lọc quốc gia/khu vực). */
export async function getClusters(
  signal?: AbortSignal,
  filter?: GeoFilter | null,
): Promise<ClustersResponse> {
  const qs = buildQuery(geoQuery(filter));
  return fetchApi<ClustersResponse>(`/api/v1/clusters${qs}`, { signal });
}

/**
 * Lấy cụm DBSCAN theo hướng "chịu được 404" (RD-15):
 * 1. Ưu tiên `/api/v1/clusters`; 200 → trả nguyên kết quả (đường nhanh, không gọi thêm API).
 * 2. Chỉ khi 404 HTTP thì fallback sang `clustering_summary` của `/api/v1/patterns`
 *    (dữ liệu thật đang có — contracts/README.md §3.8.3), map alias legacy → canonical.
 * 3. `/patterns` 404/500/rỗng → giữ nguyên `unavailable: true` của `/clusters`;
 *    không ném lỗi mới để không đổi Error State của consumer.
 *
 * Bất biến: `!unavailable ⇒ data !== null && status === 200`.
 * Không fallback khi `/clusters` trả 200 + empty envelope — đó là Empty State hợp lệ.
 */
export async function getClustersOptional(
  signal?: AbortSignal,
  filter?: GeoFilter | null,
): Promise<OptionalApiResult<ClustersResponse>> {
  const qs = buildQuery(geoQuery(filter));
  const primary = await getOptionalApi<ClustersResponse>(`/api/v1/clusters${qs}`, { signal });
  if (!primary.unavailable) return primary;

  try {
    const patterns = await getPatterns(signal);
    const converted = clustersFromPatterns(patterns);
    if (converted) {
      return {
        data: converted,
        unavailable: false,
        status: 200,
        message: "Nguồn: GET /api/v1/patterns → clustering_summary",
      };
    }
  } catch {
    // Lỗi từ nguồn dự phòng không được đè lên lỗi 404 đã được xử lý của nguồn chính.
  }
  return primary;
}
