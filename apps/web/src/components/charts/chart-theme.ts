/**
 * Bộ thông số vẽ chung cho biểu đồ Recharts — dùng token CSS của design system
 * để sáng/tối đều đọc được, không hardcode màu nền (I5).
 */

export const CHART_MARGIN = { top: 12, right: 20, bottom: 12, left: 4 } as const;

export const CHART_GRID = {
  strokeDasharray: "4 4",
  opacity: 0.55,
} as const;

export const CHART_AXIS = {
  tick: { fontSize: 11, fill: "var(--muted-foreground)" },
  axisLine: { stroke: "var(--border)" },
  tickLine: false,
  height: 28,
} as const;

export const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-md)",
    color: "var(--card-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--card-foreground)" },
} as const;

export const CHART_LEGEND = {
  wrapperStyle: { fontSize: 12, color: "var(--muted-foreground)", paddingTop: 8 },
  iconSize: 10,
} as const;

/** Nét dày hơn mặc định của Recharts (1px) để đường line dễ nhìn. */
export const CHART_LINE_WIDTH = 2.5;

export const CHART_DOT = { r: 2.5, strokeWidth: 0 } as const;
