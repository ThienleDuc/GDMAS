import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import { formatMetric, markerStyleFor } from "../../lib/transforms/map-data.ts";
import type { MapEarthquake } from "../../lib/transforms/map-types.ts";
import { MapPopupCard } from "./MapPopupCard.tsx";

/** Vẽ marker WGS84; kích thước/màu/độ mờ lấy từ hàm thuần map-data.ts. */
export function EarthquakeMarkerLayer({ events }: { events: ReadonlyArray<MapEarthquake> }) {
  return (
    <>
      {events.map((event) => (
        <CircleMarker
          key={event.sourceEventId || `event-${event.id}`}
          center={[event.latitude, event.longitude]}
          pathOptions={markerStyleFor(event)}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
            Độ lớn {formatMetric(event.magnitude, 1)} — {event.place}
          </Tooltip>
          <Popup>
            <MapPopupCard event={event} />
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
