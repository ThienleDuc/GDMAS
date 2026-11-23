/** Bộ lọc phạm vi dùng chung cho các endpoint aggregate (I2 — optional, không gửi "all"). */

export interface GeoFilter {
  country?: string | null;
  region?: string | null;
}

/** Bộ lọc số cho KPI statistics (Danh mục) — dùng chung với /statistics/earthquakes. */
export interface NumericFilter {
  min_magnitude?: number;
  max_magnitude?: number;
  min_depth?: number;
  max_depth?: number;
}

/** Chuyển filter thành query param; bỏ sentinel "all" để giữ đường mặc định toàn cầu. */
export function geoQuery(filter?: GeoFilter | null): { country?: string; region?: string } {
  const query: { country?: string; region?: string } = {};
  if (filter?.country && filter.country !== "all") query.country = filter.country;
  if (filter?.region && filter.region !== "all") query.region = filter.region;
  return query;
}

export function hasGeoFilter(filter?: GeoFilter | null): boolean {
  return Object.keys(geoQuery(filter)).length > 0;
}
