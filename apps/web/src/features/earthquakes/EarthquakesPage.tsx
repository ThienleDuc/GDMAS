import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { useEarthquakeInsights } from "../../hooks/useEarthquakeInsights.ts";
import { getEarthquakeDetail } from "../../services/earthquake-api.ts";
import { ApiError } from "../../lib/api-client.ts";
import { isNotFound } from "./earthquake-detail.ts";
import { useTimezone } from "../../contexts/timezone-context.tsx";
import {
  buildEarthquakeQuery,
  CHART_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  deriveViewState,
  fetchPage,
  formatEventRow,
  resolveWindow,
  type EarthquakeFilters,
} from "./earthquake-view.ts";
import { mapRangeToInterval } from "./earthquake-insights.ts";
import { countriesFromItems } from "./country-filter.ts";
import { geoQuery } from "../../contracts/geo-filter.ts";
import { ALL_REGIONS, filterByCountryAndRegion, regionsFromItems } from "./region-filter.ts";
import { useCatalogSelection } from "./useCatalogSelection.ts";
import { AsyncStatePanel } from "./components/AsyncStatePanel.tsx";
import { EarthquakeDetailPanel, type DetailState } from "./components/EarthquakeDetailPanel.tsx";
import { EarthquakeFilterBar, type EarthquakeFilterValues } from "./components/EarthquakeFilterBar.tsx";
import { EarthquakeInsights } from "./components/EarthquakeInsights.tsx";
import { EarthquakePagination } from "./components/EarthquakePagination.tsx";
import { EarthquakeTable } from "./components/EarthquakeTable.tsx";
import { SeverityReferenceTable } from "./components/SeverityReferenceTable.tsx";

