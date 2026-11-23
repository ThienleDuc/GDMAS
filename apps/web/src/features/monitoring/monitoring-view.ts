/**
 * Logic thuần cho trang bản đồ giám sát (T7.04) — không React/DOM/leaflet.
 * Mọi đầu ra thời gian là UTC ISO 8601 `Z`, toạ độ là WGS84 (I3).
 * `lib/transforms/map-data.ts` được dùng lại, không tự tính lại bán kính/màu/độ mờ.
 */

import type { EarthquakeItem, QueryEarthquakeParams } from "../../contracts/earthquake.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../earthquakes/region-filter.ts";
import type { SSEEventPayload } from "../../contracts/sse.ts";
import { formatEventTime, toUtcIso, type TimezoneMode } from "../../lib/formatters.ts";
import {
  filterEarthquakes,
  formatCoordinate,
  formatMetric,
  timeRangeBounds,
  toMapEarthquake,
} from "../../lib/transforms/map-data.ts";
import type {
  MapBoundingBox,
  MapEarthquake,
  MapFilters,
  MapViewState,
} from "../../lib/transforms/map-types.ts";

export type MapViewPhase = "loading" | "error" | "empty" | "ready";

/** Giới hạn số sự kiện nạp một lần — BE `limit: le=100` (earthquakes.py:58). */
export const MAP_PAGE_SIZE = 100;

/** Ngưỡng mặc định khi không có cấu hình (khớp BACKFILL_MIN_MAGNITUDE trong config.py). */
export const DEFAULT_MIN_MAGNITUDE = 2.5;

interface MinMagnitudeEnv {
  VITE_MAP_MIN_MAGNITUDE?: string;
  [key: string]: unknown;
}

/**
 * Đọc ngưỡng độ lớn từ env (docker-compose map từ BACKFILL_MIN_MAGNITUDE).
 * Giá trị hỏng/ngoài [0,10] → mặc định 2.5 — không bịa số, không filter UI.
 */
export function resolveMapMinMagnitude(env: MinMagnitudeEnv = {}): number {
  const raw = env.VITE_MAP_MIN_MAGNITUDE;
  const value = typeof raw === "string" && raw.trim() ? Number(raw) : Number.NaN;
  return Number.isFinite(value) && value >= 0 && value <= 10 ? value : DEFAULT_MIN_MAGNITUDE;
}

export interface ViewInput {
  loading: boolean;
  error: unknown;
  events: ReadonlyArray<unknown>;
}

/** Ưu tiên loading → error → empty → ready; error/empty không bị che bởi dữ liệu cũ. */
export function deriveMapState(input: ViewInput): MapViewPhase {
  if (input.loading) return "loading";
  if (input.error !== null && input.error !== undefined) return "error";
  if (input.events.length === 0) return "empty";
  return "ready";
}

/**
 * Ánh xạ filter UI + bbox khung nhìn → `QueryEarthquakeParams` chuẩn API.md §3.2.
 * - `country`/`region` được đẩy xuống BE (endpoint đã hỗ trợ) để lọc đúng toàn bộ dữ liệu,
 *   không chỉ 100 sự kiện đầu trang — đây là nguyên nhân lọc FE trước đây "không chạy".
 * - `realtime: true`: bản đồ giám sát không gửi `start_time`/`end_time` (luôn lấy feed mới nhất).
 * - Giữ hành vi cũ khi không truyền option (I2 — các caller/test cũ không vỡ).
 */
