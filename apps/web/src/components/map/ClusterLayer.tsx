import React from "react";
import { Circle, Popup, Tooltip } from "react-leaflet";
import { formatCoordinate, formatMetric } from "./map-data";
import type { MapCluster } from "./types";

interface ClusterLayerProps {
  clusters: MapCluster[];
  visible?: boolean;
}

/**
 * Lớp hiển thị các cụm động đất (DBSCAN) trên bản đồ.
 * Vẽ vòng tròn tâm cụm với bán kính `radiusKm` (hoặc mặc định 50 km)
 * kèm Popup chi tiết số lượng sự kiện và độ lớn trung bình/lớn nhất.
 */
export const ClusterLayer: React.FC<ClusterLayerProps> = ({
  clusters,
  visible = true,
}) => {
  if (!visible || clusters.length === 0) return null;

  return (
    <>
      {clusters.map((cluster) => {
        const radiusMeters = Math.max(10_000, (cluster.radiusKm ?? 50) * 1_000);
        const title = cluster.name || cluster.dominantPlace || `Cụm #${cluster.clusterId}`;

        return (
          <Circle
            key={`cluster-${cluster.clusterId}-${cluster.centerLatitude}-${cluster.centerLongitude}`}
            center={[cluster.centerLatitude, cluster.centerLongitude]}
            radius={radiusMeters}
            pathOptions={{
              color: "#c084fc",
              fillColor: "#a855f7",
              fillOpacity: 0.18,
              weight: 1.5,
              dashArray: "4, 4",
            }}
          >
            <Tooltip direction="center" permanent={false} opacity={0.9}>
              <span className="font-mono text-xs font-semibold text-purple-200">
                {title} ({cluster.eventCount} sự kiện)
              </span>
            </Tooltip>
            <Popup minWidth={240} maxWidth={280}>
              <div className="p-1 text-slate-200">
                <div className="border-b border-purple-500/30 pb-1.5">
                  <p className="text-xs font-semibold text-purple-400">CỤM ĐỊA CHẤN DBSCAN</p>
                  <p className="text-sm font-bold text-white">{title}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-slate-800/80 p-1.5">
                    <span className="text-[10px] text-slate-400">Số sự kiện</span>
                    <p className="text-sm font-bold text-white">{cluster.eventCount}</p>
                  </div>
                  <div className="rounded bg-slate-800/80 p-1.5">
                    <span className="text-[10px] text-slate-400">Bán kính</span>
                    <p className="text-sm font-bold text-white">
                      {cluster.radiusKm ? `${formatMetric(cluster.radiusKm, 0)} km` : "—"}
                    </p>
                  </div>
                  <div className="rounded bg-slate-800/80 p-1.5">
                    <span className="text-[10px] text-slate-400">Độ lớn TB</span>
                    <p className="text-sm font-bold text-amber-300">
                      M {formatMetric(cluster.avgMagnitude, 2)}
                    </p>
                  </div>
                  <div className="rounded bg-slate-800/80 p-1.5">
                    <span className="text-[10px] text-slate-400">Độ lớn Max</span>
                    <p className="text-sm font-bold text-rose-400">
                      M {formatMetric(cluster.maxMagnitude, 1)}
                    </p>
                  </div>
                </div>

                <p className="mt-2 font-mono text-[10px] text-slate-400">
                  Tâm: {formatCoordinate(cluster.centerLatitude, cluster.centerLongitude)}
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
};
