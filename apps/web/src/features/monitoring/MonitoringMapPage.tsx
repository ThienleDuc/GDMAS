import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EarthquakeMarkerLayer,
  MapControlsPanel,
  MapEmptyOverlay,
  MapLegend,
  MapRegionPanel,
  MapViewportHud,
  SeismicMap,
} from "../../components/map/index.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import {
  ALL_REGIONS,
  countriesFromPlaces,
  filterByCountryAndRegion,
} from "../earthquakes/region-filter.ts";
import { useCatalogSelection } from "../earthquakes/useCatalogSelection.ts";
import { toMapEarthquake, viewportToBbox } from "../../lib/transforms/map-data.ts";
import {
  DEFAULT_MAP_FILTERS,
  type MapEarthquake,
  type MapFilters,
  type MapViewState,
} from "../../lib/transforms/map-types.ts";
import { getEarthquakes } from "../../services/earthquake-api.ts";
import {
  applySseEvent,
  buildEarthquakeQuery,
  deriveMapState,
  filterMapEvents,
} from "./monitoring-view.ts";
import { useSseMarkers } from "./sse-context.ts";
import { fetchRegionClusters } from "./mock-region-clusters.ts";
import type { RegionClusterRow } from "./region-clusters.ts";

/** Khung nhìn khởi tạo; HUD luôn lấy toạ độ thật từ map qua `onViewportChange`. */
const INITIAL_VIEW: MapViewState = { latitude: 16.0544, longitude: 108.2022, zoom: 5 };
const VIEW_SPAN_LAT = 10;
const VIEW_SPAN_LON = 15;

export const MonitoringMapPage: React.FC = () => {
  const [filters, setFilters] = useState<MapFilters>({ ...DEFAULT_MAP_FILTERS });
  const [view, setView] = useState<MapViewState>(INITIAL_VIEW);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [events, setEvents] = useState<MapEarthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tileError, setTileError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [regionClusters, setRegionClusters] = useState<RegionClusterRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { country, region, setRegion, setSelection } = useCatalogSelection();

  // Panel khu vực dùng cụm thật từ GET /api/v1/clusters (GAP-05 — không mock).
  useEffect(() => {
    const controller = new AbortController();
    void fetchRegionClusters(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setRegionClusters(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRegionClusters([]);
      });
    return () => controller.abort();
  }, []);

  const bbox = useMemo(
    () =>
      viewportToBbox({
        north: view.latitude + VIEW_SPAN_LAT,
        south: view.latitude - VIEW_SPAN_LAT,
        east: view.longitude + VIEW_SPAN_LON,
        west: view.longitude - VIEW_SPAN_LON,
      }),
    [view],
  );

  // Chọn quốc gia cụ thể → bỏ bbox để không lọt mất sự kiện của quốc gia đó.
  const params = useMemo(
    () => buildEarthquakeQuery(filters, country === ALL_COUNTRIES ? bbox : null),
    [filters, bbox, country],
  );

  const countries = useMemo(
    () =>
      [...new Set([...countriesFromPlaces(events), ...regionClusters.map((item) => item.country)])].sort(
        (left, right) => left.localeCompare(right),
      ),
    [events, regionClusters],
  );

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await getEarthquakes(params, controller.signal);
      setEvents(response.data.map(toMapEarthquake));
      setFocus((prev) =>
        prev ?? (response.data.length > 0
          ? [response.data[0].latitude, response.data[0].longitude]
          : null),
      );
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  // SSE dùng lại kết nối duy nhất của shell — không EventSource mới.
  const sse = useSseMarkers();
  const lastPayload = sse?.data ?? null;
  useEffect(() => {
    if (!lastPayload) return;
    setEvents((prev) => applySseEvent(prev, lastPayload));
  }, [lastPayload]);

  const handleViewportChange = useCallback((next: MapViewState) => {
    setView((prev) =>
      prev.latitude === next.latitude && prev.longitude === next.longitude && prev.zoom === next.zoom
        ? prev
        : next,
    );
  }, []);

  const handleMagnitudeChange = useCallback((minMagnitude: number) => {
    setFilters((prev) => ({ ...prev, minMagnitude }));
  }, []);

  const handleTimeRangeChange = useCallback((timeRange: MapFilters["timeRange"]) => {
    setFilters((prev) => ({ ...prev, timeRange }));
  }, []);

  const handleCountryChange = useCallback(
    (value: string) => setSelection(value, ALL_REGIONS),
    [setSelection],
  );

  const handleClusterSelect = useCallback(
    (cluster: RegionClusterRow) => setSelection(cluster.country, cluster.region),
    [setSelection],
  );

  const visibleEvents = useMemo(
    () => filterByCountryAndRegion(filterMapEvents(events, filters), country, region),
    [events, filters, country, region],
  );
  const phase = deriveMapState({ loading, error, events: visibleEvents });
  const handleTileError = useCallback(() => setTileError(true), []);
  const handleRefresh = useCallback(() => void load(), [load]);
  const handleRetry = useCallback(() => void load(), [load]);

  return (
    <section className="gm-page">
      <header className="gm-page__heading">
        <div>
          <h1 className="gm-page__title">Bản đồ Giám sát</h1>
          <p className="gm-page__subtitle">Sự kiện địa chấn thời gian thực · tọa độ địa lý · giờ quốc tế</p>
        </div>
      </header>

      <div className="gm-workspace">
        <button
          type="button"
          className="gm-panels-toggle"
          aria-expanded={panelOpen}
          aria-controls="gm-filter-sidebar"
          onClick={() => setPanelOpen((open) => !open)}
        >
          {panelOpen ? "Ẩn bộ lọc" : "Bộ lọc & khu vực"}
        </button>

        <aside
          id="gm-filter-sidebar"
          className={`gm-sidebar ${panelOpen ? "is-open" : ""}`}
        >
          <button
            type="button"
            className="gm-sidebar__close"
            aria-label="Đóng bộ lọc"
            onClick={() => setPanelOpen(false)}
          >
            ×
          </button>
          <MapControlsPanel
            filters={filters}
            count={visibleEvents.length}
            onMagnitudeChange={handleMagnitudeChange}
            onTimeRangeChange={handleTimeRangeChange}
            onRefresh={handleRefresh}
          />
          <MapRegionPanel
            countries={countries}
            clusters={regionClusters}
            country={country}
            region={region}
            onCountryChange={handleCountryChange}
            onRegionChange={setRegion}
            onClusterSelect={handleClusterSelect}
          />
        </aside>

        <div className="gm-map">
          <SeismicMap
            center={[view.latitude, view.longitude]}
            zoom={view.zoom}
            focus={focus}
            onViewportChange={handleViewportChange}
            onTileError={handleTileError}
          >
            {visibleEvents.length > 0 && <EarthquakeMarkerLayer events={visibleEvents} />}
          </SeismicMap>
          <MapViewportHud view={view} />
          <MapLegend />

        {tileError && (
          <div className="gm-map__tile-warning" role="status">
            Không tải được tile bản đồ — marker vẫn hiển thị.
          </div>
        )}
        {phase === "loading" && (
          <div className="gm-map__notice" role="status">
            Đang nạp sự kiện…
          </div>
        )}
        {phase === "error" && (
          <div className="gm-map__notice gm-map__notice--error" role="alert">
            Không nạp được dữ liệu.{" "}
            <button type="button" onClick={handleRetry}>
              Thử lại
            </button>
          </div>
        )}
        {phase === "empty" && <MapEmptyOverlay />}
        </div>
      </div>
    </section>
  );
};
