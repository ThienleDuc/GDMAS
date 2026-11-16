import React, { useEffect, useState } from "react";
import { Filter, Layers, RotateCcw } from "lucide-react";
import { DEFAULT_MAP_FILTERS, type MapFilters, type TimeRangePreset } from "./types";
import { timeRangeLabel } from "./map-data";

interface MapFilterPanelProps {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
  earthquakeCount?: number;
  clusterCount?: number;
  className?: string;
}

const TIME_PRESETS: TimeRangePreset[] = ["24h", "7d", "30d", "all"];

/**
 * Thanh điều khiển bộ lọc bản đồ:
 * - Slider Magnitude (0.0 - 9.0) có debounce 400ms để tránh spam request.
 * - Preset thời gian (24h, 7d, 30d, all).
 * - Toggle bật/tắt lớp cụm DBSCAN.
 * - Nút Reset về mặc định.
 */
export const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  filters,
  onChange,
  earthquakeCount,
  clusterCount,
  className = "",
}) => {
  // Local state cho slider để kéo mượt mà, debounce 400ms trước khi bắn ra ngoài
  const [sliderMag, setSliderMag] = useState<number>(filters.minMagnitude);

  useEffect(() => {
    setSliderMag(filters.minMagnitude);
  }, [filters.minMagnitude]);

  useEffect(() => {
    if (sliderMag === filters.minMagnitude) return;
    const timer = setTimeout(() => {
      onChange({ ...filters, minMagnitude: sliderMag });
    }, 400);
    return () => clearTimeout(timer);
  }, [sliderMag, filters, onChange]);

  const handleTimeChange = (preset: TimeRangePreset) => {
    onChange({ ...filters, timeRange: preset });
  };

  const handleClusterToggle = () => {
    onChange({ ...filters, showClusters: !filters.showClusters });
  };

  const handleReset = () => {
    setSliderMag(DEFAULT_MAP_FILTERS.minMagnitude);
    onChange(DEFAULT_MAP_FILTERS);
  };

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md ${className}`}
      data-testid="map-filter-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Bộ lọc bản đồ</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-white"
          title="Đặt lại bộ lọc về mặc định"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Đặt lại</span>
        </button>
      </div>

      {/* Magnitude Slider */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="magnitude-range" className="text-slate-300 font-medium">
            Độ lớn tối thiểu:
          </label>
          <span className="font-mono font-bold text-amber-400">≥ M {sliderMag.toFixed(1)}</span>
        </div>
        <input
          id="magnitude-range"
          type="range"
          min="0"
          max="8"
          step="0.1"
          value={sliderMag}
          onChange={(e) => setSliderMag(parseFloat(e.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
          <span>0.0</span>
          <span>2.5</span>
          <span>5.0</span>
          <span>8.0+</span>
        </div>
      </div>

      {/* Khoảng thời gian */}
      <div className="mt-4">
        <span className="text-xs font-medium text-slate-300">Khoảng thời gian:</span>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {TIME_PRESETS.map((preset) => {
            const active = filters.timeRange === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleTimeChange(preset)}
                className={`rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-all ${
                  active
                    ? "border border-cyan-500/50 bg-cyan-500/20 text-cyan-200"
                    : "border border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {timeRangeLabel(preset)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggle cụm DBSCAN */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <span className="text-xs text-slate-300">Lớp cụm DBSCAN</span>
        </div>
        <button
          type="button"
          onClick={handleClusterToggle}
          role="switch"
          aria-checked={filters.showClusters}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
            filters.showClusters ? "bg-purple-600" : "bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
              filters.showClusters ? "translate-x-4.5" : "translate-x-0.5"
            } mt-0.5`}
          />
        </button>
      </div>

      {/* Thống kê sự kiện hiển thị */}
      {(earthquakeCount !== undefined || clusterCount !== undefined) && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] font-mono text-slate-400">
          <span>Đang hiển thị:</span>
          <div className="flex gap-2">
            {earthquakeCount !== undefined && (
              <span className="text-cyan-300 font-semibold">{earthquakeCount} sự kiện</span>
            )}
            {clusterCount !== undefined && filters.showClusters && (
              <span className="text-purple-300 font-semibold">{clusterCount} cụm</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
