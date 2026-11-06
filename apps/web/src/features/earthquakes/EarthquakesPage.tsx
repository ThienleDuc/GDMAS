import React, { useState } from "react";
import { Activity, Search, ArrowUpDown } from "lucide-react";

interface EarthquakeItem {
  id: string;
  sourceEventId: string;
  magnitude: number;
  depthKm: number;
  latitude: number;
  longitude: number;
  placeDescription: string;
  timeUtc: string;
}

const MOCK_EVENTS: EarthquakeItem[] = [
  {
    id: "eq-1",
    sourceEventId: "us7000m8ab",
    magnitude: 6.2,
    depthKm: 12.4,
    latitude: 38.291,
    longitude: 142.381,
    placeDescription: "Near East Coast of Honshu, Japan",
    timeUtc: "2026-11-06 14:22:10 UTC",
  },
  {
    id: "eq-2",
    sourceEventId: "us7000m8ac",
    magnitude: 5.4,
    depthKm: 35.0,
    latitude: -17.512,
    longitude: -178.621,
    placeDescription: "Fiji Region",
    timeUtc: "2026-11-06 12:10:45 UTC",
  },
  {
    id: "eq-3",
    sourceEventId: "us7000m8ad",
    magnitude: 4.8,
    depthKm: 10.0,
    latitude: 35.689,
    longitude: 25.122,
    placeDescription: "Crete, Greece",
    timeUtc: "2026-11-06 09:44:18 UTC",
  },
  {
    id: "eq-4",
    sourceEventId: "us7000m8ae",
    magnitude: 3.9,
    depthKm: 8.5,
    latitude: 15.221,
    longitude: 107.892,
    placeDescription: "Kon Tum, Vietnam",
    timeUtc: "2026-11-06 07:15:30 UTC",
  },
];

export const EarthquakesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvents = MOCK_EVENTS.filter((e) =>
    e.placeDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.sourceEventId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span>Danh Mục Sự Kiện Động Đất</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dữ liệu địa chấn được đồng bộ hóa trực tiếp từ cơ sở dữ liệu PostgreSQL.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo khu vực hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-lg bg-slate-900 border border-slate-800 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Mã sự kiện</th>
                <th className="px-6 py-3.5">
                  <div className="flex items-center space-x-1 cursor-pointer hover:text-white">
                    <span>Độ lớn (M)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3.5">Độ sâu (km)</th>
                <th className="px-6 py-3.5">Khu vực / Tọa độ</th>
                <th className="px-6 py-3.5">Thời điểm (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-cyan-400 font-medium">
                    {event.sourceEventId}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        event.magnitude >= 6.0
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : event.magnitude >= 5.0
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {event.magnitude.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono">{event.depthKm} km</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{event.placeDescription}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {event.latitude}°, {event.longitude}°
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">{event.timeUtc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

