import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Info,
  X,
  Radio,
} from "lucide-react";
import {
  getEarthquakes,
  EarthquakeItem,
} from "../../services/earthquake-api";
import { useSSE } from "../../hooks/useSSE";
import {
  getStoredTimezone,
  setStoredTimezone,
  formatEventTime,
  getRelativeTime,
  TimezoneMode,
} from "../../utils/timezone";

/*
// =========================================================================
// DỮ LIỆU MOCK SỰ KIỆN ĐỊA CHẤN MẪU (ĐÃ COMMENT - MẶC ĐỊNH LẤY TỪ API)
// CHỈ DÙNG DỰ PHÒNG KHI BACKEND API KHÔNG HOẠT ĐỘNG
// =========================================================================
const MOCK_EVENTS: EarthquakeItem[] = [
  {
    id: 1,
    source: "USGS",
    source_event_id: "us7000m8ab",
    magnitude: 6.2,
    magnitude_type: "mww",
    depth_km: 12.4,
    latitude: 38.291,
    longitude: 142.381,
    place: "Near East Coast of Honshu, Japan",
    event_time: "2026-11-06T14:22:10Z",
    source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ab",
  },
  {
    id: 2,
    source: "USGS",
    source_event_id: "us7000m8ac",
    magnitude: 5.4,
    magnitude_type: "mb",
    depth_km: 35.0,
    latitude: -17.512,
    longitude: -178.621,
    place: "Fiji Region",
    event_time: "2026-11-06T12:10:45Z",
    source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ac",
  },
  {
    id: 3,
    source: "USGS",
    source_event_id: "us7000m8ad",
    magnitude: 4.8,
    magnitude_type: "mb",
    depth_km: 10.0,
    latitude: 35.689,
    longitude: 25.122,
    place: "Crete, Greece",
    event_time: "2026-11-06T09:44:18Z",
    source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ad",
  },
  {
    id: 4,
    source: "USGS",
    source_event_id: "us7000m8ae",
    magnitude: 3.9,
    magnitude_type: "ml",
    depth_km: 8.5,
    latitude: 15.221,
    longitude: 107.892,
    place: "Kon Tum, Vietnam",
    event_time: "2026-11-06T07:15:30Z",
    source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ae",
  },
];
*/

