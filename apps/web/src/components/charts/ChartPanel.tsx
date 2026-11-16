import React from "react";
import { Info } from "lucide-react";
import { EmptyChartState } from "./EmptyChartState";

interface ChartPanelProps {
  order: number;
  title: string;
  description: string;
  algorithm: string;
  period?: string;
  status?: string;
  available: boolean;
  emptyReason: string;
  icon: React.ElementType;
  accentBorder: string;
  accentBadge: string;
  children: React.ReactNode;
}

interface MetricChipProps {
  label: string;
  value: string;
  valueClassName?: string;
}

/** Chip số liệu thật từ API; giá trị thiếu truyền vào là `"—"` từ `formatNumber`. */
export const MetricChip: React.FC<MetricChipProps> = ({ label, value, valueClassName }) => (
  <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2">
    <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
    <div className={`mt-0.5 font-mono text-xs font-semibold ${valueClassName ?? "text-slate-200"}`}>
      {value}
    </div>
  </div>
);

export const MetricChipRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{children}</div>
);

function statusBadge(status?: string): { label: string; className: string } {
  if (status === "COMPUTED") {
    return {
      label: "COMPUTED",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    };
  }
  if (status === "PENDING") {
    return {
      label: "PENDING",
      className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    };
  }
  return {
    label: "CHƯA CÓ TRONG CSDL",
    className: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  };
}

/**
 * Khung chung cho một Pattern: tiêu đề, badge trạng thái, period, thuật toán và
 * tự động hiển thị `EmptyChartState` khi pattern không có dữ liệu.
 */
export const ChartPanel: React.FC<ChartPanelProps> = ({
  order,
  title,
  description,
  algorithm,
  period,
  status,
  available,
  emptyReason,
  icon: Icon,
  accentBorder,
  accentBadge,
  children,
}) => {
  const badge = statusBadge(status);

  return (
    <section
      className={`flex flex-col rounded-xl border bg-slate-900/60 transition-all ${
        available
          ? `${accentBorder} bg-gradient-to-b from-slate-900/80 to-slate-950/90 shadow-md`
          : "border-slate-800"
      }`}
    >
      <div className="flex-1 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="rounded-lg border border-slate-700/60 bg-slate-800/80 p-2">
              <Icon className="h-4 w-4 text-slate-300" />
            </div>
            <span className="font-mono text-xs font-semibold text-slate-300">#{order}</span>
          </div>
          <div className="flex items-center gap-2">
            {period ? (
              <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">{period}</span>
            ) : null}
            <span
              className={`flex items-center space-x-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${badge.className}`}
            >
              {status === "COMPUTED" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ) : null}
              <span>{badge.label}</span>
            </span>
          </div>
        </div>

        <h3 className="mb-1.5 text-base font-semibold leading-snug text-slate-100">{title}</h3>
        <p className="mb-4 text-xs leading-relaxed text-slate-400">{description}</p>

        {available ? children : <EmptyChartState reason={emptyReason} />}
      </div>

      <div className="mt-0 flex items-start space-x-2 border-t border-slate-800/80 px-5 py-3 text-[11px] text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <span className="line-clamp-2">{algorithm}</span>
        <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${accentBadge}`}>
          {status ?? "—"}
        </span>
      </div>
    </section>
  );
};
