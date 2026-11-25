import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ViewState } from "../earthquake-view.ts";

interface AsyncStatePanelProps {
  state: Extract<ViewState, "loading" | "error" | "empty">;
  message?: string;
  onRetry?: () => void;
}

export const AsyncStatePanel: React.FC<AsyncStatePanelProps> = ({ state, message, onRetry }) => {
  if (state === "loading") {
    return (
      <div className="eq-state-panel eq-state-panel--loading" aria-busy="true">
        <div className="eq-skeleton h-5 w-48" />
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="eq-skeleton h-10" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="eq-state-panel" role="alert">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="font-semibold">Không thể tải danh mục động đất</p>
        <p className="text-caption">{message ?? "Lỗi không xác định."}</p>
        {onRetry && (
          <button className="ds-button ds-button-primary" onClick={onRetry} type="button">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="eq-state-panel">
      <p className="font-semibold">Không có sự kiện nào trong khoảng đã chọn</p>
    </div>
  );
};
