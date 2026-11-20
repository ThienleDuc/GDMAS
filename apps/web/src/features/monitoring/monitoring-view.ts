/**
 * Logic thuần cho trang bản đồ giám sát (T7.04) — không React/DOM/leaflet.
 * Mọi đầu ra thời gian là UTC ISO 8601 `Z`, toạ độ là WGS84 (I3).
 * `lib/transforms/map-data.ts` được dùng lại, không tự tính lại bán kính/màu/độ mờ.
 */

import type { EarthquakeItem, QueryEarthquakeParams } from "../../contracts/earthquake.ts";
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
 * `start_time`/`end_time` luôn được chuẩn hoá UTC `Z`; bbox đã kẹp WGS84.
 */
export function buildEarthquakeQuery(
  filters: MapFilters,
  bbox: MapBoundingBox | null,
  options: { now?: Date; limit?: number } = {},
): QueryEarthquakeParams {
  const range = timeRangeBounds(filters.timeRange, options.now ?? new Date());
  const params: QueryEarthquakeParams = {
    page: 1,
    limit: options.limit ?? MAP_PAGE_SIZE,
    min_magnitude: filters.minMagnitude,
    sort_by: "magnitude",
    order: "desc",
  };

  const start = filters.startTime ?? range.start;
  const end = filters.endTime ?? range.end;
  if (start) params.start_time = toUtcIso(start);
  if (end) params.end_time = toUtcIso(end);

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
