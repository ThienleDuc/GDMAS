/**
 * Các kiểu dữ liệu nội bộ dùng chung cho ứng dụng Frontend
 */

export interface FilterState {
  minMagnitude?: number;
  maxMagnitude?: number;
  startDate?: string;
  endDate?: string;
  minDepth?: number;
  maxDepth?: number;
}

export type TimeAggregation = "day" | "week" | "month";

/** Khoảng thời gian UTC (ISO 8601, hậu tố Z). */
export interface TimeRange {
  start?: string;
  end?: string;
}

/** Bounding box WGS84 dùng cho bộ lọc theo khung nhìn bản đồ. */
export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Tâm + mức zoom hiện tại của bản đồ. */
export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}
