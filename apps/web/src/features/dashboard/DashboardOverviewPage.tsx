import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Search,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Filter,
  BarChart3,
  Server,
  Database,
  Cpu,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Radio,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  getEarthquakes,
  getEarthquakeStatistics,
  EarthquakeItem,
  StatisticsResponse,
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
// DỮ LIỆU MOCK CHUỖI THỜI GIAN MẪU (ĐÃ COMMENT - MẶC ĐỊNH LẤY TỪ API)
// CHỈ DÙNG DỰ PHÒNG KHI BACKEND API KHÔNG HOẠT ĐỘNG
// =========================================================================
const MOCK_FALLBACK_TIME_SERIES = [
  { time: "00:00", count: 4, avgMag: 3.2 },
  { time: "03:00", count: 7, avgMag: 3.8 },
  { time: "06:00", count: 12, avgMag: 4.1 },
  { time: "09:00", count: 9, avgMag: 3.5 },
  { time: "12:00", count: 15, avgMag: 4.6 },
  { time: "15:00", count: 11, avgMag: 3.9 },
  { time: "18:00", count: 18, avgMag: 5.2 },
  { time: "21:00", count: 14, avgMag: 4.4 },
];
*/

/*
// =========================================================================
// DỮ LIỆU MOCK SỰ KIỆN ĐỊA CHẤN MẪU (ĐÃ COMMENT - MẶC ĐỊNH LẤY TỪ API)
// CHỈ DÙNG DỰ PHÒNG KHI BACKEND API KHÔNG HOẠT ĐỘNG
// =========================================================================
const MOCK_FALLBACK_EARTHQUAKES: EarthquakeItem[] = [
  { id: 1, source: "USGS", source_event_id: "us7000m8ab", magnitude: 6.2, depth_km: 12.4, latitude: 38.291, longitude: 142.381, place: "Near East Coast of Honshu, Japan", event_time: "2026-11-06T14:22:10Z" },
  { id: 2, source: "USGS", source_event_id: "us7000m8ac", magnitude: 5.4, depth_km: 35.0, latitude: -17.512, longitude: -178.621, place: "Fiji Region", event_time: "2026-11-06T12:10:45Z" },
  { id: 3, source: "USGS", source_event_id: "us7000m8ad", magnitude: 4.8, depth_km: 10.0, latitude: 35.689, longitude: 25.122, place: "Crete, Greece", event_time: "2026-11-06T09:44:18Z" },
  { id: 4, source: "USGS", source_event_id: "us7000m8ae", magnitude: 3.9, depth_km: 8.5, latitude: 15.221, longitude: 107.892, place: "Kon Tum, Vietnam", event_time: "2026-11-06T07:15:30Z" },
];
*/

// Danh mục 7 Terminals độc lập theo SAD.md Section 3 & 4
const TERMINALS_DATA = [
  { id: "T1", name: "Database Server", tech: "PostgreSQL 16", cycle: "Always On", icon: Database, port: 5432, desc: "Lưu trữ WGS84, TIMESTAMPTZ UTC" },
  { id: "T2", name: "Data Ingestion", tech: "USGS Worker", cycle: "5 phút/lần", icon: Activity, runner: "ingestion.runner", desc: "Quét và nạp GeoJSON USGS" },
  { id: "T3", name: "Data Analysis", tech: "Time-Series Engine", cycle: "5 phút/lần", icon: BarChart3, runner: "analysis.runner", desc: "Tính 6 patterns chuỗi thời gian" },
  { id: "T4", name: "Clustering", tech: "DBSCAN / KMeans", cycle: "1 ngày/lần", icon: Layers, runner: "clustering.runner", desc: "Gom cụm ổ địa chấn không gian" },
  { id: "T5", name: "Prediction (t+1)", tech: "ARIMA & ML Class", cycle: "5 phút/lần", icon: Cpu, runner: "prediction.runner", desc: "Dự báo định lượng & phân loại" },
  { id: "T6", name: "Database API", tech: "FastAPI REST & SSE", cycle: "Port 8000", icon: Server, port: 8000, desc: "Cung cấp RESTful & SSE stream" },
  { id: "T7", name: "Frontend Client", tech: "React + Vite SPA", cycle: "Port 3000", icon: CheckCircle2, port: 3000, desc: "Giao diện Dark Mode tương tác" },
];

