import React from "react";
import { Minus, Plus } from "lucide-react";
import { parseNumericInput, stepValue } from "../earthquake-insights.ts";

interface NumberStepperFieldProps {
  label: string;
  value: string;
  step: number;
  min: number;
  max?: number;
  placeholder?: string;
  onChange: (value: string) => void;
}

export const NumberStepperField: React.FC<NumberStepperFieldProps> = ({
  label,
  value,
  step,
  min,
  max,
  placeholder,
  onChange,
}) => (
  <label className="eq-filter-field">
    <span className="ds-form-label">{label}</span>
    <span className="eq-stepper">
      <button
        className="eq-stepper__button"
        type="button"
        aria-label={`Giảm ${label}`}
        onClick={() => onChange(stepValue(value, -1, step, min, max))}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        className="ds-input eq-stepper__input"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw.trim() === "" || parseNumericInput(raw) !== null) onChange(raw);
        }}
      />
      <button
        className="eq-stepper__button"
        type="button"
        aria-label={`Tăng ${label}`}
        onClick={() => onChange(stepValue(value, 1, step, min, max))}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  </label>
);
