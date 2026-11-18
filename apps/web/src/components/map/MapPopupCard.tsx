import React from "react";
import { Clock, ExternalLink, MapPin, Ruler, Waves } from "lucide-react";
import { formatEventTime, type TimezoneMode } from "../../utils/timezone";
import { formatMetric } from "./map-data";
import type { MapEarthquake } from "./types";

interface MapPopupCardProps {
  earthquake: MapEarthquake;
  /** Múi giờ người dùng chọn — UTC luôn hiển thị song song. */
  timezone?: TimezoneMode;
  onClose?: () => void;
  /** Biến thể panel bên phải trên desktop (không dùng trong Leaflet popup). */
  variant?: "popup" | "panel";
}

/**
 * Nội dung chi tiết một sự kiện: `place`, `source_event_id` (USGS), thời gian UTC +
 * giờ địa phương, độ sâu và độ lớn. Dùng chung cho Leaflet Popup và panel bên phải.
 */
export const MapPopupCard: React.FC<MapPopupCardProps> = ({
  earthquake,
  timezone = "UTC+7",
  onClose,
  variant = "popup",
}) => {
  const utcLabel = formatEventTime(earthquake.eventTime, "UTC");
  const localLabel = formatEventTime(earthquake.eventTime, "UTC+7");

  return (
    <div
      className={`text-slate-200 ${variant === "panel" ? "w-full" : "w-64"}`}
      data-testid="map-popup-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="text-sm font-semibold leading-tight text-white">{earthquake.place}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="mt-2 inline-flex items-baseline gap-1.5 rounded-md bg-slate-800/80 px-2 py-1">
        <Waves className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-sm font-bold text-white">M {formatMetric(earthquake.magnitude, 1)}</span>
        {earthquake.magnitudeType ? (
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            {earthquake.magnitudeType}
          </span>
        ) : null}
      </div>

      <dl className="mt-2 space-y-1 text-[11px] leading-relaxed">
        <div className="flex items-center gap-1.5">
          <Ruler className="h-3 w-3 text-slate-500" />
          <dt className="text-slate-500">Độ sâu:</dt>
          <dd className="font-mono text-slate-200">{formatMetric(earthquake.depthKm, 1)} km</dd>
        </div>
        <div className="flex items-start gap-1.5">
          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
          <div>
            <dt className="inline text-slate-500">Giờ UTC: </dt>
            <dd className="inline font-mono text-slate-200">{utcLabel}</dd>
            <br />
            <dt className="inline text-slate-500">Giờ địa phương: </dt>
            <dd className="inline font-mono text-slate-300">{localLabel}</dd>
          </div>
        </div>
        <div>
          <dt className="text-slate-500">Mã nguồn USGS: </dt>
          <dd className="font-mono text-slate-300">{earthquake.sourceEventId || "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Toạ độ WGS84: </dt>
          <dd className="font-mono text-slate-300">
            {formatMetric(earthquake.latitude, 4)}, {formatMetric(earthquake.longitude, 4)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Múi giờ đang chọn: </dt>
          <dd className="text-slate-300">{timezone === "UTC" ? utcLabel : localLabel}</dd>
        </div>
      </dl>

      {earthquake.sourceUrl ? (
        <a
          href={earthquake.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
        >
          <ExternalLink className="h-3 w-3" />
          Xem chi tiết trên USGS
        </a>
      ) : null}
    </div>
  );
};
