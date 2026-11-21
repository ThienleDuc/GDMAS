import { useEffect, useState } from "react";
import { timeRangeLabel } from "../../lib/transforms/map-data.ts";
import type { MapFilters, TimeRangePreset } from "../../lib/transforms/map-types.ts";

const PRESETS: ReadonlyArray<TimeRangePreset> = ["24h", "7d", "30d", "all"];
const DEBOUNCE_MS = 400;

interface MapControlsPanelProps {
  filters: MapFilters;
  count: number;
  onMagnitudeChange: (value: number) => void;
  onTimeRangeChange: (preset: TimeRangePreset) => void;
  onRefresh: () => void;
}

/** Điều khiển nổi: slider magnitude (debounce), khoảng thời gian, làm mới. */
export function MapControlsPanel({
  filters,
  count,
  onMagnitudeChange,
  onTimeRangeChange,
  onRefresh,
}: MapControlsPanelProps) {
  const [draftMagnitude, setDraftMagnitude] = useState(filters.minMagnitude);

  useEffect(() => {
    setDraftMagnitude(filters.minMagnitude);
  }, [filters.minMagnitude]);

  useEffect(() => {
    if (draftMagnitude === filters.minMagnitude) return;
    const timer = window.setTimeout(() => onMagnitudeChange(draftMagnitude), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draftMagnitude, filters.minMagnitude, onMagnitudeChange]);

  return (
    <div className="gm-map__controls">
      <div className="gm-map__control-row">
        <label htmlFor="gm-min-magnitude">Độ lớn tối thiểu</label>
        <input
          id="gm-min-magnitude"
          type="range"
          min={0}
          max={9}
          step={0.1}
          value={draftMagnitude}
          onChange={(event) => setDraftMagnitude(Number(event.target.value))}
        />
        <span className="gm-map__control-value">Độ lớn {draftMagnitude.toFixed(1)}</span>
      </div>

      <div className="gm-map__control-row gm-map__control-row--stack">
        <span className="gm-map__control-label">Khoảng thời gian</span>
        <div className="gm-map__presets">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`gm-map__preset ${filters.timeRange === preset ? "is-active" : ""}`}
              aria-pressed={filters.timeRange === preset}
              onClick={() => onTimeRangeChange(preset)}
            >
              {timeRangeLabel(preset)}
            </button>
          ))}
        </div>
      </div>

      <div className="gm-map__control-row gm-map__control-row--footer">
        <span className="gm-map__count">{count} sự kiện</span>
        <button type="button" className="ds-button" onClick={onRefresh}>
          Làm mới
        </button>
      </div>
    </div>
  );
}
