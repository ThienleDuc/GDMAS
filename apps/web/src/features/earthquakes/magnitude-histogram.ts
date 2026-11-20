/** Pure histogram of earthquake counts by magnitude band. No React/DOM/network. */

import type { EarthquakeItem } from "../../contracts/earthquake.ts";

export interface MagnitudeBin {
  bin: string;
  count: number;
  ratio: number;
}

export const MAGNITUDE_BINS: ReadonlyArray<{ bin: string; min: number; max: number }> = [
  { bin: "Dưới 3.0", min: -Infinity, max: 3 },
  { bin: "3.0 – 4.9", min: 3, max: 5 },
  { bin: "5.0 – 5.9", min: 5, max: 6 },
  { bin: "Từ 6.0", min: 6, max: Infinity },
];

export function buildMagnitudeHistogram(items: readonly EarthquakeItem[]): MagnitudeBin[] {
  const counts = MAGNITUDE_BINS.map((band) =>
    items.filter((item) => item.magnitude >= band.min && item.magnitude < band.max).length,
  );
  const total = items.length;
  return MAGNITUDE_BINS.map((band, index) => ({
    bin: band.bin,
    count: counts[index],
    ratio: total ? Number(((counts[index] / total) * 100).toFixed(1)) : 0,
  }));
}
