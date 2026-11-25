import { popupFields } from "../../features/monitoring/monitoring-view.ts";
import type { MapEarthquake } from "../../lib/transforms/map-types.ts";
import { useTimezone } from "../../contexts/timezone-context.tsx";

/** Popup chi tiết sự kiện — đủ 6 trường theo DoD T7.04. */
export function MapPopupCard({ event }: { event: MapEarthquake }) {
  const { timezone } = useTimezone();
  const fields = popupFields(event, timezone);

  return (
    <div className="gm-popup">
      <strong className="gm-popup__place">{fields.place}</strong>
      <dl className="gm-popup__grid">
        <dt>Mã sự kiện</dt>
        <dd>{fields.sourceEventId}</dd>
        <dt>Thời gian quốc tế</dt>
        <dd>{fields.eventTimeUtc}</dd>
        <dt>Giờ địa phương</dt>
        <dd>{fields.eventTimeLocal}</dd>
        <dt>Độ sâu</dt>
        <dd>{fields.depthKm} km</dd>
        <dt>Độ lớn</dt>
        <dd>{fields.magnitude}</dd>
        <dt>Nguồn</dt>
        <dd>
          {fields.sourceUrl ? (
            <a href={fields.sourceUrl} target="_blank" rel="noreferrer">
              {fields.sourceUrl}
            </a>
          ) : (
            "—"
          )}
        </dd>
      </dl>
    </div>
  );
}
