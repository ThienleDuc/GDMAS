import React from "react";
import { RANGE_PRESETS, type DateRangePreset } from "../earthquake-view.ts";
import { NumberStepperField } from "./NumberStepperField.tsx";

export interface EarthquakeFilterValues {
  range: DateRangePreset;
  minMagnitude: string;
  maxMagnitude: string;
  minDepth: string;
  maxDepth: string;
}

interface EarthquakeFilterBarProps {
  value: EarthquakeFilterValues;
  onChange: (key: keyof EarthquakeFilterValues, value: string) => void;
  onApply: () => void;
}

export const EarthquakeFilterBar: React.FC<EarthquakeFilterBarProps> = ({ value, onChange, onApply }) => (
  <div className="eq-filter-bar">
    <label className="eq-filter-field">
      <span className="ds-form-label">Khoảng thời gian</span>
      <select className="ds-select" value={value.range} onChange={(event) => onChange("range", event.target.value)}>
        {RANGE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>{preset.label}</option>
        ))}
      </select>
    </label>
    <NumberStepperField
      label="Độ lớn từ"
      value={value.minMagnitude}
      step={0.5}
      min={0}
      max={10}
      placeholder="VD 4.5"
      onChange={(next) => onChange("minMagnitude", next)}
    />
    <NumberStepperField
      label="Độ lớn đến"
      value={value.maxMagnitude}
      step={0.5}
      min={0}
      max={10}
      placeholder="VD 7.0"
      onChange={(next) => onChange("maxMagnitude", next)}
    />
    <NumberStepperField
      label="Độ sâu từ (km)"
      value={value.minDepth}
      step={5}
      min={0}
      placeholder="VD 10"
      onChange={(next) => onChange("minDepth", next)}
    />
    <NumberStepperField
      label="Độ sâu đến (km)"
      value={value.maxDepth}
      step={5}
      min={0}
      placeholder="VD 100"
      onChange={(next) => onChange("maxDepth", next)}
    />
    <button
      className="eq-filter-apply"
      type="button"
      onClick={onApply}
      aria-label="Áp dụng bộ lọc"
      title="Áp dụng bộ lọc"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
      </svg>
    </button>
  </div>
);
