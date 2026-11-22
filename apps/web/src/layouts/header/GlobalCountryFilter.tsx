import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { useCatalogSelection } from "../../features/earthquakes/useCatalogSelection.ts";
import { getClustersOptional } from "../../services/earthquake-api.ts";
import { getCountryCatalog } from "../../services/geo-catalog-api.ts";
import { countriesFromClusters, type CountryOption } from "./header-data.ts";

/**
 * Danh mục quốc gia lấy từ GET /api/v1/earthquakes/countries (BE suy từ place).
 * Fallback GET /api/v1/clusters → countriesFromClusters khi endpoint mới lỗi (RULE-03).
 * Lựa chọn ghi vào ?country= → mọi trang FE dùng chung; không mock (I5).
 */
export const GlobalCountryFilter: React.FC = () => {
  const { country, setCountry } = useCatalogSelection();
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [unavailable, setUnavailable] = useState(false);

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

  return (
    <div className="layout__header-widget layout__country-filter">
      <label className="layout__country-label" htmlFor="global-country-select">
        Quốc gia
      </label>
      <div className="layout__country-combo">
        <select
          id="global-country-select"
          className="layout__country-select"
          value={country}
          disabled={unavailable}
          onChange={(event) => setCountry(event.target.value)}
          aria-label="Lọc quốc gia dùng chung toàn cục"
        >
          <option value={ALL_COUNTRIES}>Tất cả quốc gia</option>
          {options.map((option) => (
            <option key={option.country} value={option.country}>
              {option.country} ({option.eventCount})
            </option>
          ))}
        </select>
        <ChevronDown className="layout__header-icon h-4 w-4" aria-hidden="true" />
      </div>
      {unavailable && <span className="layout__country-empty">Chưa có dữ liệu cụm</span>}
    </div>
  );
};
