/** Pure country filter helpers over earthquake items — no React/DOM/network. */

import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { countryFromPlace } from "./country-clusters.ts";

export const ALL_COUNTRIES = "all";

/** Ưu tiên field do BE suy từ `place`; giữ helper cũ làm fallback (I2/RULE-03). */
export function countryOf(item: { place?: string | null; country?: string | null }): string {
  return item.country?.trim() || countryFromPlace(item.place);
}

export function countriesFromItems(items: readonly EarthquakeItem[]): string[] {
  return [...new Set(items.map(countryOf))].sort((a, b) => a.localeCompare(b));
}

export function filterItemsByCountry(
  items: readonly EarthquakeItem[],
  country: string,
): EarthquakeItem[] {
  if (country === ALL_COUNTRIES) return [...items];
  return items.filter((item) => countryOf(item) === country);
}
