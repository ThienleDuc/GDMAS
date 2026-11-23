/**
 * Service đọc danh mục quốc gia/khu vực từ BE (GET /api/v1/earthquakes/{countries,regions}).
 * BE là nguồn sự thật — FE giữ helper suy từ place làm fallback ở tầng component (RULE-03).
 * Cửa sổ Ngày/Tuần/Tháng được truyền xuống để xếp hạng dùng cùng phạm vi với các chart khác.
 */

import type {
  CountryCatalogResponse,
  RegionCatalogResponse,
} from "../contracts/geo-catalog.ts";
import { fetchApi } from "../lib/api-client.ts";
import { ALL_COUNTRIES } from "../features/earthquakes/country-filter.ts";

export interface CatalogWindow {
  start_time?: string;
  end_time?: string;
}

function buildQuery(country: string | null | undefined, window?: CatalogWindow | null): string {
  const params = new URLSearchParams();
  if (country && country !== ALL_COUNTRIES) params.set("country", country);
  if (window?.start_time) params.set("start_time", window.start_time);
  if (window?.end_time) params.set("end_time", window.end_time);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getCountryCatalog(
  signal?: AbortSignal,
  window?: CatalogWindow | null,
): Promise<CountryCatalogResponse> {
  return fetchApi<CountryCatalogResponse>(
    `/api/v1/earthquakes/countries${buildQuery(null, window)}`,
    { signal },
  );
}

export function getRegionCatalog(
  country: string = ALL_COUNTRIES,
  signal?: AbortSignal,
  window?: CatalogWindow | null,
): Promise<RegionCatalogResponse> {
  return fetchApi<RegionCatalogResponse>(
    `/api/v1/earthquakes/regions${buildQuery(country, window)}`,
    { signal },
  );
}
