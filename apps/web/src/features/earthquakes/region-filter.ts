/**
 * Helper thuần tách KHU VỰC trong một quốc gia từ chuỗi `place` (Revision 2026-11-21).
 * BE không có field country/region — mọi phân loại đều suy từ `place`, không bịa dữ liệu.
 * Không React/DOM/network — chạy được trong node:test offline.
 */

import { countryFromPlace } from "./country-clusters.ts";
import { ALL_COUNTRIES } from "./country-filter.ts";

export const ALL_REGIONS = "all";

type PlaceLike = { place?: string | null };

/** Danh sách quốc gia suy từ `place` — dùng chung cho EarthquakeItem và MapEarthquake. */
export function countriesFromPlaces<T extends PlaceLike>(items: readonly T[]): string[] {
  return [...new Set(items.map((item) => countryFromPlace(item.place)))].sort((left, right) =>
    left.localeCompare(right),
  );
}

/** Bỏ tiền tố khoảng cách/hướng: "12 km NE of San Francisco" → "San Francisco". */
const DISTANCE_PREFIX = /^\d+(?:\.\d+)?\s*(?:km|mi|miles?)?\s*[NSEW]{1,3}\s+of\s+/i;

/**
 * Trả nhãn khu vực của `place` sau khi biết quốc gia.
 * - bỏ đoạn quốc gia ở cuối (nếu trùng tên hoặc là mã bang Mỹ);
 * - bỏ tiền tố khoảng cách/hướng;
 * - fallback "Khác" khi không trích được.
 */
export function regionFromPlace(place: string | null | undefined, country: string): string {
  if (!place?.trim()) return "Khác";

  let text = place.trim();
  const segments = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (segments.length > 1) {
    const last = segments[segments.length - 1];
    if (
      country !== ALL_COUNTRIES &&
      (countryFromPlace(last) === country || last.toUpperCase() === country.toUpperCase())
    ) {
      segments.pop();
    }
  }

  text = segments.join(", ").trim();
  text = text.replace(DISTANCE_PREFIX, "").trim();
  text = text.replace(/^off (?:the )?.+?\bof\s+/i, "").trim();
  return text || "Khác";
}

/** Danh sách khu vực duy nhất của quốc gia đã chọn (rỗng khi chưa chọn quốc gia). */
export function regionsFromItems<T extends PlaceLike>(items: readonly T[], country: string): string[] {
  if (country === ALL_COUNTRIES) return [];
  const regions = items
    .filter((item) => countryFromPlace(item.place) === country)
    .map((item) => regionFromPlace(item.place, country));
  return [...new Set(regions)].sort((left, right) => left.localeCompare(right));
}

/** Lọc theo quốc gia rồi khu vực — dùng được cho cả EarthquakeItem lẫn MapEarthquake. */
export function filterByCountryAndRegion<T extends PlaceLike>(
  items: readonly T[],
  country: string,
  region: string,
): T[] {
  const inCountry =
    country === ALL_COUNTRIES ? [...items] : items.filter((item) => countryFromPlace(item.place) === country);
  if (country === ALL_COUNTRIES || region === ALL_REGIONS) return inCountry;
  return inCountry.filter((item) => regionFromPlace(item.place, country) === region);
}
