import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyChartState } from "./EmptyChartState";
import { buildRiskBars, formatNumber, formatPercent, normalizeRiskLabel } from "./chart-data";
import type { RiskBar } from "./chart-data";
import {
  AXIS_LINE,
  AXIS_TICK,
  GRID_STROKE,
  RISK_COLORS,
  RISK_LABELS_VI,
  TOOLTIP_STYLE,
} from "./theme";
import type { ClassificationMetrics } from "./types";
import { MetricChip, MetricChipRow } from "./ChartPanel";

interface ClassificationPatternChartProps {
  metrics: ClassificationMetrics;
}

interface RiskTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: RiskBar }>;
}

const RiskTooltip: React.FC<RiskTooltipProps> = ({ active, payload }) => {
  const bar = payload?.[0]?.payload;
  if (!active || !bar) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <div className="text-[11px] text-slate-400">{RISK_LABELS_VI[bar.level]}</div>
      <div className="text-xs text-slate-100">{formatPercent(bar.probability, 2)}</div>
    </div>
  );
};

export const ClassificationPatternChart: React.FC<ClassificationPatternChartProps> = ({
  metrics,
}) => {
  const label = normalizeRiskLabel(metrics.predicted_label);
  const bars = buildRiskBars(metrics.probability_scores);
  const evaluation = metrics.evaluation_metrics;

  if (!label && bars.length === 0) {
    return (
      <EmptyChartState
        reason="Pattern 6 chưa có nhãn phân loại hoặc phân phối xác suất trong CSDL."
        hint="Worker T5 cần chạy xong để sinh kết quả phân loại ngày t+1."
      />
    );
  }

  const accent = label ? RISK_COLORS[label] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Nhãn dự báo ngày {metrics.target_date ?? "t+1"}
          </div>
          <div
            className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${
              accent?.badge ?? "border-slate-700 bg-slate-800 text-slate-300"
            }`}
          >
            {label ?? "KHÔNG XÁC ĐỊNH"}
            {label ? <span className="ml-2 text-xs font-normal">{RISK_LABELS_VI[label]}</span> : null}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Mô hình</div>
          <div className="text-xs font-semibold text-slate-200">{metrics.model_name ?? "—"}</div>
          <div className="font-mono text-[10px] text-slate-500">
            version: {metrics.model_version ?? "—"}
          </div>
        </div>
      </div>

      <MetricChipRow>
        <MetricChip label="Accuracy" value={formatPercent(evaluation?.accuracy, 1)} />
        <MetricChip label="F1-score" value={formatNumber(evaluation?.f1_score ?? evaluation?.f1_macro, 3)} />
        <MetricChip label="Số lớp" value={formatNumber(bars.length, 0)} />
        <MetricChip label="Đơn vị" value="Xác suất lớp" />
      </MetricChipRow>

      {bars.length === 0 ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90">
          API chưa trả phân phối xác suất từng lớp — không hiển thị thanh xác suất thay thế.
        </p>
      ) : (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-200">Phân phối xác suất 4 lớp rủi ro</h4>
            <span className="text-[10px] text-slate-500">Tổng chuẩn hóa = 100%</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={bars}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 1]}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
                tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
              />
              <YAxis
                type="category"
                dataKey="level"
                width={80}
                tick={AXIS_TICK}
                axisLine={AXIS_LINE}
                tickLine={false}
              />
              <Tooltip content={<RiskTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
              <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={18}>
                {bars.map((bar) => (
                  <Cell key={bar.level} fill={RISK_COLORS[bar.level].bar} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-100/90">
        <span className="font-semibold text-amber-300">Lưu ý: </span>
        Đây là chỉ báo thống kê thử nghiệm về mức độ hoạt động địa chấn tổng hợp cho ngày kế tiếp,
        <span className="font-semibold"> không thay thế cảnh báo thiên tai chính thức</span> và không dự báo
        chính xác từng trận động đất riêng lẻ (docs/architecture.md §6.4).
      </p>
    </div>
  );
};
