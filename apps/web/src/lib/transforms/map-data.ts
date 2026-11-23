/**
 * Hàm thuần cho lớp bản đồ GIS — không import `leaflet`/`react-leaflet`
 * để chạy được trong test offline (node:test + Vitest jsdom).
 *
 * Quy ước (I3): thời gian UTC ISO 8601 `Z`; toạ độ WGS84 (`latitude`, `longitude`).
 * Quy ước dữ liệu (contracts/schemas/clusters.json): nhận cả payload canonical
 * (`cluster_id`, `center_latitude`, …) và payload legacy (`id`, `lat`, `lon`,
 * `events_count`, `avg_mag`) — tuyệt đối không bịa số khi thiếu trường.
 */

import type { EarthquakeItem } from "../../services/earthquake-api";
import type {
  MapBoundingBox,
  MapCluster,
  MapBounds,
  MapEarthquake,
  MapFilters,
  MarkerStyle,
  TimeRangePreset,
} from "./map-types";

const EARTH_RADIUS_KM = 6371;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Chuyển bản ghi API sang kiểu bản đồ (giữ nguyên giá trị, không suy diễn). */
export function toMapEarthquake(item: EarthquakeItem): MapEarthquake {
  return {
    id: typeof item.id === "number" ? item.id : Number(item.id) || 0,
    sourceEventId: item.source_event_id ?? "",
    place: item.place ?? "Không rõ địa điểm",
    eventTime: item.event_time,
    latitude: item.latitude,
    longitude: item.longitude,
    depthKm: item.depth_km,
    magnitude: item.magnitude,
    magnitudeType: item.magnitude_type,
    sourceUrl: item.source_url,
    country: item.country,
    region: item.region,
  };
}

/**
 * Bán kính marker (px) theo magnitude: 4 px (M ≤ 1) → 9 px (M ≥ 8).
 * Giá trị không hữu hạn → 4 px (kích thước nhỏ nhất, không phóng đại dữ liệu hỏng).
 */
export function magnitudeToRadius(magnitude: number): number {
  if (!Number.isFinite(magnitude)) return 4;
  const clamped = Math.min(8, Math.max(1, magnitude));
  return Math.round((4 + ((clamped - 1) / 7) * 5) * 10) / 10;
}

/**
 * Màu marker theo magnitude: ≥6 đỏ, ≥5 cam, ≥4 vàng, còn lại xanh cyan.
 * Khớp chú giải `MapLegend`.
 */
export function magnitudeToColor(magnitude: number): string {
  if (!Number.isFinite(magnitude)) return "#64748b";
  if (magnitude >= 6) return "#f43f5e";
  if (magnitude >= 5) return "#f97316";
  if (magnitude >= 4) return "#facc15";
  return "#22d3ee";
}

/**
 * Độ mờ theo độ sâu: nông (0 km) đậm 1.0 → sâu (≥300 km) nhạt 0.35.
 * Thiếu/không hợp lệ → 0.8 (trung tính, không ngụ ý nông).
 */
export function depthToOpacity(depthKm: number | null | undefined): number {
  if (depthKm === null || depthKm === undefined || !Number.isFinite(depthKm)) return 0.8;
  const clamped = Math.min(300, Math.max(0, depthKm));
  const opacity = 1 - (clamped / 300) * 0.65;
  return Math.round(opacity * 100) / 100;
}

/** Tổ hợp thuộc tính vẽ cho `CircleMarker` (radius, màu, viền, độ mờ). */
export function markerStyleFor(event: Pick<MapEarthquake, "magnitude" | "depthKm">): MarkerStyle {
  const color = magnitudeToColor(event.magnitude);
  return {
    radius: magnitudeToRadius(event.magnitude),
    color,
    fillColor: color,
    fillOpacity: depthToOpacity(event.depthKm),
    weight: event.magnitude >= 5 ? 2 : 1,
    opacity: 0.9,
  };
}

/** Chuẩn hoá một cụm (canonical hoặc legacy) — trả `null` nếu thiếu toạ độ. */
export function normalizeCluster(
  raw: unknown,
  fallbackRadiusKm: number | null = null,
): MapCluster | null {
  if (!isRecord(raw)) return null;

  const latitude = toFiniteNumber(raw.center_latitude ?? raw.lat);
  const longitude = toFiniteNumber(raw.center_longitude ?? raw.lon);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  const id = toFiniteNumber(raw.cluster_id ?? raw.id);
  const eventCount = toFiniteNumber(raw.event_count ?? raw.events_count);

  return {
    clusterId: id === null ? 0 : Math.trunc(id),
    centerLatitude: latitude,
    centerLongitude: longitude,
    eventCount: eventCount === null ? 0 : Math.trunc(eventCount),
    avgMagnitude: toFiniteNumber(raw.avg_magnitude ?? raw.avg_mag),
    maxMagnitude: toFiniteNumber(raw.max_magnitude),
    radiusKm: toFiniteNumber(raw.radius_km) ?? fallbackRadiusKm,
    name: toStringOrNull(raw.name),
    dominantPlace: toStringOrNull(raw.dominant_place),
  };
}

/**
 * Chuẩn hoá danh sách cụm từ nhiều nguồn:
 * - `GET /api/v1/clusters` → `{ data: { clusters: [...], parameters } }`
 * - `GET /api/v1/patterns` → `{ clustering_summary: { clusters: [...] } }`
 * - mảng cụm thô.
 * `max_magnitude`/`radius_km` thiếu → `null` (UI hiển thị "—"), không nội suy.
 */
