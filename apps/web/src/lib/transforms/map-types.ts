/**
 * Kiểu dữ liệu nội bộ cho lớp bản đồ GIS (Terminal 7 — Frontend).
 * Không phụ thuộc `leaflet` để `map-data.ts` chạy được trong test offline (node:test).
 */

export interface MapEarthquake {
  id: number;
  sourceEventId: string;
  place: string;
  /** ISO 8601 UTC (hậu tố Z). */
  eventTime: string;
  latitude: number;
  longitude: number;
  depthKm: number;
  magnitude: number;
  magnitudeType?: string;
  sourceUrl?: string;
}

/** Cụm DBSCAN đã chuẩn hoá về trường canonical của `contracts/schemas/clusters.json`. */
export interface MapCluster {
  clusterId: number;
  centerLatitude: number;
  centerLongitude: number;
  eventCount: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
  radiusKm: number | null;
  name: string | null;
  dominantPlace: string | null;
}

export type TimeRangePreset = "24h" | "7d" | "30d" | "all";

export interface MapFilters {
  minMagnitude: number;
  timeRange: TimeRangePreset;
  showClusters: boolean;
  /** Tuỳ chọn — chỉ dùng khi `timeRange = "all"` mà vẫn muốn giới hạn. */
  startTime?: string;
  endTime?: string;
}

export interface MapViewState {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Thuộc tính vẽ marker (tương thích `Leaflet.PathOptions` nhưng không import leaflet). */
export interface MarkerStyle {
  radius: number;
  color: string;
  fillColor: string;
  fillOpacity: number;
  weight: number;
  opacity: number;
}

export const DEFAULT_MAP_FILTERS: MapFilters = {
  minMagnitude: 2.5,
  timeRange: "7d",
  showClusters: true,
};
