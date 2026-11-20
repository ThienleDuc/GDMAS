/**
 * Formatters thuần cho UTC & WGS84 (I3) — không I/O, chạy được offline.
 * Nguồn: docs/api/API.md §1, contracts/README.md §3.1, docs/task/thien.md.
 */

export { formatEventTime, getRelativeTime, getStoredTimezone, setStoredTimezone } from "../utils/timezone.ts";
export type { TimezoneMode } from "../utils/timezone.ts";

/** Chuyển mọi đầu vào thành timestamp UTC ISO 8601 (hậu tố Z). */
export function toUtcIso(value: Date | string | number): string {
  return new Date(value).toISOString();
}

/** Kiểm tra chuỗi có phải timestamp ISO 8601 kèm múi giờ (Z hoặc ±HH:mm). */
export function isUtcIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (Number.isNaN(new Date(value).getTime())) return false;
  return /Z$|[+-]\d{2}:\d{2}$/.test(value);
}

/** Kiểm tra toạ độ WGS84 hợp lệ. */
export function isWgs84(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Hiển thị toạ độ WGS84 dạng "35.6895° N, 139.6917° E"; sai lệch trả "—". */
export function formatWgs84Point(latitude: number, longitude: number, digits = 4): string {
  if (!isWgs84(latitude, longitude)) return "—";
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(digits)}° ${ns}, ${Math.abs(longitude).toFixed(digits)}° ${ew}`;
}
