import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import {
  ClusterLayer,
  DEFAULT_MAP_FILTERS,
  EarthquakeMarkerLayer,
  formatCoordinate,
  MapFilterPanel,
  MapLegend,
  normalizeClusters,
  SeismicMap,
  timeRangeBounds,
  toMapEarthquake,
  type MapCluster,
  type MapEarthquake,
  type MapFilters,
  type MapViewState,
} from "../../components/map";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/AsyncState";
import { useDatabaseResetFromEvent } from "../../hooks/useDatabaseReset";
import { useSSE } from "../../hooks/useSSE";
import {
  getClustersOptional,
  getEarthquakes,
  getPatterns,
} from "../../services/earthquake-api";

const VIETNAM_CENTER: [number, number] = [16.0544, 108.2022];
const DEFAULT_ZOOM = 5;

export const MonitoringMapPage: React.FC = () => {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);
  const [viewport, setViewport] = useState<MapViewState>({
    latitude: VIETNAM_CENTER[0],
    longitude: VIETNAM_CENTER[1],
    zoom: DEFAULT_ZOOM,
  });

  const [earthquakes, setEarthquakes] = useState<MapEarthquake[]>([]);
  const [clusters, setClusters] = useState<MapCluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Lắng nghe SSE và sự kiện xoá database
  const sse = useSSE();
  const resetInfo = useDatabaseResetFromEvent(sse.data);

  const loadData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    const bounds = timeRangeBounds(filters.timeRange);

    try {
      // 1. Tải danh sách động đất theo bộ lọc
      const eqPromise = getEarthquakes(
        {
          limit: 500,
          min_magnitude: filters.minMagnitude > 0 ? filters.minMagnitude : undefined,
          start_time: bounds.start,
          end_time: bounds.end,
        },
        controller.signal
      );

      // 2. Tải cụm DBSCAN (thử endpoint /clusters trước, nếu 404 fallback /patterns)
      const clusterPromise = getClustersOptional(controller.signal).then(async (res) => {
        if (!res.unavailable && res.data) {
          return normalizeClusters(res.data);
        }
        // Fallback đọc clustering_summary từ /patterns
        try {
          const pat = await getPatterns(controller.signal);
          return normalizeClusters(pat);
        } catch {
          return [];
        }
      });

      const [eqRes, clusterList] = await Promise.all([eqPromise, clusterPromise]);

      if (eqRes.success && Array.isArray(eqRes.data)) {
        setEarthquakes(eqRes.data.map(toMapEarthquake));
      } else {
        setEarthquakes([]);
      }

      setClusters(clusterList);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu bản đồ");
    } finally {
      setLoading(false);
    }
  }, [filters.minMagnitude, filters.timeRange]);

  // Nạp lại khi bộ lọc đổi hoặc có tín hiệu refresh sau database reset
  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData, resetInfo.refreshVersion]);

  // CSDL vừa bị xoá (Demo Bước 2/3) -> reset state
  useEffect(() => {
    if (resetInfo.isCleared) {
      setEarthquakes([]);
      setClusters([]);
    }
  }, [resetInfo.isCleared]);

  const handleViewportChange = useCallback((view: MapViewState) => {
    setViewport(view);
  }, []);

  const visibleEarthquakes = useMemo(() => {
    return earthquakes.filter((eq) => eq.magnitude >= filters.minMagnitude);
  }, [earthquakes, filters.minMagnitude]);

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden" data-testid="monitoring-map-page">
      {/* Banner thông báo CSDL bị xoá trống (Demo Bước 2) */}
      {resetInfo.isCleared && (
        <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2 transform rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 shadow-2xl backdrop-blur-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>CSDL đã bị xoá trống (Demo Bước 2). Bản đồ chuyển sang trạng thái trống.</span>
        </div>
      )}

      {/* Lớp bản đồ Leaflet */}
      <SeismicMap
        center={VIETNAM_CENTER}
        zoom={DEFAULT_ZOOM}
        onViewportChange={handleViewportChange}
        className="h-full w-full"
      >
        <EarthquakeMarkerLayer events={visibleEarthquakes} />
        <ClusterLayer clusters={clusters} visible={filters.showClusters} />
      </SeismicMap>

      {/* Bảng điều khiển bộ lọc (Góc dưới bên trái) */}
      <div className="absolute bottom-6 left-6 z-[900] w-80">
        <MapFilterPanel
          filters={filters}
          onChange={setFilters}
          earthquakeCount={visibleEarthquakes.length}
          clusterCount={clusters.length}
        />
      </div>

      {/* Chú giải bản đồ (Góc trên bên phải) */}
      <div className="absolute top-6 right-6 z-[900] w-64">
        <MapLegend defaultOpen={false} />
      </div>

      {/* Trạng thái HUD Tọa độ & Zoom thật (Góc dưới bên phải) */}
      <div className="absolute bottom-6 right-6 z-[900] hidden sm:flex items-center space-x-4 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-mono">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[10px]">TỌA ĐỘ TÂM (WGS84)</span>
          <span className="text-slate-200 font-semibold" data-testid="map-hud-coordinates">
            {formatCoordinate(viewport.latitude, viewport.longitude)}
          </span>
        </div>
        <div className="h-6 w-px bg-slate-800" />
        <div className="flex flex-col">
          <span className="text-slate-500 text-[10px]">MỨC ZOOM</span>
          <span className="text-cyan-400 font-semibold" data-testid="map-hud-zoom">
            Cấp {viewport.zoom}
          </span>
        </div>
      </div>

      {/* Overlay khi tải hoặc lỗi hoặc trống */}
      {loading && earthquakes.length === 0 && (
        <div className="absolute inset-0 z-[800] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <LoadingState label="Đang nạp dữ liệu động đất & cụm…" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[800] flex items-center justify-center bg-slate-950/70 p-4">
          <ErrorState message={error} onRetry={loadData} />
        </div>
      )}

      {!loading && !error && visibleEarthquakes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[700] flex items-center justify-center">
          <div className="pointer-events-auto rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md max-w-sm text-center">
            <EmptyState
              title="Không có sự kiện động đất"
              message="Không tìm thấy sự kiện nào khớp với bộ lọc độ lớn hoặc khoảng thời gian hiện tại."
            >
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_MAP_FILTERS)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại bộ lọc
              </button>
            </EmptyState>
          </div>
        </div>
      )}
    </div>
  );
};
