import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { EarthquakeItem } from "../../contracts/earthquake.ts";
import { ApiError } from "../../lib/api-client.ts";
import {
  getStoredTimezone,
  setStoredTimezone,
  type TimezoneMode,
} from "../../lib/formatters.ts";
import {
  buildEarthquakeQuery,
  DEFAULT_PAGE_SIZE,
  deriveViewState,
  fetchPage,
  formatEventRow,
  RANGE_PRESETS,
  type DateRangePreset,
  type EarthquakeFilters,
} from "./earthquake-view.ts";

interface FilterForm {
  range: DateRangePreset;
  minMagnitude: string;
  maxMagnitude: string;
  minDepth: string;
  maxDepth: string;
}

const INITIAL_FILTERS: FilterForm = {
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
  const [form, setForm] = useState<FilterForm>(INITIAL_FILTERS);
  const [debouncedForm, setDebouncedForm] = useState<FilterForm>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EarthquakeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [timezone, setTimezone] = useState<TimezoneMode>(() => getStoredTimezone());
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce bộ lọc người dùng nhập; đổi filter luôn quay về trang 1.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedForm(form), 300);
    return () => clearTimeout(timer);
  }, [form]);

  const handleFilterChange = useCallback((key: keyof FilterForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const filters = useMemo<EarthquakeFilters>(
    () => ({
      range: debouncedForm.range,
      minMagnitude: toOptionalNumber(debouncedForm.minMagnitude),
      maxMagnitude: toOptionalNumber(debouncedForm.maxMagnitude),
      minDepth: toOptionalNumber(debouncedForm.minDepth),
      maxDepth: toOptionalNumber(debouncedForm.maxDepth),
      sortBy: "event_time",
      order: "desc",
    }),
    [debouncedForm],
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

  const rows = useMemo(() => items.map((item) => formatEventRow(item, timezone)), [items, timezone]);
  const viewState = deriveViewState({ loading, error, data: rows });

  const handleTimezoneChange = () => {
    const next: TimezoneMode = timezone === "UTC" ? "UTC+7" : "UTC";
    setStoredTimezone(next);
    setTimezone(next);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Danh mục Động đất</h1>
          <p className="text-caption">
            Dữ liệu thật từ <code className="font-mono">GET /api/v1/earthquakes</code> · chu kỳ cập nhật 5 phút
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="ds-button ds-button-secondary" onClick={handleTimezoneChange} type="button">
            {timezone === "UTC" ? "Hiện UTC" : "Hiện UTC+7"}
          </button>
          <button
            className="ds-button ds-button-secondary"
            onClick={() => setRefreshKey((key) => key + 1)}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        </div>
      </header>

      <div className="dashboard-card flex flex-wrap items-end gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="ds-form-label">Khoảng thời gian</span>
          <select
            className="ds-select"
            value={form.range}
            onChange={(event) => handleFilterChange("range", event.target.value)}
          >
            {RANGE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ds-form-label">Độ lớn từ</span>
          <input className="ds-input" inputMode="decimal" value={form.minMagnitude} placeholder="VD 4.5"
            onChange={(event) => handleFilterChange("minMagnitude", event.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ds-form-label">Độ lớn đến</span>
          <input className="ds-input" inputMode="decimal" value={form.maxMagnitude} placeholder="VD 7.0"
            onChange={(event) => handleFilterChange("maxMagnitude", event.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ds-form-label">Độ sâu từ (km)</span>
          <input className="ds-input" inputMode="decimal" value={form.minDepth} placeholder="VD 10"
            onChange={(event) => handleFilterChange("minDepth", event.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ds-form-label">Độ sâu đến (km)</span>
          <input className="ds-input" inputMode="decimal" value={form.maxDepth} placeholder="VD 100"
            onChange={(event) => handleFilterChange("maxDepth", event.target.value)} />
        </label>
      </div>

      {viewState === "loading" && (
        <div className="dashboard-card space-y-3 p-6" aria-busy="true">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {viewState === "error" && (
        <div className="dashboard-card flex flex-col items-center gap-3 p-10 text-center" role="alert">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="font-semibold">Không thể tải danh mục động đất</p>
          <p className="text-caption">{error?.message ?? "Lỗi không xác định."}</p>
          <button className="ds-button ds-button-primary" onClick={() => setRefreshKey((key) => key + 1)} type="button">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        </div>
      )}

      {viewState === "empty" && (
        <div className="dashboard-card p-10 text-center">
          <p className="font-semibold">Không có sự kiện nào trong khoảng đã chọn</p>
          <p className="text-caption">
            Cơ sở dữ liệu có thể đang rỗng sau khi xóa trống. Giao diện không dùng dữ liệu mẫu thay thế.
          </p>
        </div>
      )}

      {viewState === "ready" && (
        <>
          <div className="ds-table-wrapper">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Thời gian ({timezone})</th>
                  <th>Địa điểm</th>
                  <th className="numeric">Độ lớn</th>
                  <th className="numeric">Độ sâu (km)</th>
                  <th>Tọa độ WGS84</th>
                  <th>Mã nguồn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.time}</td>
                    <td>{row.place}</td>
                    <td className="numeric">
                      <span className={`ds-badge ${row.magnitude >= 5 ? "ds-badge-error" : "ds-badge-info"}`}>
                        {row.magnitude.toFixed(1)}
                      </span>
                    </td>
                    <td className="numeric">{row.depthKm.toFixed(1)}</td>
                    <td>{row.coordinates}</td>
                    <td>{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-caption">
              {total} sự kiện · Trang {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                className="ds-button ds-button-secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
                Trước
              </button>
              <button
                className="ds-button ds-button-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Sau
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