const INITIAL_FILTERS: EarthquakeFilterValues = {
  range: "day",
  minMagnitude: "",
  maxMagnitude: "",
  minDepth: "",
  maxDepth: "",
};

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const EarthquakesPage: React.FC = () => {
  const [form, setForm] = useState<EarthquakeFilterValues>(INITIAL_FILTERS);
  const [appliedForm, setAppliedForm] = useState<EarthquakeFilterValues>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EarthquakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { timezone } = useTimezone();
  const [refreshKey, setRefreshKey] = useState(0);
  // Nguồn sự thật là URL ?country=&region= — đồng bộ với header/bản đồ.
  const { country: selectedCountry, region: selectedRegion, setSelection } = useCatalogSelection();
  const [chartItems, setChartItems] = useState<EarthquakeItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EarthquakeItem | null>(null);
  const [detailState, setDetailState] = useState<DetailState>("idle");
  const [detailMessage, setDetailMessage] = useState<string | undefined>(undefined);
  const [detailRetryKey, setDetailRetryKey] = useState(0);

  // Filter values are drafts; only the SVG apply button commits them.
  const handleFilterChange = useCallback((key: keyof EarthquakeFilterValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedForm(form);
    setPage(1);
    setSelectedId(null);
  }, [form]);

  const filters = useMemo<EarthquakeFilters>(
    () => ({
      range: appliedForm.range,
      minMagnitude: toOptionalNumber(appliedForm.minMagnitude),
      maxMagnitude: toOptionalNumber(appliedForm.maxMagnitude),
      minDepth: toOptionalNumber(appliedForm.minDepth),
      maxDepth: toOptionalNumber(appliedForm.maxDepth),
      sortBy: "event_time",
      order: "desc",
    }),
    [appliedForm],
  );

  const geo = useMemo(
    () => ({ country: selectedCountry, region: selectedRegion }),
    [selectedCountry, selectedRegion],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPage(
      { ...buildEarthquakeQuery(filters, page, DEFAULT_PAGE_SIZE), ...geoQuery(geo) },
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setItems(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
        setPage(result.page);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof ApiError
            ? reason
            : new ApiError("Không tải được danh mục động đất.", 0),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, refreshKey, selectedCountry, selectedRegion]);

  // Chart aggregates over all events in the selected time window, not only the current table page.
  useEffect(() => {
    const controller = new AbortController();
    fetchPage(
      { ...buildEarthquakeQuery(filters, 1, CHART_PAGE_SIZE), ...geoQuery(geo) },
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setChartItems(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setChartItems([]);
      });
    return () => controller.abort();
  }, [filters, refreshKey, selectedCountry, selectedRegion]);

  const countries = useMemo(() => countriesFromItems(chartItems), [chartItems]);
  const regions = useMemo(
    () => regionsFromItems(chartItems, selectedCountry),
    [chartItems, selectedCountry],
  );
  const chartFiltered = useMemo(
    () => filterByCountryAndRegion(chartItems, selectedCountry, selectedRegion),
    [chartItems, selectedCountry, selectedRegion],
  );
  const visibleItems = useMemo(
    () => filterByCountryAndRegion(items, selectedCountry, selectedRegion),
    [items, selectedCountry, selectedRegion],
  );
  const rows = useMemo(() => visibleItems.map((item) => formatEventRow(item, timezone)), [visibleItems, timezone]);
  const viewState = deriveViewState({ loading, error, data: rows });
  // KPI lấy từ CÙNG endpoint BE với Overview (/statistics/earthquakes) — cùng cửa sổ, geo và bộ lọc số.
  // Không còn lấy max từ 100 sự kiện đầu trang (giới hạn CHART_PAGE_SIZE) như trước.
  const statisticsWindow = useMemo(() => resolveWindow(appliedForm.range), [appliedForm.range]);
  const statisticsNumeric = useMemo(
    () => ({
      min_magnitude: filters.minMagnitude,
      max_magnitude: filters.maxMagnitude,
      min_depth: filters.minDepth,
      max_depth: filters.maxDepth,
    }),
    [filters.minMagnitude, filters.maxMagnitude, filters.minDepth, filters.maxDepth],
  );
  const insights = useEarthquakeInsights(mapRangeToInterval(appliedForm.range), refreshKey, geo, statisticsWindow, {
    includeTemporal: false,
    includeClusters: false,
    numeric: statisticsNumeric,
  });

  // RD-13: nạp chi tiết sự kiện theo dòng đã chọn — abort khi đổi dòng/unmount (tránh race).
  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    setDetail(null);
    setDetailState("loading");
    setDetailMessage(undefined);

    getEarthquakeDetail(selectedId, controller.signal)
      .then((item) => {
        if (controller.signal.aborted) return;
        setDetail(item);
        setDetailState("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        if (isNotFound(reason)) {
          setDetailState("not_found");
        } else {
          setDetailState("error");
          setDetailMessage(reason instanceof ApiError ? reason.message : "Lỗi không xác định.");
        }
      });

    return () => controller.abort();
  }, [selectedId, detailRetryKey]);

  const handleSelectEvent = useCallback((id: number) => setSelectedId(id), []);
  const handleCloseDetail = useCallback(() => setSelectedId(null), []);
  const handleRetryDetail = useCallback(() => setDetailRetryKey((key) => key + 1), []);

  const handleRetry = () => {
    setRefreshKey((key) => key + 1);
    setSelectedId(null);
  };

  const handleCountryChange = (country: string) => {
    setSelection(country, ALL_REGIONS);
    setPage(1);
    setSelectedId(null);
  };

  const handleRegionChange = (region: string) => {
    setSelection(selectedCountry, region);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <section className="eq-page">
      <header className="eq-page__heading">
        <h1 className="eq-page__title">Danh mục Động đất</h1>
      </header>

      <EarthquakeFilterBar value={form} onChange={handleFilterChange} onApply={handleApplyFilters} />

      <EarthquakeInsights
        statistics={insights.statistics}
        items={chartFiltered}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionChange={handleRegionChange}
        loading={insights.loading}
        error={insights.error?.message ?? null}
        unavailable={insights.unavailable}
        onRetry={handleRetry}
      />

      <div className="eq-data-row">
        <div className="eq-data-row__main">
          {viewState === "ready" ? (
            <>
              <EarthquakeTable rows={rows} timezone={timezone} onSelect={handleSelectEvent} />
              <EarthquakePagination
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={(next) => {
                  setPage(next);
                  setSelectedId(null);
                }}
              />
              <EarthquakeDetailPanel
                state={detailState}
                item={detail}
                timezone={timezone}
                message={detailMessage}
                onClose={handleCloseDetail}
                onRetry={handleRetryDetail}
              />
            </>
          ) : (
            <AsyncStatePanel
              state={viewState}
              message={error?.message}
              onRetry={viewState === "error" ? handleRetry : undefined}
            />
          )}
        </div>
        <SeverityReferenceTable />
      </div>
    </section>
  );
};
