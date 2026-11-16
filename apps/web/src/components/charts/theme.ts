/**
 * Bảng màu & hằng số style dùng chung cho biểu đồ Dark Mode (I5).
 * Không hardcode màu rải rác trong component để giữ tương phản đồng nhất.
 */

export const CHART_COLORS = {
  cyan: "#22d3ee",
  sky: "#38bdf8",
  indigo: "#818cf8",
  emerald: "#34d399",
  amber: "#fbbf24",
  orange: "#fb923c",
  rose: "#fb7185",
  purple: "#c084fc",
  slate: "#64748b",
  slateLight: "#94a3b8",
} as const;

export const AXIS_TICK = { fill: "#94a3b8", fontSize: 11 };

export const AXIS_LINE = { stroke: "#334155" };

export const GRID_STROKE = "#1e293b";

export const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 12,
  boxShadow: "0 10px 30px rgba(2, 6, 23, 0.6)",
};

export const TOOLTIP_LABEL_STYLE = { color: "#94a3b8", fontSize: 11 };

export const TOOLTIP_ITEM_STYLE = { color: "#e2e8f0", fontSize: 12 };

/** Màu nhãn cảnh báo cho Pattern 6 (dùng cả class Tailwind và hex cho Recharts). */
export const RISK_COLORS: Record<
  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  { hex: string; badge: string; bar: string }
> = {
  LOW: {
    hex: "#34d399",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    bar: "#34d399",
  },
  MEDIUM: {
    hex: "#fbbf24",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    bar: "#fbbf24",
  },
  HIGH: {
    hex: "#fb923c",
    badge: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    bar: "#fb923c",
  },
  CRITICAL: {
    hex: "#fb7185",
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    bar: "#fb7185",
  },
};

export const RISK_LABELS_VI: Record<keyof typeof RISK_COLORS, string> = {
  LOW: "Thấp (LOW)",
  MEDIUM: "Trung bình (MEDIUM)",
  HIGH: "Cao (HIGH)",
  CRITICAL: "Nghiêm trọng (CRITICAL)",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function mix(from: [number, number, number], to: [number, number, number], ratio: number): string {
  const t = clamp(ratio, 0, 1);
  return `#${toHex(from[0] + (to[0] - from[0]) * t)}${toHex(
    from[1] + (to[1] - from[1]) * t,
  )}${toHex(from[2] + (to[2] - from[2]) * t)}`;
}

const NEGATIVE: [number, number, number] = [244, 63, 94]; // rose-500
const NEUTRAL: [number, number, number] = [30, 41, 59]; // slate-800
const POSITIVE: [number, number, number] = [34, 211, 238]; // cyan-400

/**
 * Thang màu phân kỳ cho Heatmap: -1 (đỏ) → 0 (nền tối) → +1 (cyan).
 * Giá trị `null`/không hữu hạn trả màu nền trung tính.
 */
export function correlationColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "#0b1220";
  }
  const clamped = clamp(value, -1, 1);
  return clamped >= 0 ? mix(NEUTRAL, POSITIVE, clamped) : mix(NEUTRAL, NEGATIVE, -clamped);
}

/** Màu chữ đảm bảo tương phản trên ô heatmap theo độ lớn hệ số. */
export function correlationTextColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "#64748b";
  }
  return Math.abs(value) >= 0.55 ? "#f8fafc" : "#cbd5e1";
}
