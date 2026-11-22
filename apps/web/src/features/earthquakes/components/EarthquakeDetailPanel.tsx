import React from "react";
import { X } from "lucide-react";
import type { EarthquakeItem } from "../../../contracts/earthquake.ts";
import type { TimezoneMode } from "../../../lib/formatters.ts";
import { detailFields, rawDataSummary } from "../earthquake-detail.ts";

export type DetailState = "idle" | "loading" | "not_found" | "error" | "ready";

interface EarthquakeDetailPanelProps {
  state: DetailState;
  item: EarthquakeItem | null;
  timezone: TimezoneMode;
  message?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

/** Panel chi tiết 1 sự kiện — nạp qua `getEarthquakeDetail()` (BE đã có, RD-13). */
export const EarthquakeDetailPanel: React.FC<EarthquakeDetailPanelProps> = ({
  state,
  item,
  timezone,
  message,
  onClose,
  onRetry,
}) => {
  if (state === "idle") return null;

  if (state === "loading") {
    return (
      <div className="eq-table-card" role="status" aria-busy="true">
        <p className="text-caption">Đang tải chi tiết sự kiện…</p>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="eq-table-card" role="status">
        <p className="font-semibold">Không tìm thấy sự kiện</p>
        <p className="text-caption">Mã sự kiện có thể đã bị xóa khỏi cơ sở dữ liệu.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="eq-table-card" role="alert">
        <p className="font-semibold">Không thể tải chi tiết sự kiện</p>
        <p className="text-caption">{message ?? "Lỗi không xác định."}</p>
        {onRetry && (
          <button className="ds-button ds-button-primary" type="button" onClick={onRetry}>
            Thử lại
          </button>
        )}
      </div>
    );
  }

  if (!item) return null;
  const hasRaw = rawDataSummary(item) !== null;

  return (
    <div className="eq-table-card" role="region" aria-label="Chi tiết sự kiện động đất">
      <div className="eq-detail-head">
        <p className="font-semibold">Chi tiết sự kiện · {item.source_event_id || item.id}</p>
        {onClose && (
          <button
            className="ds-button"
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <dl className="eq-detail-grid">
        {detailFields(item, timezone).map((field) => (
          <div key={field.label} className="eq-detail-item">
            <dt className="text-caption">{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {hasRaw && item.raw_data && (
        <details className="eq-detail-raw">
          <summary>Dữ liệu GeoJSON gốc</summary>
          <pre>{JSON.stringify(item.raw_data, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};
