import React, { useState } from "react";
import { Filter, Layers, Navigation, RefreshCw } from "lucide-react";

export const MonitoringMapPage: React.FC = () => {
  const [minMagnitude, setMinMagnitude] = useState<number>(2.5);
  const [showClusters, setShowClusters] = useState<boolean>(true);

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden">
      {/* Map Placeholder Canvas / Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

      {/* Center Map Simulator Visual */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex flex-col items-center">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-20"></span>
            <span className="relative inline-flex rounded-full h-16 w-16 bg-cyan-500/20 border border-cyan-400/40 items-center justify-center">
              <Navigation className="h-6 w-6 text-cyan-400 transform rotate-45" />
            </span>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-sm font-semibold text-slate-300">Không Gian Giám Sát Địa Chấn Toàn Cầu</h3>
            <p className="text-xs text-slate-500 mt-1">Leaflet / OpenStreetMap Canvas Layer</p>
          </div>
        </div>
      </div>

      {/* Floating HUD Panel (Left Bottom) */}
      <div className="absolute bottom-6 left-6 z-[900] w-80 rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Bộ Lọc Tọa Độ & Cường Độ</span>
          </div>
          <button
            onClick={() => setMinMagnitude(2.5)}
            className="text-[11px] text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Mặc định</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Độ lớn tối thiểu (Magnitude):</span>
              <span className="font-mono text-cyan-400 font-bold">&ge; {minMagnitude.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="9"
              step="0.5"
              value={minMagnitude}
              onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-300 flex items-center space-x-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>Hiển thị cụm DBSCAN</span>
            </span>
            <input
              type="checkbox"
              checked={showClusters}
              onChange={(e) => setShowClusters(e.target.checked)}
              className="h-4 w-4 rounded accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Floating Status HUD (Right Bottom) */}
      <div className="absolute bottom-6 right-6 z-[900] hidden sm:flex items-center space-x-4 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-mono">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[10px]">COORDINATES</span>
          <span className="text-slate-300">Lat: 16.0544° N | Lon: 108.2022° E</span>
        </div>
        <div className="h-6 w-px bg-slate-800" />
        <div className="flex flex-col">
          <span className="text-slate-500 text-[10px]">ZOOM LEVEL</span>
          <span className="text-cyan-400">Level 4 (Global Grid)</span>
        </div>
      </div>
    </div>
  );
};

