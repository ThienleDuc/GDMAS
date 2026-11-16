import React from "react";
import { CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { TimezoneMode } from "../../utils/timezone";
import { formatMetric, markerStyleFor } from "./map-data";
import { MapPopupCard } from "./MapPopupCard";
import type { MapEarthquake } from "./types";

interface EarthquakeMarkerLayerProps {
  events: MapEarthquake[];
  timezone?: TimezoneMode;
}

/**
 * Một `CircleMarker` cho mỗi sự kiện (ưu tiên canvas, phù hợp vài nghìn điểm):
 * kích thước theo `magnitude`, màu theo `magnitude`, độ mờ theo `depth_km`.
 */
export const EarthquakeMarkerLayer: React.FC<EarthquakeMarkerLayerProps> = ({
  events,
  timezone = "UTC+7",
}) => (
  <>
    {events.map((event) => {
      const style = markerStyleFor(event);
      return (
        <CircleMarker
          key={`eq-${event.id}-${event.eventTime}`}
          center={[event.latitude, event.longitude]}
          radius={style.radius}
          pathOptions={style}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={1}>
            <span className="text-[11px] font-medium">
              M {formatMetric(event.magnitude, 1)} · {event.place}
            </span>
          </Tooltip>
          <Popup minWidth={260} maxWidth={300}>
            <MapPopupCard earthquake={event} timezone={timezone} />
          </Popup>
        </CircleMarker>
      );
    })}
  </>
);
