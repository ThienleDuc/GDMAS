import React, { useState } from "react";
import { EmptyChartState } from "./EmptyChartState";
import { formatCoefficient, formatNumber } from "./chart-data";
import { correlationColor, correlationTextColor } from "./theme";
import type { CorrelationMetrics } from "./types";
import { MetricChip, MetricChipRow } from "./ChartPanel";

interface CorrelationHeatmapProps {
  metrics: CorrelationMetrics;
}

const VARIABLE_LABELS: Record<string, string> = {
  magnitude: "Độ lớn (magnitude)",
  depth_km: "Độ sâu (depth_km)",
  latitude: "Vĩ độ (latitude)",
  longitude: "Kinh độ (longitude)",
  daily_event_count: "Tần suất ngày",
};

const VARIABLE_SHORT: Record<string, string> = {
  magnitude: "Mag",
  depth_km: "Depth",
  latitude: "Lat",
  longitude: "Lon",
  daily_event_count: "Count",
};

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({ metrics }) => {
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);

  const variables = metrics.variables ?? [];
  const matrix = metrics.matrix ?? [];
  const size = Math.min(variables.length, matrix.length);

  if (size < 2) {
    return (
      <EmptyChartState
        reason="Pattern 4 chưa có ma trận tương quan đủ biến (cần tối thiểu 2 biến có phương sai > 0)."
        hint={metrics.note}
      />
    );
  }

  const activeValue =
    active && active.row < size && active.col < size
      ? matrix[active.row]?.[active.col] ?? null
      : null;
  const activeLabel =
    active && active.row < size && active.col < size
      ? `${VARIABLE_LABELS[variables[active.row]] ?? variables[active.row]} ↔ ${
          VARIABLE_LABELS[variables[active.col]] ?? variables[active.col]
        }`
      : "";

  return (
    <div className="space-y-3">
      <MetricChipRow>
        <MetricChip
          label="Pearson Mag ↔ Depth"
          value={formatCoefficient(metrics.corr_mag_depth)}
          valueClassName="text-amber-300"
        />
        <MetricChip label="Mức độ" value={metrics.correlation_strength ?? "—"} />
        <MetricChip label="Số mẫu" value={formatNumber(metrics.sample_size, 0)} />
        <MetricChip label="Phương pháp" value={metrics.method ?? "pearson"} />
      </MetricChipRow>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
        <div
          role="grid"
          aria-label="Ma trận tương quan Pearson 5 biến"
          className="grid gap-1"
          style={{ gridTemplateColumns: `88px repeat(${size}, minmax(0, 1fr))` }}
        >
          <div aria-hidden="true" />
          {variables.slice(0, size).map((variable) => (
            <div
              key={`head-col-${variable}`}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              title={VARIABLE_LABELS[variable] ?? variable}
            >
              {VARIABLE_SHORT[variable] ?? variable}
            </div>
          ))}

          {variables.slice(0, size).map((rowVariable, row) => (
            <React.Fragment key={`row-${rowVariable}`}>
              <div
                className="flex items-center pr-1 text-right text-[10px] font-medium text-slate-400"
                title={VARIABLE_LABELS[rowVariable] ?? rowVariable}
              >
                <span className="ml-auto truncate">{VARIABLE_SHORT[rowVariable] ?? rowVariable}</span>
              </div>
              {variables.slice(0, size).map((colVariable, col) => {
                const value = matrix[row]?.[col] ?? null;
                const isActive = active?.row === row && active?.col === col;
                const exact = formatCoefficient(value);
                return (
                  <div
                    key={`cell-${rowVariable}-${colVariable}`}
                    role="gridcell"
                    tabIndex={0}
                    aria-label={`${VARIABLE_LABELS[rowVariable] ?? rowVariable} và ${
                      VARIABLE_LABELS[colVariable] ?? colVariable
                    }: r = ${exact}`}
                    title={`r = ${exact} (Pearson)`}
                    onMouseEnter={() => setActive({ row, col })}
                    onFocus={() => setActive({ row, col })}
                    onMouseLeave={() => setActive(null)}
                    onBlur={() => setActive(null)}
                    className={`flex aspect-square items-center justify-center rounded-md border text-[11px] font-mono transition ${
                      isActive ? "border-white/60 ring-1 ring-white/40" : "border-slate-900/60"
                    }`}
                    style={{
                      backgroundColor: correlationColor(value),
                      color: correlationTextColor(value),
                    }}
                  >
                    {value === null ? "—" : value.toFixed(2)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <span>−1</span>
          <div
            aria-hidden="true"
            className="h-2 w-32 rounded-full"
            style={{ background: "linear-gradient(90deg, #f43f5e, #1e293b, #22d3ee)" }}
          />
          <span>+1</span>
          <span className="ml-auto">Hệ số Pearson (r) — rê chuột để xem chính xác 4 chữ số</span>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mt-2 min-h-[32px] rounded-md border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 font-mono text-[11px] text-slate-300"
        >
          {active ? (
            <>
              <span className="text-slate-400">{activeLabel}</span>
              <span className="ml-2 text-cyan-300">r = {formatCoefficient(activeValue)}</span>
            </>
          ) : (
            <span className="text-slate-500">
              Chọn một ô để xem hệ số chính xác · {metrics.method ?? "pearson"} · n ={" "}
              {formatNumber(metrics.sample_size, 0)}
            </span>
          )}
        </div>
      </div>

      {metrics.note ? (
        <p className="text-[11px] leading-relaxed text-slate-500">{metrics.note}</p>
      ) : null}
    </div>
  );
};
