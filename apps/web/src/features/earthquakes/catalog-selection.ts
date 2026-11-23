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

/**
 * Tạo link nội bộ mang selection hiện tại — giữ query/hash khác, không nhân đôi param (I2/I3).
 * Dùng cho mọi điều hướng để combobox header không bị reset khi chuyển trang.
 */
export function pathWithSelection(to: string, selection: CatalogSelection): string {
  const hashIndex = to.indexOf("#");
  const beforeHash = hashIndex >= 0 ? to.slice(0, hashIndex) : to;
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const base =
    queryIndex >= 0 ? new URLSearchParams(beforeHash.slice(queryIndex + 1)) : new URLSearchParams();
  const query = selectionToParams(selection, base).toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}