export const EarthquakesPage: React.FC = () => {
  const [events, setEvents] = useState<EarthquakeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [magRange, setMagRange] = useState<string>("all"); // all, severe, strong, moderate, minor
  const [depthRange, setDepthRange] = useState<string>("all"); // all, shallow, intermediate, deep
  const [sortBy, setSortBy] = useState<"event_time" | "magnitude" | "depth_km">("event_time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Selected event for Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<EarthquakeItem | null>(null);

  // 2 chế độ múi giờ: UTC và UTC+7
  const [tzMode, setTzMode] = useState<TimezoneMode>(getStoredTimezone);
  // Kết nối SSE Server-Sent Events để luôn cập nhật theo thời gian thực
  const { data: sseData, isConnected: isSseConnected } = useSSE("/api/v1/stream/earthquakes");
  const [newEventsNotice, setNewEventsNotice] = useState<string | null>(null);

  const handleTimezoneChange = (mode: TimezoneMode) => {
    setTzMode(mode);
    setStoredTimezone(mode);
  };

  // Fetch earthquakes from API - Mặc định luôn gọi Backend API
  const loadEarthquakes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let minMag: number | undefined = undefined;
      let maxMag: number | undefined = undefined;
      if (magRange === "severe") minMag = 6.0;
      else if (magRange === "strong") { minMag = 5.0; maxMag = 5.9; }
      else if (magRange === "moderate") { minMag = 4.0; maxMag = 4.9; }
      else if (magRange === "minor") maxMag = 3.9;

      let minDepth: number | undefined = undefined;
      let maxDepth: number | undefined = undefined;
      if (depthRange === "shallow") maxDepth = 69.9;
      else if (depthRange === "intermediate") { minDepth = 70.0; maxDepth = 299.9; }
      else if (depthRange === "deep") minDepth = 300.0;

      const res = await getEarthquakes({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        min_magnitude: minMag,
        max_magnitude: maxMag,
        min_depth: minDepth,
        max_depth: maxDepth,
        sort_by: sortBy,
        order: sortOrder,
      });

      if (res?.data) {
        setEvents(res.data);
        setTotalPages(res.metadata.total_pages || 1);
        setTotalCount(res.metadata.total || res.data.length);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi kết nối đến API máy chủ";
      setError(msg);

      // Chỉ khi Backend không chạy mới dùng mock dự phòng:
      /*
      setEvents(MOCK_EVENTS);
      setTotalPages(1);
      setTotalCount(MOCK_EVENTS.length);
      */
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, magRange, depthRange, sortBy, sortOrder]);

  useEffect(() => {
    loadEarthquakes();
  }, [loadEarthquakes]);

  // Tự động làm mới danh sách động đất khi SSE phát hiện sự kiện mới
  useEffect(() => {
    if (!sseData) return;
    if (sseData.event === "earthquake_detected") {
      const msg = (sseData.data as { message?: string })?.message || "Đã nhận sự kiện địa chấn mới qua SSE!";
      setNewEventsNotice(msg);
      loadEarthquakes();
      const timer = setTimeout(() => setNewEventsNotice(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [sseData, loadEarthquakes]);

  // Export JSON file
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gdmas-earthquakes-page-${currentPage}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Compute Quick Stats
  const severeCount = useMemo(() => events.filter((e) => e.magnitude >= 6.0).length, [events]);
  const strongCount = useMemo(() => events.filter((e) => e.magnitude >= 5.0 && e.magnitude < 6.0).length, [events]);
  const moderateCount = useMemo(() => events.filter((e) => e.magnitude >= 4.0 && e.magnitude < 5.0).length, [events]);
  const minorCount = useMemo(() => events.filter((e) => e.magnitude < 4.0).length, [events]);

  return (
    <div className="space-y-6 pb-12 w-full max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. HERO HEADER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800/80 p-6 lg:p-8 shadow-xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>Catalog Dữ Liệu Thời Gian Thực • Kết Nối REST API /api/v1/earthquakes</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <Activity className="h-7 w-7 text-cyan-400" />
              <span>Danh Mục Sự Kiện Động Đất Toàn Cầu</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Kho lưu trữ toàn bộ các sự kiện địa chấn ghi nhận từ trạm quan trắc USGS và EMSC. Hỗ trợ lọc đa chiều theo cường độ (Magnitude), chấn tiêu và tọa độ địa lý WGS84.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Bộ chuyển đổi 2 chế độ múi giờ: UTC và UTC+7 */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
              <Clock className="h-3.5 w-3.5 text-cyan-400 ml-1.5 mr-0.5" />
              <button
                onClick={() => handleTimezoneChange("UTC")}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                  tzMode === "UTC"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Chuyển sang Giờ Quốc Tế (UTC+00:00)"
              >
                UTC
              </button>
              <button
                onClick={() => handleTimezoneChange("UTC+7")}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer ${
                  tzMode === "UTC+7"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Chuyển sang Giờ Việt Nam (UTC+07:00)"
              >
                UTC + 7:00
              </button>
            </div>

            {/* Đèn báo trạng thái kết nối SSE Stream */}
            <div
              className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs shadow-inner"
              title={isSseConnected ? "SSE đang kết nối và truyền dữ liệu thời gian thực" : "Đang kết nối lại SSE..."}
            >
              <span className="relative flex h-2 w-2">
                {isSseConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isSseConnected ? "bg-emerald-500" : "bg-rose-500"}`}></span>
              </span>
              <span className={isSseConnected ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
                {isSseConnected ? "SSE LIVE" : "SSE OFFLINE"}
              </span>
            </div>

            {/* Nút Làm Mới nạp lại dữ liệu từ API */}
            <button
              onClick={() => loadEarthquakes()}
              disabled={loading}
              className="inline-flex items-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all border border-slate-700 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Tải lại dữ liệu từ API"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Đang tải..." : "Làm Mới"}</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={events.length === 0}
              className="inline-flex items-center space-x-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-300 transition-all border border-cyan-500/30 shadow-sm active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <Download className="h-4 w-4 text-cyan-400" />
              <span>Xuất JSON</span>
            </button>
          </div>
        </div>

        {/* Thông báo cập nhật thời gian thực từ SSE */}
        {newEventsNotice && (
          <div className="mt-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-cyan-300 flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse shrink-0" />
              <span>{newEventsNotice} (Dữ liệu đã tự động cập nhật qua SSE)</span>
            </div>
            <button
              onClick={() => setNewEventsNotice(null)}
              className="text-cyan-400 hover:text-white font-semibold cursor-pointer underline text-[11px]"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. QUICK METRIC PILLS BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Sự Kiện Cực Mạnh (M ≥ 6.0)</span>
            <span className="text-xl font-extrabold text-rose-400 mt-0.5 block">{severeCount}</span>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Cường Độ Mạnh (5.0 - 5.9)</span>
            <span className="text-xl font-extrabold text-amber-400 mt-0.5 block">{strongCount}</span>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Trung Bình (4.0 - 4.9)</span>
            <span className="text-xl font-extrabold text-yellow-400 mt-0.5 block">{moderateCount}</span>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Nhẹ (M &lt; 4.0)</span>
            <span className="text-xl font-extrabold text-cyan-400 mt-0.5 block">{minorCount}</span>
          </div>
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ADVANCED FILTER & SEARCH TOOLBAR (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm space-y-4 backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo khu vực, quốc gia, mã USGS (ví dụ: Honshu, us7000...)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
            />
          </div>

          {/* Quick Magnitude Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Cường độ:</span>
            {[
              { id: "all", label: "Tất cả" },
              { id: "severe", label: "M ≥ 6.0 (Cực mạnh)", color: "text-rose-400 border-rose-500/30" },
              { id: "strong", label: "5.0 - 5.9", color: "text-amber-400 border-amber-500/30" },
              { id: "moderate", label: "4.0 - 4.9", color: "text-yellow-400 border-yellow-500/30" },
              { id: "minor", label: "M < 4.0", color: "text-cyan-400 border-cyan-500/30" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMagRange(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  magRange === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters: Depth & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Depth Selector */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={depthRange}
                onChange={(e) => {
                  setDepthRange(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">Mọi độ sâu</option>
                <option value="shallow" className="bg-slate-900 text-emerald-400">Chấn tiêu nông (&lt; 70 km)</option>
                <option value="intermediate" className="bg-slate-900 text-amber-400">Trung bình (70 - 300 km)</option>
                <option value="deep" className="bg-slate-900 text-purple-400">Chấn tiêu sâu (&gt; 300 km)</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 shadow-inner">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "event_time" | "magnitude" | "depth_km");
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="event_time" className="bg-slate-900 text-white">Sắp xếp: Thời gian</option>
                <option value="magnitude" className="bg-slate-900 text-white">Sắp xếp: Độ lớn (M)</option>
                <option value="depth_km" className="bg-slate-900 text-white">Sắp xếp: Độ sâu chấn tiêu</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 hover:text-white cursor-pointer"
                title="Đổi chiều sắp xếp"
              >
                {sortOrder.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="text-slate-400">
            Tìm thấy <span className="font-bold text-white">{totalCount}</span> sự kiện địa chấn
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{error} — Không thể kết nối Backend API. Vui lòng kiểm tra dịch vụ API tại cổng 8000.</span>
          </div>
          <button
            onClick={() => loadEarthquakes()}
            className="font-semibold text-amber-200 underline hover:text-white cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN EARTHQUAKE DATA TABLE (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4">Mã Sự Kiện & Nguồn</th>
                <th className="px-6 py-4">Cường Độ (Magnitude)</th>
                <th className="px-6 py-4">Độ Sâu Chấn Tiêu</th>
                <th className="px-6 py-4">Khu Vực & Tọa Độ WGS84</th>
                <th className="px-6 py-4">Thời Gian Xảy Ra ({tzMode})</th>
                <th className="px-6 py-4 text-right">Chi Tiết & USGS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-800 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-60 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-slate-800 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <Activity className="h-10 w-10 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-medium">Không tìm thấy sự kiện nào phù hợp với bộ lọc hiện tại.</p>
                    <p className="text-xs text-slate-600 mt-1">Hãy thử xóa từ khóa tìm kiếm hoặc bấm nút "Làm Mới".</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  let magBadgeClass = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
                  if (event.magnitude >= 6.0) magBadgeClass = "bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse";
                  else if (event.magnitude >= 5.0) magBadgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/35";
                  else if (event.magnitude >= 4.0) magBadgeClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";

                  let depthTag = "Nông";
                  let depthColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                  if (event.depth_km >= 300) {
                    depthTag = "Sâu";
                    depthColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
                  } else if (event.depth_km >= 70) {
                    depthTag = "Trung bình";
                    depthColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  }

                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Event ID */}
                      <td className="px-6 py-4 font-mono text-cyan-400 text-xs font-medium">
                        <div className="flex items-center space-x-2">
                          <span className="group-hover:underline">{event.source_event_id}</span>
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            {event.source}
                          </span>
                        </div>
                      </td>

                      {/* Magnitude */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${magBadgeClass}`}>
                          <span>M {event.magnitude.toFixed(1)}</span>
                          {event.magnitude_type && (
                            <span className="text-[10px] opacity-75 font-normal">({event.magnitude_type})</span>
                          )}
                        </span>
                      </td>

                      {/* Depth */}
                      <td className="px-6 py-4 text-xs font-mono">
                        <span className="font-semibold text-white">{event.depth_km} km</span>
                        <span className={`block w-fit text-[10px] px-1.5 py-0.5 rounded border mt-0.5 ${depthColor}`}>
                          {depthTag}
                        </span>
                      </td>

                      {/* Place & Coordinates */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200 text-xs flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-sm">{event.place || "Khu vực đại dương"}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          {event.latitude.toFixed(3)}°N, {event.longitude.toFixed(3)}°E
                        </span>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-300">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatEventTime(event.event_time, tzMode)}</span>
                        </div>
                        <span className="text-[11px] text-cyan-400/80 block mt-0.5">
                          {getRelativeTime(event.event_time)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                          >
                            <Info className="h-3 w-3 text-cyan-400" />
                            <span>Chi tiết</span>
                          </button>

                          {event.source_url && (
                            <a
                              href={event.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-colors"
                            >
                              <span>USGS</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <span>
              Trang <span className="font-semibold text-white">{currentPage}</span> / <span className="font-semibold text-white">{totalPages}</span> (Tổng: {totalCount} sự kiện)
            </span>
            <div className="flex items-center space-x-1">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trước</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. EVENT DETAIL MODAL (WHEN A ROW IS CLICKED)
      ───────────────────────────────────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Chi Tiết Sự Kiện: <span className="font-mono text-cyan-400">{selectedEvent.source_event_id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Cường Độ (Magnitude)</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  M {selectedEvent.magnitude.toFixed(1)} {selectedEvent.magnitude_type ? `(${selectedEvent.magnitude_type})` : ""}
                </span>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Độ Sâu Chấn Tiêu</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">
                  {selectedEvent.depth_km} km
                </span>
              </div>

              <div className="col-span-2 rounded-xl bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Địa Danh / Vị Trí</span>
                <div className="text-sm font-semibold text-slate-200 flex items-center space-x-1.5">
                  <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>{selectedEvent.place || "Khu vực đại dương"}</span>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Tọa Độ WGS84</span>
                <span className="font-mono text-slate-300 block">
                  Vĩ độ: {selectedEvent.latitude}° | Kinh độ: {selectedEvent.longitude}°
                </span>
              </div>

              <div className="col-span-2 rounded-xl bg-slate-950 p-3 border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px] block">Thời Gian Xảy Ra ({tzMode})</span>
                <span className="font-mono text-slate-300 block">
                  {formatEventTime(selectedEvent.event_time, tzMode)}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {selectedEvent.source_url ? (
                <a
                  href={selectedEvent.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline"
                >
                  <span>Xem báo cáo chính thức trên USGS</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : <div />}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
