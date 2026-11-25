import { useEffect, useState } from "react";
import type { MapFilters, TimeRangePreset } from "../../lib/transforms/map-types.ts";

interface MapControlsPanelProps {
  filters: MapFilters;
  count: number;
  /** Áp dụng khoảng độ lớn khi bấm nút "Lọc" — không tự refetch lúc kéo slider. */
  onApply: (minMagnitude: number, maxMagnitude: number) => void;
  /** Giữ optional để caller cũ không vỡ chữ ký (I2). */
  onMagnitudeChange?: (value: number) => void;
  onTimeRangeChange?: (preset: TimeRangePreset) => void;
  onRefresh?: () => void;
}

/** Điều khiển nổi: khoảng độ lớn (min–max) + nút "Lọc"; bản đồ realtime không lọc thời gian. */
export function MapControlsPanel({
  filters,
  count,
  onApply,
}: MapControlsPanelProps) {
  const [draftMin, setDraftMin] = useState(filters.minMagnitude);
  const [draftMax, setDraftMax] = useState(filters.maxMagnitude ?? 10);

  useEffect(() => {
    setDraftMin(filters.minMagnitude);
    setDraftMax(filters.maxMagnitude ?? 10);
  }, [filters.minMagnitude, filters.maxMagnitude]);

  const changeMin = (value: number) => {
    setDraftMin(value);
    if (value > draftMax) setDraftMax(value);
  };

  const changeMax = (value: number) => {
    setDraftMax(value);
    if (value < draftMin) setDraftMin(value);
  };

  return (
    <div className="gm-map__controls">
      <div className="gm-map__control-row">
        <label htmlFor="gm-min-magnitude">Độ lớn tối thiểu</label>
        <input
          id="gm-min-magnitude"
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={draftMin}
          onChange={(event) => changeMin(Number(event.target.value))}
        />
        <span className="gm-map__control-value">M≥{draftMin.toFixed(1)}</span>
      </div>

      <div className="gm-map__control-row">
        <label htmlFor="gm-max-magnitude">Độ lớn tối đa</label>
        <input
          id="gm-max-magnitude"
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={draftMax}
          onChange={(event) => changeMax(Number(event.target.value))}
        />
        <span className="gm-map__control-value">M≤{draftMax.toFixed(1)}</span>
      </div>

      <div className="gm-map__control-row gm-map__control-row--footer">
        <span className="gm-map__count">{count} sự kiện</span>
        <button
          type="button"
          className="ds-button"
          onClick={() => onApply(draftMin, draftMax)}
        >
          Lọc
        </button>
      </div>
    </div>
  );
}
