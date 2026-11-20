import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ALL_COUNTRIES } from "./country-filter.ts";
import { ALL_REGIONS } from "./region-filter.ts";
import { parseSelection, selectionToParams } from "./catalog-selection.ts";

export interface CatalogSelectionResult {
  country: string;
  region: string;
  setCountry: (country: string) => void;
  setRegion: (region: string) => void;
  /** Cập nhật cả hai trong một lần — tránh stale khi chọn cụm quốc gia/khu vực. */
  setSelection: (country: string, region: string) => void;
  reset: () => void;
}

/**
 * Nguồn sự thật là URL `?country=&region=` → hai trang Danh mục và Bản đồ dùng chung.
 * Dùng `{ replace: true }` để không spam lịch sử khi đổi bộ lọc.
 */
export function useCatalogSelection(): CatalogSelectionResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const { country, region } = parseSelection(searchParams);

  const update = useCallback(
    (nextCountry: string, nextRegion: string) => {
      setSearchParams((prev) => selectionToParams({ country: nextCountry, region: nextRegion }, prev), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  const setCountry = useCallback(
    (value: string) => update(value, ALL_REGIONS),
    [update],
  );
  const setRegion = useCallback((value: string) => update(country, value), [country, update]);
  const reset = useCallback(() => update(ALL_COUNTRIES, ALL_REGIONS), [update]);

  return { country, region, setCountry, setRegion, setSelection: update, reset };
}
