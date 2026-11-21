import React from "react";
import type { PanelState } from "../../features/statistics/statistics-view.ts";

interface PatternPanelProps {
  title: string;
  state: PanelState;
  reason?: string;
  children?: React.ReactNode;
}

/** Wrapper chung cho 6 panel: tiêu đề + Loading/Error/Empty + nội dung chart. */
export function PatternPanel({ title, state, reason, children }: PatternPanelProps) {
  return (
    <section className="stat-card">
      <h2 className="stat-card__title">{title}</h2>
      {state === "loading" && (
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
      {state === "ready" && children}
    </section>
  );
}
