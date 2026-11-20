/**
 * Chuyển đổi lựa chọn quốc gia/khu vực ↔ URL query params — thuần, test offline.
 * Dùng chung cho `/earthquakes` và `/monitoring` (Revision 2026-11-21).
 */

import { ALL_COUNTRIES } from "./country-filter.ts";
import { ALL_REGIONS } from "./region-filter.ts";

export interface CatalogSelection {
  country: string;
  region: string;
}

/** Đọc `?country=&region=`; giá trị rỗng/lạ → mặc định `all`. */
export function parseSelection(params: URLSearchParams): CatalogSelection {
  return {
    country: params.get("country")?.trim() || ALL_COUNTRIES,
    region: params.get("region")?.trim() || ALL_REGIONS,
  };
}

/** Ghi ngược vào URL, giữ các param khác; xoá param khi về mặc định. */
export function selectionToParams(
  selection: CatalogSelection,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  if (selection.country === ALL_COUNTRIES) next.delete("country");
  else next.set("country", selection.country);

  if (selection.region === ALL_REGIONS || selection.country === ALL_COUNTRIES) next.delete("region");
  else next.set("region", selection.region);

  return next;
}
