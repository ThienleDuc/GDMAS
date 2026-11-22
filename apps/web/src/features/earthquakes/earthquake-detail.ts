/**
 * Helper thuần cho panel chi tiết sự kiện (RD-13) — dùng được trong test offline.
 * BE `GET /api/v1/earthquakes/{id}` trả object `EarthquakeItem` (không envelope).
 * Quy ước I3: thời gian hiển thị theo mode UTC/UTC+7, toạ độ WGS84.
 * Không bịa số — field optional thiếu thì bỏ qua (I5).
 */

import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { formatEventTime, formatWgs84Point, type TimezoneMode } from "../../lib/formatters.ts";
import { ApiError } from "../../lib/api-client.ts";

export interface DetailField {
  label: string;
  value: string;
}

/** Các field luôn có từ payload canonical + field optional có giá trị. */
export function detailFields(
  item: EarthquakeItem,
  timezone: TimezoneMode = "UTC",
): DetailField[] {
  const fields: DetailField[] = [
    { label: "Mã nguồn", value: item.source_event_id || item.source },
    { label: "Thời gian", value: formatEventTime(item.event_time, timezone) },
    { label: "Độ lớn", value: item.magnitude.toFixed(1) },
    { label: "Độ sâu", value: `${item.depth_km.toFixed(1)} km` },
    {
      label: "Toạ độ WGS84",
      value: formatWgs84Point(item.latitude, item.longitude),
    },
    { label: "Nguồn", value: item.source },
  ];

  if (item.place) fields.push({ label: "Địa điểm", value: item.place });
  if (item.magnitude_type) fields.push({ label: "Loại độ lớn", value: item.magnitude_type });
  if (item.source_url) fields.push({ label: "Liên kết gốc", value: item.source_url });
  if (item.ingested_at) {
    fields.push({ label: "Nạp lúc", value: formatEventTime(item.ingested_at, timezone) });
  }
  const raw = rawDataSummary(item);
  if (raw) fields.push({ label: "Dữ liệu gốc", value: raw });

  return fields;
}

/** Nhãn ngắn báo có GeoJSON gốc — trả null khi BE không trả hoặc rỗng. */
export function rawDataSummary(item: EarthquakeItem): string | null {
  const raw = item.raw_data;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return Object.keys(raw).length > 0 ? "Có GeoJSON gốc (USGS)" : null;
}

/** 404 từ BE = không tìm thấy sự kiện; lỗi khác vẫn là Error State. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
