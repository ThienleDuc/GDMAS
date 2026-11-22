import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { useEarthquakeInsights } from "../../hooks/useEarthquakeInsights.ts";
import { getEarthquakeDetail } from "../../services/earthquake-api.ts";
import { ApiError } from "../../lib/api-client.ts";
import { isNotFound } from "./earthquake-detail.ts";
import {
  getStoredTimezone,
  setStoredTimezone,
  type TimezoneMode,
} from "../../lib/formatters.ts";
import {
  buildEarthquakeQuery,
  CHART_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  deriveViewState,
  fetchPage,
  formatEventRow,
  type EarthquakeFilters,
} from "./earthquake-view.ts";
import { mapRangeToInterval } from "./earthquake-insights.ts";
import { ALL_COUNTRIES, countriesFromItems, filterItemsByCountry } from "./country-filter.ts";
import { AsyncStatePanel } from "./components/AsyncStatePanel.tsx";
import { EarthquakeDetailPanel, type DetailState } from "./components/EarthquakeDetailPanel.tsx";
import { EarthquakeFilterBar, type EarthquakeFilterValues } from "./components/EarthquakeFilterBar.tsx";
import { EarthquakeInsights } from "./components/EarthquakeInsights.tsx";
import { EarthquakePagination } from "./components/EarthquakePagination.tsx";
import { EarthquakeTable } from "./components/EarthquakeTable.tsx";
import { SeverityReferenceTable } from "./components/SeverityReferenceTable.tsx";
import { UsgsSyncButton } from "./components/UsgsSyncButton.tsx";

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
  const [timezone, setTimezone] = useState<TimezoneMode>(() => getStoredTimezone());
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(ALL_COUNTRIES);
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

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchPage(buildEarthquakeQuery(filters, page, DEFAULT_PAGE_SIZE), undefined, controller.signal)
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
  }, [filters, page, refreshKey]);

  // Chart aggregates over all events in the selected time window, not only the current table page.
  useEffect(() => {
    const controller = new AbortController();
    fetchPage(buildEarthquakeQuery(filters, 1, CHART_PAGE_SIZE), undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setChartItems(result.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setChartItems([]);
      });
    return () => controller.abort();
  }, [filters, refreshKey]);

  const countries = useMemo(() => countriesFromItems(chartItems), [chartItems]);
  const chartFiltered = useMemo(
    () => filterItemsByCountry(chartItems, selectedCountry),
    [chartItems, selectedCountry],
  );
  const visibleItems = useMemo(() => filterItemsByCountry(items, selectedCountry), [items, selectedCountry]);
  const rows = useMemo(() => visibleItems.map((item) => formatEventRow(item, timezone)), [visibleItems, timezone]);
  const viewState = deriveViewState({ loading, error, data: rows });
  const insights = useEarthquakeInsights(mapRangeToInterval(appliedForm.range), refreshKey);

  useEffect(() => {
    if (selectedCountry !== ALL_COUNTRIES && !countries.includes(selectedCountry)) {
      setSelectedCountry(ALL_COUNTRIES);
    }
  }, [countries, selectedCountry]);

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

  const handleTimezoneChange = () => {
    const next: TimezoneMode = timezone === "UTC" ? "UTC+7" : "UTC";
    setStoredTimezone(next);
    setTimezone(next);
  };

  const handleRetry = () => {
    setRefreshKey((key) => key + 1);
    setSelectedId(null);
  };

  // RD-14: sau khi BE xác nhận ghi dữ liệu, refresh cùng nguồn với nút "Tải lại".
  const handleSynced = useCallback(() => {
    setRefreshKey((key) => key + 1);
    setSelectedId(null);
  }, []);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <section className="eq-page">
      <header className="eq-page__heading">
        <h1 className="eq-page__title">Danh mục Động đất</h1>
        <div className="eq-page__actions">
          <button className="ds-button ds-button-secondary" onClick={handleTimezoneChange} type="button">
            {timezone === "UTC" ? "Hiện UTC" : "Hiện UTC+7"}
          </button>
          <button className="ds-button ds-button-secondary" onClick={handleRetry} type="button">
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
          <UsgsSyncButton onSynced={handleSynced} />
        </div>
      </header>

      <EarthquakeFilterBar value={form} onChange={handleFilterChange} onApply={handleApplyFilters} />

      <EarthquakeInsights
        statistics={insights.statistics}
        items={chartFiltered}
        countries={countries}
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
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