export function buildEarthquakeQuery(
  filters: MapFilters,
  bbox: MapBoundingBox | null,
  options: {
    now?: Date;
    limit?: number;
    country?: string | null;
    region?: string | null;
    realtime?: boolean;
  } = {},
): QueryEarthquakeParams {
  const params: QueryEarthquakeParams = {
    page: 1,
    limit: options.limit ?? MAP_PAGE_SIZE,
    min_magnitude: filters.minMagnitude,
    ...(filters.maxMagnitude !== undefined ? { max_magnitude: filters.maxMagnitude } : {}),
    // Bản đồ realtime: danh sách theo thời gian mới nhất (BE hỗ trợ event_time).
    sort_by: "event_time",
    order: "desc",
  };

  if (options.country && options.country !== ALL_COUNTRIES) params.country = options.country;
  if (options.region && options.region !== ALL_REGIONS && params.country) {
    params.region = options.region;
  }

  if (!options.realtime) {
    const range = timeRangeBounds(filters.timeRange, options.now ?? new Date());
    const start = filters.startTime ?? range.start;
    const end = filters.endTime ?? range.end;
    if (start) params.start_time = toUtcIso(start);
    if (end) params.end_time = toUtcIso(end);
  }

  if (bbox) {
    params.min_lat = bbox.minLat;
    params.max_lat = bbox.maxLat;
    params.min_lon = bbox.minLon;
    params.max_lon = bbox.maxLon;
  }
  return params;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function markerKey(event: MapEarthquake): string {
  if (event.sourceEventId) return `src:${event.sourceEventId}`;
  if (event.id) return `id:${event.id}`;
  return `geo:${event.eventTime}:${event.latitude}:${event.longitude}`;
}

/**
 * Cập nhật marker từ payload SSE. Chỉ nhận sự kiện có toạ độ WGS84 + magnitude
 * hợp lệ; payload dị biệt được bỏ qua (không làm crash). Không tạo mock.
 */
export function applySseEvent(
  events: ReadonlyArray<MapEarthquake>,
  payload: SSEEventPayload | null | undefined,
): MapEarthquake[] {
  if (!payload) return [...events];
  if (payload.event === "database_cleared") return [];
  if (payload.event !== "earthquake_detected" && payload.event !== "earthquake_alert") {
    return [...events];
  }

  const data = payload.data;
  if (!isRecord(data)) return [...events];

  const latitude = finite(data.latitude ?? data.lat);
  const longitude = finite(data.longitude ?? data.lon);
  const magnitude = finite(data.magnitude ?? data.mag);
  if (latitude === null || longitude === null || magnitude === null) return [...events];
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [...events];

  const item: EarthquakeItem = {
    id: finite(data.id) ?? 0,
    source: text(data.source) ?? "SSE",
    source_event_id: text(data.source_event_id) ?? "",
    event_time: text(data.event_time) ?? text(data.time) ?? payload.timestamp,
    latitude,
    longitude,
    depth_km: finite(data.depth_km ?? data.depth) ?? Number.NaN,
    magnitude,
    magnitude_type: text(data.magnitude_type) ?? undefined,
    place: text(data.place) ?? undefined,
    source_url: text(data.source_url) ?? undefined,
  };

  const incoming = toMapEarthquake(item);
  const next = [...events];
  const index = next.findIndex((event) => markerKey(event) === markerKey(incoming));
  if (index >= 0) next[index] = incoming;
  else next.push(incoming);
  return next;
}

/**
 * Sắp xếp sự kiện theo thời gian mới nhất trước (UTC ISO 8601 `Z`).
 * Timestamp hỏng → cuối danh sách; thứ tự bằng nhau giữ nguyên (stable sort).
 */
export function sortEventsByTimeDesc(events: readonly MapEarthquake[]): MapEarthquake[] {
  const timeOf = (value: string): number => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  };
  return [...events].sort((left, right) => timeOf(right.eventTime) - timeOf(left.eventTime));
}

export interface PopupFields {
  place: string;
  sourceEventId: string;
  eventTimeUtc: string;
  eventTimeLocal: string;
  primaryTime: string;
  depthKm: string;
  magnitude: string;
  sourceUrl: string | null;
}

function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

/** Đóng gói đủ 6 trường popup; thiếu dữ liệu → "—", không bịa số. */
export function popupFields(event: MapEarthquake, mode: TimezoneMode = "UTC"): PopupFields {
  return {
    place: event.place?.trim() || "—",
    sourceEventId: event.sourceEventId || "—",
    eventTimeUtc: formatEventTime(event.eventTime, "UTC"),
    eventTimeLocal: formatEventTime(event.eventTime, "UTC+7"),
    primaryTime: formatEventTime(event.eventTime, mode),
    depthKm: formatMetric(event.depthKm, 1),
    magnitude: formatMetric(event.magnitude, 1),
    sourceUrl: safeHttpUrl(event.sourceUrl),
  };
}

/** Nhãn toạ độ tâm HUD — luôn lấy từ map instance, không hardcode. */
export function centerLabel(view: Pick<MapViewState, "latitude" | "longitude">): string {
  return formatCoordinate(view.latitude, view.longitude);
}

/** Mức độ theo đúng ngưỡng của `magnitudeToColor` — dùng cho chú giải (I5). */
export function magnitudeLevelLabel(magnitude: number): string {
  if (!Number.isFinite(magnitude)) return "Không rõ";
  if (magnitude >= 6) return "Rất mạnh";
  if (magnitude >= 5) return "Mạnh";
  if (magnitude >= 4) return "Trung bình";
  return "Yếu";
}

/** Lọc marker theo magnitude/khoảng thời gian hiện tại (dùng hàm thuần có sẵn). */
export function filterMapEvents(
  events: ReadonlyArray<MapEarthquake>,
  filters: MapFilters,
): MapEarthquake[] {
  return filterEarthquakes([...events], filters);
}
