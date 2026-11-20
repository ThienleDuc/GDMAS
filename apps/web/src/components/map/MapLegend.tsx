import { magnitudeLevelLabel } from "../../features/monitoring/monitoring-view.ts";
import { magnitudeToColor } from "../../lib/transforms/map-data.ts";

/** Chú giải 4 mức màu của marker — màu lấy từ `magnitudeToColor`, không hardcode. */
const LEVELS = [3.5, 4.5, 5.5, 6.5];

export function MapLegend() {
  return (
    <div className="gm-map__legend" aria-label="Chú giải mức độ động đất">
      <span className="gm-map__legend-title">Mức độ</span>
      {LEVELS.map((magnitude) => (
        <span className="gm-map__legend-item" key={magnitude}>
          <i
            className="gm-map__legend-dot"
            style={{ backgroundColor: magnitudeToColor(magnitude) }}
            aria-hidden="true"
          />
          {magnitudeLevelLabel(magnitude)}
        </span>
      ))}
    </div>
  );
}
