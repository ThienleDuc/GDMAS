import React from "react";
import type { PanelState } from "../../features/statistics/statistics-view.ts";

interface PatternPanelProps {
  title: string;
  state: PanelState;
  reason?: string;
  children?: React.ReactNode;
  /** Giữ nội dung mount trong lúc refetch khi đã có data (tránh giật 3 chart). */
  keepMounted?: boolean;
  hasData?: boolean;
  /** Chiều cao tối thiểu của vùng loading lần đầu — tránh nhảy layout. */
  stateMinHeight?: number;
}

/** Wrapper chung cho 6 panel: tiêu đề + Loading/Error/Empty + nội dung chart. */
export function PatternPanel({
  title,
  state,
  reason,
  children,
  keepMounted = false,
  hasData = false,
  stateMinHeight = 0,
}: PatternPanelProps) {
  const showContent = state === "ready" || (state === "loading" && keepMounted && hasData);
  const minHeightStyle = { "--stat-state-min-height": `${stateMinHeight}px` } as React.CSSProperties;

  return (
    <section className="stat-card" style={minHeightStyle}>
      <h2 className="stat-card__title">{title}</h2>
      {state === "loading" && showContent && (
        <span className="stat-card__refetch" role="status">Đang cập nhật…</span>
      )}
      {state === "loading" && !showContent && (
        <div className="stat-card__state" role="status">Đang tải dữ liệu…</div>
      )}
      {state === "error" && (
        <div className="stat-card__state stat-card__state--error" role="alert">
          Không tải được dữ liệu từ máy chủ phân tích.
        </div>
      )}
      {state === "empty" && (
        <div className="stat-card__state" role="status">
          {reason || "Không có dữ liệu để hiển thị."}
        </div>
      )}
      {showContent && children}
    </section>
  );
}
