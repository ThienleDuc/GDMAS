import { centerLabel } from "../../features/monitoring/monitoring-view.ts";
import type { MapViewState } from "../../lib/transforms/map-types.ts";

/** HUD hiển thị toạ độ tâm/zoom thật do Leaflet báo qua `moveend`/`zoomend`. */
export function MapViewportHud({ view }: { view: MapViewState }) {
  return (
    <div className="gm-map__hud" aria-live="polite">
      <span className="gm-map__hud-label">Tâm bản đồ</span>
      <span className="gm-map__hud-value">{centerLabel(view)}</span>
      <span className="gm-map__hud-zoom">Zoom {view.zoom}</span>
    </div>
  );
}
