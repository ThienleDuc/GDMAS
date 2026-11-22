/**
 * Service đọc danh mục quốc gia/khu vực từ BE (GET /api/v1/earthquakes/{countries,regions}).
 * BE là nguồn sự thật — FE giữ helper suy từ place làm fallback ở tầng component (RULE-03).
 */

import type {
  CountryCatalogResponse,
  RegionCatalogResponse,
} from "../contracts/geo-catalog.ts";
import { fetchApi } from "../lib/api-client.ts";
import { ALL_COUNTRIES } from "../features/earthquakes/country-filter.ts";

export function getCountryCatalog(signal?: AbortSignal): Promise<CountryCatalogResponse> {
  return fetchApi<CountryCatalogResponse>("/api/v1/earthquakes/countries", { signal });
}

export function getRegionCatalog(
  country: string = ALL_COUNTRIES,
  signal?: AbortSignal,
): Promise<RegionCatalogResponse> {
  const query =
    country && country !== ALL_COUNTRIES ? `?country=${encodeURIComponent(country)}` : "";
  return fetchApi<RegionCatalogResponse>(`/api/v1/earthquakes/regions${query}`, { signal });
}
