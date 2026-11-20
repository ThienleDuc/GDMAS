/** Pure country filter helpers over earthquake items — no React/DOM/network. */

import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { countryFromPlace } from "./country-clusters.ts";

export const ALL_COUNTRIES = "all";

export function countriesFromItems(items: readonly EarthquakeItem[]): string[] {
  return [...new Set(items.map((item) => countryFromPlace(item.place)))].sort((a, b) => a.localeCompare(b));
}

export function filterItemsByCountry(
  items: readonly EarthquakeItem[],
  country: string,
): EarthquakeItem[] {
  if (country === ALL_COUNTRIES) return [...items];
  return items.filter((item) => countryFromPlace(item.place) === country);
}
