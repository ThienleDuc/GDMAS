import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Globe,
  Map,
  FileText,
  Settings,
  Radio,
  Menu,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import { IngestionToast, ToastData } from "../components/ui/IngestionToast";
import { formatEventTime } from "../utils/timezone";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", path: "/", icon: Layers },
  { label: "Bản đồ Giám sát", path: "/monitoring", icon: Map, badge: "Live" },
  { label: "Danh mục Động đất", path: "/earthquakes", icon: Activity },
  { label: "6 Patterns Phân tích", path: "/statistics", icon: BarChart3 },
  { label: "Báo cáo & Xuất bản", path: "/reports", icon: FileText },
  { label: "Cấu hình Hệ thống", path: "/settings", icon: Settings },
];

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTimeUtc, setCurrentTimeUtc] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const location = useLocation();

  // Kết nối SSE để nhận thông báo cào dữ liệu tự động 5 phút
  const { data: sseData } = useSSE("/api/v1/stream/earthquakes");

  useEffect(() => {
    if (!sseData) return;

    if (sseData.event === "ingestion_cycle_completed" || sseData.event === "earthquake_detected") {
      const payloadData = sseData.data as {
        title?: string;
        message?: string;
        records_processed?: number;
      };

      const title =
        payloadData?.title ||
        (sseData.event === "earthquake_detected"
          ? "Phát Hiện Sự Kiện Địa Chấn Mới"
          : "Cập Nhật Dữ Liệu Tự Động (Chu kỳ 5 phút)");

      const message =
        payloadData?.message ||
        "Đã hoàn thành chu kỳ cào dữ liệu từ trạm địa chấn USGS.";

      const time = formatEventTime(sseData.timestamp, "UTC+7");

      setToast({
        title,
        message,
        records_processed: payloadData?.records_processed,
        time,
      });
    }
  }, [sseData]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeUtc(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-all duration-300 z-30 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Globe className="h-6 w-6 animate-pulse" />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-wider text-cyan-400">GDMAS</span>
                <span className="text-[10px] text-slate-400 tracking-tight whitespace-nowrap">
                  Disaster Monitoring
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            title={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-300"
                  }`}
                />
                {sidebarOpen && (
                  <span className="ml-3 flex-1 whitespace-nowrap truncate">{item.label}</span>
                )}
                {sidebarOpen && item.badge && (
                  <span className="ml-auto rounded-full bg-cyan-900/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-700/50">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: Service Status */}
        <div className="border-t border-slate-800 p-3">
          {sidebarOpen ? (
            <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-emerald-400">7 Terminals Sẵn Sàng</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">FastAPI, PostgreSQL & 4 Workers</p>
            </div>
          ) : (
            <div className="flex justify-center" title="7 Terminals Sẵn Sàng">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/70 px-6 backdrop-blur">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span className="font-medium text-slate-200">GDMAS Console</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-cyan-400 font-mono text-xs uppercase tracking-wide">
              {location.pathname === "/" ? "Tổng quan" : location.pathname.replace("/", "")}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 rounded-md bg-slate-800/80 px-3 py-1 border border-slate-700/60 text-xs font-mono text-slate-300">
              <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span>{currentTimeUtc || "UTC SYNC"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs text-slate-300 font-medium">PostgreSQL Connected</span>
            </div>
          </div>
        </header>

        {/* Nested Content rendered via Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <Outlet />
        </main>
      </div>

      {/* Toast thông báo cập nhật tự động 5 phút (Tự động tắt sau 5s hoặc bấm X tắt ngay) */}
      <IngestionToast
        toast={toast}
        onClose={() => setToast(null)}
        durationMs={5000}
      />
    </div>
  );
};

