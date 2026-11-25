/** Danh mục quốc gia/khu vực do BE suy từ `place` (contracts/schemas/geo-catalog.json). */

export interface CountryCountItem {
  country: string;
  count: number;
  avg_magnitude?: number | null;
  max_magnitude?: number | null;
}

export interface RegionCountItem {
  region: string;
  count: number;
  avg_magnitude?: number | null;
  max_magnitude?: number | null;
}

export interface CountryCatalogResponse {
  success: boolean;
  data: CountryCountItem[];
}

export interface RegionCatalogResponse {
  success: boolean;
  data: RegionCountItem[];
}