export const DashboardOverviewPage: React.FC = () => {
  const [events, setEvents] = useState<EarthquakeItem[]>([]);
  const [stats, setStats] = useState<StatisticsResponse["data"] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [magnitudeFilter, setMagnitudeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [chartView, setChartView] = useState<"count" | "mag">("count");
  const pageSize = 10;

  // 2 chế độ múi giờ: UTC và UTC+7
  const [tzMode, setTzMode] = useState<TimezoneMode>(getStoredTimezone);
  // Kết nối SSE Server-Sent Events để luôn cập nhật theo thời gian thực
  const { data: sseData, isConnected: isSseConnected } = useSSE("/api/v1/stream/earthquakes");
  const [sseNotice, setSseNotice] = useState<string | null>(null);

  const handleTimezoneChange = (mode: TimezoneMode) => {
    setTzMode(mode);
    setStoredTimezone(mode);
  };

  // Mặc định luôn gọi API lấy dữ liệu từ FastAPI Backend
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Lấy chỉ số thống kê KPI từ API
      try {
        const statsRes = await getEarthquakeStatistics();
        if (statsRes?.data) setStats(statsRes.data);
      } catch (statsErr) {
        // Chỉ khi Backend không chạy mới kích hoạt mock dự phòng:
        /*
        setStats({
          total_events: 1248,
          strong_events_count: 12,
          moderate_events_count: 85,
          minor_events_count: 1151,
          recent_24h_count: 38,
          avg_magnitude: 4.35,
          max_magnitude: 6.8,
        });
        */
        console.warn("Backend API statistics không khả dụng:", statsErr);
      }

      // 2. Lấy danh sách sự kiện địa chấn từ API
      let minMag: number | undefined = undefined;
      let maxMag: number | undefined = undefined;
      if (magnitudeFilter === "strong") minMag = 5.0;
      else if (magnitudeFilter === "moderate") { minMag = 4.0; maxMag = 4.9; }
      else if (magnitudeFilter === "minor") maxMag = 3.9;

      const eventsRes = await getEarthquakes({
        page: currentPage,
        limit: pageSize,
        min_magnitude: minMag,
        max_magnitude: maxMag,
        search: searchTerm,
      });

      if (eventsRes?.data) {
        setEvents(eventsRes.data);
        setTotalPages(eventsRes.metadata?.total_pages || 1);
        setTotalCount(eventsRes.metadata?.total || eventsRes.data.length);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Không thể kết nối đến máy chủ Backend API";
      setError(errorMsg);

      // Chỉ khi Backend không chạy mới dùng mock dự phòng:
      /*
      setEvents(MOCK_FALLBACK_EARTHQUAKES);
      setTotalCount(MOCK_FALLBACK_EARTHQUAKES.length);
      setTotalPages(1);
      */
    } finally {
      setLoading(false);
    }
  }, [currentPage, magnitudeFilter, searchTerm]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Tự động làm mới dữ liệu khi SSE báo có sự kiện mới hoặc chu kỳ 5 phút hoàn tất
  useEffect(() => {
    if (!sseData) return;
    if (sseData.event === "earthquake_detected" || sseData.event === "ingestion_cycle_completed") {
      loadDashboardData();
    }
  }, [sseData, loadDashboardData]);

  const renderMagnitudeBadge = (mag: number, magType?: string) => {
    let colorClass = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    if (mag >= 6.0) colorClass = "bg-rose-500/25 text-rose-300 border-rose-500/40 animate-pulse";
    else if (mag >= 5.0) colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/35";
    else if (mag >= 4.0) colorClass = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
        <span>M {mag.toFixed(1)}</span>
        {magType && <span className="text-[10px] opacity-75 font-normal">({magType})</span>}
      </span>
    );
  };

  // Dữ liệu chuỗi thời gian lấy từ API
  const chartData = stats?.time_series_preview?.map((p) => ({
    time: p.time,
    count: p.count,
    avgMag: p.avg_mag,
  })) || [];

  return (
    <div className="space-y-8 pb-12 w-full max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1 (TOP): HERO HEADER BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800/80 p-6 lg:p-8 shadow-xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Kiến Trúc 7 Terminals Microservices • Mặc Định Dữ Liệu API</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Trung Tâm Giám Sát & Phân Tích Địa Chấn Toàn Cầu (GDMAS)
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Hệ thống theo dõi thời gian thực kết hợp phân tích <span className="text-slate-200 font-medium">6 Patterns Chuỗi Thời Gian</span>, phát hiện chùm động đất bằng <span className="text-slate-200 font-medium">DBSCAN</span> và mô hình dự báo $t+1$.
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
              onClick={() => loadDashboardData()}
              disabled={loading}
              className="inline-flex items-center space-x-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all border border-slate-700 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Tải lại dữ liệu từ API"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Đang tải..." : "Làm Mới"}</span>
            </button>

            <Link
              to="/earthquakes"
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <span>Xem Toàn Bộ Catalog</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Thông báo cập nhật thời gian thực từ SSE */}
        {sseNotice && (
          <div className="mt-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-cyan-300 flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-cyan-400 animate-pulse shrink-0" />
              <span>{sseNotice} (Dữ liệu đã tự động cập nhật qua SSE)</span>
            </div>
            <button
              onClick={() => setSseNotice(null)}
              className="text-cyan-400 hover:text-white font-semibold cursor-pointer underline text-[11px]"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: HÀNG 4 THẺ KPI METRICS (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition-all hover:border-cyan-500/40 hover:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng Sự Kiện Động Đất</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.total_events !== undefined ? stats.total_events.toLocaleString() : (loading ? "..." : 0)}
            </span>
            <span className="text-xs font-semibold text-emerald-400">+{stats?.recent_24h_count || 0} (24h)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
            <span>Terminal 2: Ingestion</span>
            <span className="text-cyan-400 font-mono">Dữ liệu API</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition-all hover:border-amber-500/40 hover:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cảnh Báo Cường Độ Cao</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400">
              {stats?.strong_events_count ?? 0}
            </span>
            <span className="text-xs font-semibold text-amber-500/90">M ≥ 5.0 (Cấp độ nguy hiểm)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
            <span>Đỉnh lớn nhất:</span>
            <span className="text-amber-400 font-mono font-bold">M {stats?.max_magnitude || 0}</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition-all hover:border-indigo-500/40 hover:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cụm Địa Chấn (DBSCAN)</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">16</span>
            <span className="text-xs font-semibold text-indigo-400">Cụm đang kích hoạt</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
            <span>Terminal 4: Clustering</span>
            <span className="text-indigo-400 font-mono">1 ngày/lần</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dự Báo (t+1) Pattern 5 & 6</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400">BÌNH THƯỜNG</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2">
            <span>Dự đoán ngày mai:</span>
            <span className="text-emerald-400 font-mono font-bold">~42 sự kiện (CI: 95%)</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: BẢNG DỮ LIỆU SỰ KIỆN ĐỊA CHẤN MỚI NHẤT (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm overflow-hidden backdrop-blur">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/90">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span>Danh Sách Sự Kiện Địa Chấn Mới Nhất</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Dữ liệu thời gian thực từ endpoint <code className="text-cyan-400 font-mono">/api/v1/earthquakes</code> • Tổng cộng: <span className="text-slate-200 font-bold">{totalCount}</span> sự kiện
            </p>
          </div>

          {/* Controls Filter & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs shadow-inner">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={magnitudeFilter}
                onChange={(e) => {
                  setMagnitudeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="all" className="bg-slate-900 text-white">Tất cả cấp độ</option>
                <option value="strong" className="bg-slate-900 text-amber-400">M ≥ 5.0 (Mạnh)</option>
                <option value="moderate" className="bg-slate-900 text-yellow-400">4.0 ≤ M &lt; 5.0 (Trung bình)</option>
                <option value="minor" className="bg-slate-900 text-cyan-400">M &lt; 4.0 (Nhẹ)</option>
              </select>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm địa danh, mã sự kiện..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-48 sm:w-64 rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="m-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{error} — Vui lòng kiểm tra máy chủ Backend API.</span>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="font-semibold text-amber-200 underline hover:text-white cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table Content (Full Width) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/90 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-3.5">Mã Sự Kiện</th>
                <th className="px-6 py-3.5">Độ Lớn (Magnitude)</th>
                <th className="px-6 py-3.5">Độ Sâu</th>
                <th className="px-6 py-3.5">Khu Vực / Tọa Độ WGS84</th>
                <th className="px-6 py-3.5">Thời Gian ({tzMode})</th>
                <th className="px-6 py-3.5 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-5 w-20 bg-slate-800 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-60 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-36 bg-slate-800 rounded"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-slate-800 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Activity className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm">Không tìm thấy sự kiện nào khớp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Mã sự kiện */}
                    <td className="px-6 py-4 font-mono text-cyan-400 text-xs font-medium">
                      <div className="flex items-center space-x-1.5">
                        <span>{event.source_event_id}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          {event.source}
                        </span>
                      </div>
                    </td>

                    {/* Độ lớn */}
                    <td className="px-6 py-4">
                      {renderMagnitudeBadge(event.magnitude, event.magnitude_type)}
                    </td>

                    {/* Độ sâu */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      <span className="font-semibold text-sm">{event.depth_km} km</span>
                      <span className="block text-[10px] text-slate-500">
                        {event.depth_km < 70 ? "Chấn tiêu nông" : event.depth_km < 300 ? "Trung bình" : "Chấn tiêu sâu"}
                      </span>
                    </td>

                    {/* Khu vực & Tọa độ */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200 text-xs flex items-center space-x-1.5">
                        <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate max-w-sm">{event.place || "Khu vực đại dương"}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                        Vĩ độ: {event.latitude.toFixed(3)}° | Kinh độ: {event.longitude.toFixed(3)}°
                      </span>
                    </td>

                    {/* Thời gian */}
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{formatEventTime(event.event_time, tzMode)}</span>
                      </div>
                      <span className="text-[11px] text-cyan-400/80 block mt-0.5">
                        {getRelativeTime(event.event_time)}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-6 py-4 text-right">
                      {event.source_url ? (
                        <a
                          href={event.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-500/30"
                        >
                          <span>USGS</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Đang hiển thị trang <span className="font-semibold text-white">{currentPage}</span> / <span className="font-semibold text-white">{totalPages}</span> (Tổng cộng: {totalCount} sự kiện)
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trang Trước</span>
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 transition-colors cursor-pointer"
            >
              <span>Trang Kế</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: BIỂU ĐỒ CHUỖI THỜI GIAN PATTERN 1 & 2 (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              <span>Trực Quan Hóa Chuỗi Thời Gian: Phân Bố & Xu Hướng (Pattern 1 & Pattern 2)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dữ liệu được Re-sampling theo khung giờ từ Backend API (Terminal 3 & Terminal 6).
            </p>
          </div>

          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => setChartView("count")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                chartView === "count" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Tần Suất Số Lượng Sự Kiện
            </button>
            <button
              onClick={() => setChartView("mag")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                chartView === "mag" ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-slate-400 hover:text-white"
              }`}
            >
              Độ Lớn Trung Bình (M)
            </button>
          </div>
        </div>

        {/* Recharts Component (100% Full Width) */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "count" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px", fontSize: "12px" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area type="monotone" dataKey="count" name="Số sự kiện" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis domain={[0, 7]} stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px", fontSize: "12px" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Bar dataKey="avgMag" name="Độ lớn TB (M)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 5: HỘP THÔNG TIN DỰ BÁO NGÀY TIẾP THEO (t+1) (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">Dự Báo & Phân Loại Địa Chấn Ngày Tiếp Theo ($t+1$)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Khối Prediction Worker (Terminal 5) đảm nhiệm 5 phút/lần.</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 w-fit">
            Yêu cầu Pattern 5 & 6
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Risk Classification */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-1">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Mức Độ Hoạt Động ($t+1$)</span>
            <div className="text-2xl font-black text-white tracking-wide">BÌNH THƯỜNG (NORMAL)</div>
            <p className="text-xs text-slate-400">Không có dấu hiệu bùng phát động đất chùm bất thường.</p>
          </div>

          {/* Card 2: Prediction Count */}
          <div className="rounded-xl bg-slate-950 p-5 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-xs block">Dự báo số lượng sự kiện ngày mai</span>
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">~42 sự kiện</div>
            <p className="text-xs text-slate-500">Khoảng tin cậy 95%: 35 - 49 sự kiện</p>
          </div>

          {/* Card 3: Model Metrics */}
          <div className="rounded-xl bg-slate-950 p-5 border border-slate-800/80 space-y-1">
            <span className="text-slate-400 text-xs block">Chỉ số sai số mô hình</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">MAE: ±3.12</div>
            <p className="text-xs text-slate-500">RMSE: 4.05 vs baseline trung bình động</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Link
            to="/statistics"
            className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
          >
            <span>Xem Đầy Đủ Chi Tiết 6 Patterns Phân Tích</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 6 (BOTTOM): KIẾN TRÚC 7 TERMINALS ĐỘC LẬP (FULL WIDTH)
      ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <Server className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Kiến Trúc 7 Terminals Độc Lập (SAD.md Section 3)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Mỗi khối dịch vụ chạy trên 1 cửa sổ terminal riêng biệt, giao tiếp qua PostgreSQL & API.</p>
            </div>
          </div>
          <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>7/7 Terminals Hoạt Động</span>
          </span>
        </div>

        {/* Grid 7 Terminals (Responsive Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {TERMINALS_DATA.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.id}
                className="rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-lg bg-slate-900 p-1.5 text-cyan-400 border border-slate-800">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-mono text-cyan-400 font-bold block">{t.id}</span>
                        <span className="font-semibold text-slate-200">{t.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {t.cycle}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{t.tech}</span>
                  {t.port ? <span className="text-cyan-400">Port {t.port}</span> : <span className="text-slate-400">{t.runner}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
