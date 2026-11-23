import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../../features/earthquakes/region-filter.ts";
import { useCatalogSelection } from "../../features/earthquakes/useCatalogSelection.ts";
import { getRegionCatalog } from "../../services/geo-catalog-api.ts";
import { regionOptionsFromCatalog, type RegionOption } from "./header-data.ts";

const ALL_LABEL = "Tất cả khu vực";

/**
 * Khu vực dùng chung mọi giao diện FE — lấy từ GET /api/v1/earthquakes/regions?country=.
 * Ghi vào `?region=` (cùng nguồn sự thật với quốc gia). Khi chưa chọn quốc gia hoặc API lỗi
 * → disable + nhãn rõ ràng, không thay bằng dữ liệu giả (I5).
 */
export const GlobalRegionFilter: React.FC = () => {
  const { country, region, setRegion } = useCatalogSelection();
  const [options, setOptions] = useState<RegionOption[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);

  const needsCountry = country === ALL_COUNTRIES;

  useEffect(() => {
    setOpen(false);
    setOptions([]);
    if (needsCountry) {
      setUnavailable(false);
      return;
    }
    const controller = new AbortController();
    getRegionCatalog(country, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setOptions(regionOptionsFromCatalog(payload));
        setUnavailable(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [country, needsCountry]);

  const visibleOptions = useMemo(() => options.slice(0, 50), [options]);
  const disabled = needsCountry || unavailable || (!open && options.length === 0);
  const selectedLabel = region === ALL_REGIONS ? ALL_LABEL : region;
  const selectedCount = region === ALL_REGIONS ? undefined : options.find((item) => item.region === region)?.count;

  const select = (value: string) => {
    setRegion(value);
    setOpen(false);
  };

  return (
    <div className="layout__header-widget layout__region-filter">
      <label className="layout__region-label" htmlFor="global-region-select">
        Khu vực
      </label>
      <div
        className="layout__region-combo"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <button
          id="global-region-select"
          type="button"
          className="layout__region-select"
          aria-label="Lọc khu vực dùng chung toàn cục"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="layout__region-value">
            {selectedLabel}
            {selectedCount !== undefined ? ` (${selectedCount})` : ""}
          </span>
          <ChevronDown className="layout__header-icon h-4 w-4" aria-hidden="true" />
        </button>

        {open && !disabled && (
          <div className="layout__region-dropdown">
            <ul className="layout__region-options" role="listbox" aria-label="Danh sách khu vực">
              <li role="option" aria-selected={region === ALL_REGIONS}>
                <button
                  type="button"
                  className={`layout__region-option ${region === ALL_REGIONS ? "is-active" : ""}`}
                  onClick={() => select(ALL_REGIONS)}
                >
                  <span>{ALL_LABEL}</span>
                </button>
              </li>
              {visibleOptions.map((option) => (
                <li key={option.region} role="option" aria-selected={region === option.region}>
                  <button
                    type="button"
                    className={`layout__region-option ${region === option.region ? "is-active" : ""}`}
                    onClick={() => select(option.region)}
                  >
                    <span title={option.region}>{option.region}</span>
                    <span className="layout__region-option-count">{option.count}</span>
                  </button>
                </li>
              ))}
              {visibleOptions.length === 0 && (
                <li className="layout__region-empty-option">Không có khu vực</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {needsCountry && <span className="layout__region-empty">Chọn quốc gia trước</span>}
      {!needsCountry && unavailable && (
        <span className="layout__region-empty">Chưa có dữ liệu khu vực</span>
      )}
    </div>
  );
};
