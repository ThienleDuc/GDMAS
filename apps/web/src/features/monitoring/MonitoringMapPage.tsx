import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EarthquakeMarkerLayer,
  EventListPanel,
  MapEmptyOverlay,
  MapLegend,
  MapViewportHud,
  SeismicMap,
} from "../../components/map/index.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../earthquakes/region-filter.ts";
import { useCatalogSelection } from "../earthquakes/useCatalogSelection.ts";
import { toMapEarthquake } from "../../lib/transforms/map-data.ts";
import {
  DEFAULT_MAP_FILTERS,
  type MapEarthquake,
  type MapFilters,
  type MapViewState,
} from "../../lib/transforms/map-types.ts";
import { getEarthquakes } from "../../services/earthquake-api.ts";
import {
  buildEarthquakeQuery,
  deriveMapState,
  filterMapEvents,
  latestEventInRegion,
  resolveMapMinMagnitude,
  sseRefreshKey,
} from "./monitoring-view.ts";
import { useSseMarkers } from "./sse-context.ts";

/** Mặc định hiển thị toàn thế giới; HUD luôn lấy toạ độ thật từ map qua `onViewportChange`. */
const INITIAL_VIEW: MapViewState = { latitude: 15, longitude: 0, zoom: 2 };
/** Ngưỡng độ lớn lấy từ BACKFILL_MIN_MAGNITUDE (docker-compose → VITE_MAP_MIN_MAGNITUDE). */
const MAP_MIN_MAGNITUDE = resolveMapMinMagnitude(import.meta.env);
/** Lưới an toàn: nếu SSE nhỡ event vẫn làm mới dữ liệu đúng chu kỳ 5 phút. */
const REALTIME_REFRESH_MS = 5 * 60 * 1000;

export const MonitoringMapPage: React.FC = () => {
  const [filters] = useState<MapFilters>({
    ...DEFAULT_MAP_FILTERS,
    minMagnitude: MAP_MIN_MAGNITUDE,
    maxMagnitude: undefined,
  });
  const [view, setView] = useState<MapViewState>(INITIAL_VIEW);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<MapEarthquake[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tileError, setTileError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Nguồn duy nhất của lựa chọn quốc gia/khu vực là combobox trên header (qua URL).
  const { country, region } = useCatalogSelection();
  const hasSelection = country !== ALL_COUNTRIES || region !== ALL_REGIONS;

  // Bản đồ realtime: không gửi start_time/end_time. country/region được đẩy xuống BE
  // để lọc đúng toàn bộ dữ liệu (FE chỉ lọc lại như một lớp an toàn).
  const params = useMemo(
    () => buildEarthquakeQuery(filters, null, { country, region, realtime: true }),
    [filters, country, region],
  );

  const load = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await getEarthquakes(params, controller.signal);
      // Luôn thay thế marker bằng kết quả API đã lọc theo country/region hiện tại.
      setEvents(response.data.map(toMapEarthquake));
      setSelectedEventId(null);
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [params]);

  // Một nguồn làm mới duy nhất: mọi dữ liệu mới đều fetch lại theo `params` (đã có country/region).
  useEffect(() => {
    void load(true);
    return () => abortRef.current?.abort();
  }, [load, refreshVersion]);

  // SSE dùng lại kết nối duy nhất của shell — không EventSource mới.
  const sse = useSseMarkers();
  const lastPayload = sse?.data ?? null;
  const refreshKey = sseRefreshKey(lastPayload);
  const lastRefreshKey = useRef<string | null>(null);
  useEffect(() => {
    if (!refreshKey || refreshKey === lastRefreshKey.current) return;
    lastRefreshKey.current = refreshKey;
    setRefreshVersion((value) => value + 1);
  }, [refreshKey]);

  // Lưới an toàn: định kỳ 5 phút làm mới ngay cả khi SSE nhỡ/mất event.
  useEffect(() => {
    const timer = window.setInterval(() => setRefreshVersion((value) => value + 1), REALTIME_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const handleViewportChange = useCallback((next: MapViewState) => {
    setView((prev) =>
      prev.latitude === next.latitude && prev.longitude === next.longitude && prev.zoom === next.zoom
        ? prev
        : next,
    );
  }, []);

  const handleEventSelect = useCallback((event: MapEarthquake) => {
    setSelectedEventId(event.sourceEventId || String(event.id));
    setFocus([event.latitude, event.longitude]);
  }, []);

  const visibleEvents = useMemo(
    () => latestEventInRegion(filterMapEvents(events, filters), country, region),
    [events, filters, country, region],
  );
  // Khi có lựa chọn, focus vào đúng trận mới nhất đã lọc (không phải response thô).
  useEffect(() => {
    if (!hasSelection || visibleEvents.length === 0) {
      setFocus(null);
      return;
    }
    setFocus([visibleEvents[0].latitude, visibleEvents[0].longitude]);
  }, [hasSelection, visibleEvents]);
  const phase = deriveMapState({ loading, error, events: visibleEvents });
  const handleTileError = useCallback(() => setTileError(true), []);
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
          {panelOpen ? "Ẩn danh sách" : "Danh sách sự kiện"}
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
          <EventListPanel
            events={visibleEvents}
            selectedId={selectedEventId}
            onSelect={handleEventSelect}
          />
        </aside>

        <div className="gm-map">
          <SeismicMap
            center={[view.latitude, view.longitude]}
            zoom={view.zoom}
            focus={focus}
            onViewportChange={handleViewportChange}
            onTileError={handleTileError}
            tileFailed={tileError}
          >
            {visibleEvents.length > 0 && <EarthquakeMarkerLayer events={visibleEvents} />}
          </SeismicMap>
          <MapViewportHud view={view} />
          <MapLegend />

          {tileError && (
            <div className="gm-map__tile-warning" role="status">
              Không tải được tile — đang dùng bản đồ thế giới local, marker vẫn đúng vị trí.
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
          {phase === "empty" && <MapEmptyOverlay hasEvents={events.length > 0} />}
        </div>
      </div>
    </section>
  );
};