export function normalizeClusters(source: unknown): MapCluster[] {
  let items: unknown[] = [];
  let fallbackRadiusKm: number | null = null;

  if (Array.isArray(source)) {
    items = source;
  } else if (isRecord(source)) {
    const data = isRecord(source.data) ? source.data : null;
    const parameters = (data && isRecord(data.parameters) ? data.parameters : null) ??
      (isRecord(source.parameters) ? source.parameters : null);
    if (parameters) {
      const epsKm = toFiniteNumber(parameters.eps_km);
      const epsDegrees = toFiniteNumber(parameters.eps_degrees);
      fallbackRadiusKm = epsKm ?? (epsDegrees === null ? null : Math.round(epsDegrees * 111));
    }

    if (data && Array.isArray(data.clusters)) {
      items = data.clusters;
    } else if (Array.isArray(source.clusters)) {
      items = source.clusters;
    } else if (isRecord(source.clustering_summary) && Array.isArray(source.clustering_summary.clusters)) {
      items = source.clustering_summary.clusters;
    }
  }

  const normalized = items
    .map((item, index) => {
      const cluster = normalizeCluster(item, fallbackRadiusKm);
      if (!cluster) return null;
      if (cluster.clusterId === 0 && isRecord(item) && item.cluster_id === undefined) {
        return { ...cluster, clusterId: index };
      }
      return cluster;
    })
    .filter((cluster): cluster is MapCluster => cluster !== null);

  return normalized;
}

/** Khoảng cách great-circle (km) giữa 2 toạ độ WGS84 — công thức haversine. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  if (
    !Number.isFinite(a.latitude) ||
    !Number.isFinite(a.longitude) ||
    !Number.isFinite(b.latitude) ||
    !Number.isFinite(b.longitude)
  ) {
    return Number.NaN;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Đổi khung nhìn Leaflet → bounding box WGS84 đã kẹp biên (chịu được `lon` wrap). */
export function viewportToBbox(bounds: Partial<MapBounds>): MapBoundingBox | null {
  const north = toFiniteNumber(bounds.north);
  const south = toFiniteNumber(bounds.south);
  const east = toFiniteNumber(bounds.east);
  const west = toFiniteNumber(bounds.west);
  if (north === null || south === null || east === null || west === null) return null;

  const clampLat = (value: number) => Math.min(90, Math.max(-90, value));
  const wrapLon = (value: number) => {
    if (value >= -180 && value <= 180) return value;
    return ((((value + 180) % 360) + 360) % 360) - 180;
  };

  return {
    minLat: clampLat(Math.min(north, south)),
    maxLat: clampLat(Math.max(north, south)),
    minLon: wrapLon(Math.min(east, west)),
    maxLon: wrapLon(Math.max(east, west)),
  };
}

/** Khoảng thời gian UTC tương ứng preset lọc (dùng `now` để test tất định). */
export function timeRangeBounds(
  preset: TimeRangePreset,
  now: Date = new Date(),
): { start?: string; end?: string } {
  const end = now.toISOString();
  switch (preset) {
    case "24h":
      return { start: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(), end };
    case "7d":
      return { start: new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString(), end };
    case "30d":
      return { start: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(), end };
    case "all":
    default:
      return {};
  }
}

/** Marker có thoả khoảng độ lớn + khoảng thời gian? */
export function shouldShowMarker(
  event: Pick<MapEarthquake, "magnitude" | "eventTime">,
  filters: Pick<MapFilters, "minMagnitude" | "maxMagnitude" | "startTime" | "endTime">,
): boolean {
  if (!Number.isFinite(event.magnitude)) return false;
  if (event.magnitude < filters.minMagnitude) return false;
  if (filters.maxMagnitude !== undefined && event.magnitude > filters.maxMagnitude) return false;

  const eventMs = Date.parse(event.eventTime);
  if (Number.isNaN(eventMs)) return false;

  if (filters.startTime) {
    const startMs = Date.parse(filters.startTime);
    if (!Number.isNaN(startMs) && eventMs < startMs) return false;
  }
  if (filters.endTime) {
    const endMs = Date.parse(filters.endTime);
    if (!Number.isNaN(endMs) && eventMs > endMs) return false;
  }
  return true;
}

/** Lọc danh sách sự kiện theo bộ lọc hiện tại (giữ nguyên thứ tự đầu vào). */
export function filterEarthquakes(
  events: MapEarthquake[],
  filters: Pick<MapFilters, "minMagnitude" | "maxMagnitude" | "startTime" | "endTime">,
): MapEarthquake[] {
  return events.filter((event) => shouldShowMarker(event, filters));
}

/**
 * Định dạng toạ độ WGS84 chuẩn hiển thị: `16.0544° N, 108.2022° E`.
 * Giá trị không hợp lệ → `"—"` (không bịa số 0).
 */
export function formatCoordinate(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "—";
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  const lat = Math.abs(latitude).toFixed(4);
  const lon = Math.abs(longitude).toFixed(4);
  return `${lat}° ${latDir}, ${lon}° ${lonDir}`;
}

/** Định dạng số an toàn cho UI: thiếu dữ liệu → `"—"`, không hiển thị `NaN`. */
export function formatMetric(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** Nhãn tiếng Việt cho preset khoảng thời gian. */
export function timeRangeLabel(preset: TimeRangePreset): string {
  switch (preset) {
    case "24h":
      return "24 giờ";
    case "7d":
      return "7 ngày";
    case "30d":
      return "30 ngày";
    case "all":
      return "Toàn bộ";
  }
}
