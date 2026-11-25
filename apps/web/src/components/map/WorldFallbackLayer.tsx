/**
 * Bản đồ thế giới DỰ PHÒNG, chạy offline 100% (I7): dữ liệu GeoJSON Natural Earth
 * (public domain) đóng gói tại `public/world-countries.geo.json`.
 *
 * TỐI ƯU: chỉ tải khi tile thật sự hỏng (`enabled`), và cache promise ở module scope
 * để vào lại trang không tải lại 173 KB. Khi tile OSM chạy tốt thì không tốn mạng/CPU.
 * Lớp nằm dưới tilePane (z-index 150 < 200) nên tile có thì phủ lên.
 */

import React, { useEffect, useState } from "react";
import { GeoJSON, useMap } from "react-leaflet";

const WORLD_PANE = "worldFallbackPane";
const WORLD_GEOJSON_URL = `${import.meta.env.BASE_URL}world-countries.geo.json`;

type GeoJsonData = React.ComponentProps<typeof GeoJSON>["data"];

let cachedWorld: Promise<GeoJsonData> | null = null;

function loadWorld(): Promise<GeoJsonData> {
  if (!cachedWorld) {
    cachedWorld = fetch(WORLD_GEOJSON_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`Không tải được world GeoJSON: ${response.status}`);
        return response.json() as Promise<GeoJsonData>;
      })
      .catch((error) => {
        cachedWorld = null; // cho phép thử lại lần sau
        throw error;
      });
  }
  return cachedWorld;
}

interface WorldFallbackLayerProps {
  /** Chỉ tải khi tile báo lỗi — mặc định tắt để không tốn 173 KB lúc vào trang. */
  enabled?: boolean;
}

export function WorldFallbackLayer({ enabled = false }: WorldFallbackLayerProps): React.ReactElement | null {
  const map = useMap();
  const [paneReady, setPaneReady] = useState(false);
  const [worldData, setWorldData] = useState<GeoJsonData | null>(null);

  useEffect(() => {
    if (!map.getPane(WORLD_PANE)) {
      const pane = map.createPane(WORLD_PANE);
      pane.style.zIndex = "150"; // dưới tilePane (200) để tile khi có vẫn phủ lên
      pane.style.pointerEvents = "none";
    }
    setPaneReady(true);
  }, [map]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadWorld()
      .then((data) => {
        if (active) setWorldData(data);
      })
      .catch(() => {
        // Giữ nền sáng + marker; không làm crash trang (I5/I7).
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled || !paneReady || !worldData) return null;

  return (
    <GeoJSON
      data={worldData}
      pane={WORLD_PANE}
      interactive={false}
      style={{ color: "#94a3b8", weight: 0.5, fillColor: "#e2e8f0", fillOpacity: 1 }}
    />
  );
}
