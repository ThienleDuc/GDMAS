import React, { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import type { MapViewState } from "./types";

const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface ViewportWatcherProps {
  onChange: (view: MapViewState) => void;
}

/** Báo toạ độ + zoom thật mỗi khi người dùng pan/zoom (HUD thay số tĩnh cũ). */
const ViewportWatcher: React.FC<ViewportWatcherProps> = ({ onChange }) => {
  const map = useMap();

  const emit = useCallback(() => {
    const center = map.getCenter();
    onChange({ latitude: center.lat, longitude: center.lng, zoom: map.getZoom() });
  }, [map, onChange]);

  useMapEvents({ moveend: emit, zoomend: emit });

  useEffect(() => {
    emit();
  }, [emit]);

  return null;
};

interface SeismicMapProps {
  center: [number, number];
  zoom: number;
  onViewportChange?: (view: MapViewState) => void;
  /** Lớp marker cụm/sự kiện được render bên trong MapContainer. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Khung bản đồ nền Dark Mode (CARTO dark_all) cho Terminal 7.
 * Tile là nguồn mạng ngoài duy nhất — khi lỗi tile, marker vẫn hiển thị trên nền tối
 * kèm cảnh báo (không chặn tương tác).
 */
export const SeismicMap: React.FC<SeismicMapProps> = ({
  center,
  zoom,
  onViewportChange,
  children,
  className = "",
}) => {
  const [tileError, setTileError] = useState(false);

  return (
    <div className={`relative h-full w-full bg-slate-950 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        preferCanvas
        worldCopyJump
        className="h-full w-full bg-slate-950"
      >
        <TileLayer
          url={DARK_TILE_URL}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <ZoomControl position="bottomright" />
        {onViewportChange ? <ViewportWatcher onChange={onViewportChange} /> : null}
        {children}
      </MapContainer>

      {tileError ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] mx-auto w-fit rounded-md border border-amber-500/40 bg-slate-900/90 px-3 py-1.5 text-[11px] text-amber-200 shadow-lg"
        >
          Không tải được tile bản đồ nền — marker vẫn hiển thị theo toạ độ WGS84.
        </div>
      ) : null}
    </div>
  );
};
