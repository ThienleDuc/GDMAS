import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { useCatalogSelection } from "../../features/earthquakes/useCatalogSelection.ts";
import { getClustersOptional } from "../../services/earthquake-api.ts";
import { getCountryCatalog } from "../../services/geo-catalog-api.ts";
import { countriesFromClusters, type CountryOption } from "./header-data.ts";

const ALL_LABEL = "Tất cả quốc gia";

/**
 * Danh mục quốc gia lấy từ GET /api/v1/earthquakes/countries (BE suy từ place).
 * Fallback GET /api/v1/clusters → countriesFromClusters khi endpoint mới lỗi (RULE-03).
 * Combobox có ô tìm kiếm; lựa chọn ghi vào ?country= → mọi trang FE dùng chung (I5).
 */
export const GlobalCountryFilter: React.FC = () => {
  const { country, setCountry } = useCatalogSelection();
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fromClusters = () =>
      getClustersOptional(controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setUnavailable(result.unavailable || !result.data);
          setOptions(countriesFromClusters(result.data ?? null));
        })
        .catch(() => {
          if (!controller.signal.aborted) setUnavailable(true);
        });

    getCountryCatalog(controller.signal)
      .then((catalog) => {
        if (controller.signal.aborted) return;
        const options: CountryOption[] = catalog.data.map((item) => ({
          country: item.country,
          eventCount: item.count,
          clusterIds: [],
        }));
        if (options.length === 0) {
          fromClusters();
          return;
        }
        setOptions(options);
        setUnavailable(false);
      })
      .catch(fromClusters);

    return () => controller.abort();
  }, []);

  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.country.toLowerCase().includes(term));
  }, [options, query]);

  const selected = options.find((option) => option.country === country);
  const selectedLabel = country === ALL_COUNTRIES ? ALL_LABEL : country;
  const selectedCount = country === ALL_COUNTRIES ? undefined : selected?.eventCount;

  const select = (value: string) => {
    setCountry(value);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="layout__header-widget layout__country-filter">
      <label className="layout__country-label" htmlFor="global-country-select">
        Quốc gia
      </label>
      <div
        className="layout__country-combo"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <button
          id="global-country-select"
          type="button"
          className="layout__country-select"
          aria-label="Lọc quốc gia dùng chung toàn cục"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={unavailable}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="layout__country-value">
            {selectedLabel}
            {selectedCount !== undefined ? ` (${selectedCount})` : ""}
          </span>
          <ChevronDown className="layout__header-icon h-4 w-4" aria-hidden="true" />
        </button>

        {open && !unavailable && (
          <div className="layout__country-dropdown">
            <div className="layout__country-search">
              <Search className="layout__header-icon h-3.5 w-3.5" aria-hidden="true" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm quốc gia…"
                aria-label="Tìm quốc gia"
              />
            </div>
            <ul className="layout__country-options" role="listbox" aria-label="Danh sách quốc gia">
              <li role="option" aria-selected={country === ALL_COUNTRIES}>
                <button
                  type="button"
                  className={`layout__country-option ${country === ALL_COUNTRIES ? "is-active" : ""}`}
                  onClick={() => select(ALL_COUNTRIES)}
                >
                  <span>{ALL_LABEL}</span>
                </button>
              </li>
              {visibleOptions.map((option) => (
                <li key={option.country} role="option" aria-selected={country === option.country}>
                  <button
                    type="button"
                    className={`layout__country-option ${country === option.country ? "is-active" : ""}`}
                    onClick={() => select(option.country)}
                  >
                    <span title={option.country}>{option.country}</span>
                    <span className="layout__country-option-count">{option.eventCount}</span>
                  </button>
                </li>
              ))}
              {visibleOptions.length === 0 && (
                <li className="layout__country-empty-option">Không tìm thấy quốc gia</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {unavailable && <span className="layout__country-empty">Chưa có dữ liệu cụm</span>}
    </div>
  );
};
