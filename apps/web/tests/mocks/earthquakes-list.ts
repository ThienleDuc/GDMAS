import type { EarthquakeItem } from "../../src/contracts/earthquake.ts";

const PLACES: ReadonlyArray<[string, number, number]> = [
  ["Off the east coast of Honshu, Japan", 38.2, 142.4],
  ["Central California, USA", 36.7, -119.6],
  ["Northern Sumatra, Indonesia", 2.5, 98.2],
  ["Tonga Region", -20.4, -174.8],
  ["Southern Chile", -38.7, -73.1],
  ["Western Turkey", 38.9, 27.4],
  ["Near the coast of Central Peru", -12.1, -77.3],
  ["Iceland", 64.1, -21.9],
];

/** Deterministic FE fixture — dev/test only, never imported by runtime views. */
export function createEarthquakeList(count = 40): EarthquakeItem[] {
  return Array.from({ length: count }, (_, index) => {
    const [place, latitude, longitude] = PLACES[index % PLACES.length];
    const magnitude = Number((1.2 + ((index * 7) % 63) / 10).toFixed(1));
    const depth = 5 + ((index * 13) % 246);
    const time = new Date(Date.now() - index * 3_600_000).toISOString();
    return {
      id: 1000 + index,
      source: "USGS",
      source_event_id: `mock_${index}`,
      event_time: time,
      latitude,
      longitude,
      depth_km: depth,
      magnitude,
      magnitude_type: "mw",
      place,
      source_url: `https://earthquake.usgs.gov/earthquakes/eventpage/mock_${index}`,
      ingested_at: time,
    };
  });
}

export function slicePage(items: EarthquakeItem[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    total_pages: totalPages,
  };
}
