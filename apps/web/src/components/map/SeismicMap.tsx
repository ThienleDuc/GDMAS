import React, { useEffect } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { MapViewState } from "../../lib/transforms/map-types.ts";

interface SeismicMapProps {
  center: [number, number];
  zoom: number;
  focus: [number, number] | null;
  onViewportChange: (view: MapViewState) => void;
  onTileError: () => void;
  children?: React.ReactNode;
}

// Dev: cùng origin qua Vite proxy `/tile` (tránh chặn CDN ở client).
// Production: URL tuyệt đối như cũ (không có proxy khi build tĩnh).
const TILE_URL = import.meta.env.DEV
  ? "/tile/dark_all/{z}/{x}/{y}{r}.png"
  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

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

/** Đưa khung nhìn tới sự kiện thật đầu tiên khi có dữ liệu (chỉ khi focus đổi). */
function FocusSync({ focus }: { focus: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView(focus, map.getZoom(), { animate: false });
    }
  }, [map, focus]);
  return null;
}

/** Nền bản đồ Dark Mode + tile CARTO (nguồn mạng ngoài duy nhất). */
export function SeismicMap({
  center,
  zoom,
  focus,
  onViewportChange,
  onTileError,
  children,
}: SeismicMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      preferCanvas
      className="gm-map__canvas"
      style={{ background: "#0b1120" }}
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} eventHandlers={{ tileerror: onTileError }} />
      <ZoomControl position="topright" />
      <ViewportReporter onViewportChange={onViewportChange} />
      <FocusSync focus={focus} />
      {children}
    </MapContainer>
  );
}
