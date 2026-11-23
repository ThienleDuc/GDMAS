/**
 * Danh sách sự kiện kiểu USGS map: "độ lớn – địa điểm – độ sâu".
 * Mỗi dòng gồm 3 phần (tỷ lệ 2-8-2): độ lớn / địa điểm + thời gian (2 dòng) / độ sâu.
 * Quốc gia được lọc ở combobox header; click một dòng đưa khung nhìn tới sự kiện đó.
 */

import { formatEventTime } from "../../lib/formatters.ts";
import { magnitudeToColor } from "../../lib/transforms/map-data.ts";
import type { MapEarthquake } from "../../lib/transforms/map-types.ts";

interface EventListPanelProps {
  events: readonly MapEarthquake[];
  selectedId?: string | null;
  onSelect: (event: MapEarthquake) => void;
}

export function EventListPanel({ events, selectedId, onSelect }: EventListPanelProps) {
  return (
    <section className="gm-event-panel" aria-label="Danh sách sự kiện động đất">
      <h2 className="gm-event-panel__title">
        Sự kiện động đất <span className="gm-event-panel__count">{events.length}</span>
      </h2>
      <ul className="gm-event-panel__list">
        {events.map((event) => {
          const id = event.sourceEventId || String(event.id);
          return (
            <li key={id}>
              <button
                type="button"
                className={`gm-event-item ${selectedId === id ? "is-active" : ""}`}
                aria-pressed={selectedId === id}
                onClick={() => onSelect(event)}
              >
                <span
                  className="gm-event-item__magnitude"
                  style={{ borderLeftColor: magnitudeToColor(event.magnitude) }}
                >
                  M{event.magnitude.toFixed(1)}
                </span>
                <span className="gm-event-item__main">
                  <span className="gm-event-item__place" title={event.place}>
                    {event.place}
                  </span>
                  <span className="gm-event-item__time" title="Giờ quốc tế (UTC)">
                    {formatEventTime(event.eventTime, "UTC")}
                  </span>
                </span>
                <span className="gm-event-item__depth">{event.depthKm.toFixed(1)} km</span>
              </button>
            </li>
          );
        })}
      </ul>
      {events.length === 0 && (
        <p className="gm-event-panel__empty">Không có sự kiện để hiển thị.</p>
      )}
    </section>
  );
}
