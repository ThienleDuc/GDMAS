import React, { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { MapViewState } from "../../lib/transforms/map-types.ts";
import { resolveTileUrl, TILE_ATTRIBUTION } from "./tile-url.ts";
import { WorldFallbackLayer } from "./WorldFallbackLayer.tsx";

interface SeismicMapProps {
  center: [number, number];
  zoom: number;
  focus: [number, number] | null;
  onViewportChange: (view: MapViewState) => void;
  onTileError: () => void;
  /** Khi tile lỗi mới tải bản đồ thế giới local (tiết kiệm 173 KB lúc đầu). */
  tileFailed?: boolean;
  children?: React.ReactNode;
}

// Cùng origin ở mọi môi trường (Vite dev/preview proxy + nginx production) → tile OSM miễn phí.
// Có thể đổi nguồn qua VITE_MAP_TILE_URL nếu môi trường không proxy được `/tile`.
const TILE_URL = resolveTileUrl(import.meta.env);
/** Tile lỗi → ảnh trong suốt để lớp bản đồ thế giới local lộ ra (không có icon gãy). */
const TRANSPARENT_TILE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Báo toạ độ tâm/zoom thật ngay khi mount và mỗi lần pan/zoom. */
function ViewportReporter({
  onViewportChange,
}: Pick<SeismicMapProps, "onViewportChange">) {
  const map = useMap();
  const emit = React.useCallback(() => {
    const center = map.getCenter();
    onViewportChange({
      latitude: center.lat,
      longitude: center.lng,
      zoom: map.getZoom(),
    });
  }, [map, onViewportChange]);

  useEffect(() => {
    emit();
  }, [emit]);

  useMapEvents({ moveend: emit, zoomend: emit });
  return null;
}

/** Có lựa chọn cụ thể → focus sự kiện; không có → luôn hiển thị bản đồ thế giới. */
function FocusSync({ focus }: { focus: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView(focus, Math.max(map.getZoom(), 4), { animate: false });
    } else {
      map.fitWorld({ animate: false });
    }
  }, [map, focus]);
  return null;
}

/** Nền bản đồ sáng: tile OSM khi có mạng + GeoJSON local chỉ khi tile hỏng. */
export function SeismicMap({
  center,
  zoom,
  focus,
  onViewportChange,
  onTileError,
  tileFailed = false,
  children,
}: SeismicMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      preferCanvas
      className="gm-map__canvas"
      style={{ background: "#f8fafc" }}
    >
      <WorldFallbackLayer enabled={tileFailed} />
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        errorTileUrl={TRANSPARENT_TILE}
        // Chỉ tải tile khi pan/zoom kết thúc → bớt request chồng chéo, bản đồ mượt hơn.
        updateWhenIdle
        updateWhenZooming={false}
        keepBuffer={2}
        minZoom={2}
        maxZoom={18}
        eventHandlers={{ tileerror: onTileError }}
      />
      <ZoomControl position="topright" />
      <ViewportReporter onViewportChange={onViewportChange} />
      <FocusSync focus={focus} />
      {children}
    </MapContainer>
  );
}
