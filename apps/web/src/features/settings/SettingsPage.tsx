import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  HelpCircle,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { HealthResponse, SystemStatusResponse } from "../../contracts";
import { ErrorState, UnavailableNotice } from "../../components/ui/AsyncState";
import { getHealthOptional, getSystemStatusOptional } from "../../services/earthquake-api";
import {
  formatEventTime,
  getStoredTimezone,
  setStoredTimezone,
  type TimezoneMode,
} from "../../utils/timezone";
import {
  evaluateServiceFreshness,
  formatElapsedMinutes,
  TERMINAL_KEYS,
  TERMINAL_SPECS,
} from "./settings-data";

export const SettingsPage: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusResponse | null>(null);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [timezoneMode, setTimezoneModeState] = useState<TimezoneMode>(getStoredTimezone());

  // Trạng thái kiểm tra kết nối API thủ công
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sysRes, healthRes] = await Promise.all([
        getSystemStatusOptional(),
        getHealthOptional(),
      ]);

      if (sysRes.unavailable) {
        setStatusUnavailable(true);
        setStatusData(null);
      } else {
        setStatusUnavailable(false);
        setStatusData(sysRes.data);
      }

      if (!healthRes.unavailable && healthRes.data) {
        setHealthData(healthRes.data);
      }

      setLastCheckTime(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi nạp trạng thái hệ thống");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll mỗi 30 giây
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTimezoneChange = (mode: TimezoneMode) => {
    setTimezoneModeState(mode);
    setStoredTimezone(mode);
  };

  const handlePingHealth = async () => {
    setPingLoading(true);
    const start = Date.now();
    try {
      const res = await getHealthOptional();
      const elapsed = Date.now() - start;
      if (res.unavailable) {
        setPingResult({
          success: false,
          message: `Endpoint /api/v1/health chưa có trên Backend (phản hồi 404 sau ${elapsed}ms)`,
          timestamp: new Date().toISOString(),
        });
      } else if (res.data?.success) {
        setPingResult({
          success: true,
          message: `Kết nối Backend thành công! Độ trễ: ${elapsed}ms | Trạng thái: ${res.data.data.status} | DB: ${res.data.data.database}`,
          timestamp: new Date().toISOString(),
        });
      } else {
        setPingResult({
          success: false,
          message: `Backend phản hồi không thành công (${elapsed}ms)`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      setPingResult({
        success: false,
        message: `Lỗi kết nối: ${err instanceof Error ? err.message : "Mạng không khả dụng"}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPingLoading(false);
    }
  };

  const services = statusData?.data?.services;

  return (
    <div className="space-y-8 text-slate-200" data-testid="settings-page">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <span>Giám Sát 7 Terminals & Cài Đặt Hệ Thống</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm soát trạng thái vận hành độc lập, độ tươi mới dữ liệu theo docs/architecture.md §9.4
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Múi giờ */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Múi giờ:</span>
            <button
              type="button"
              onClick={() => handleTimezoneChange(timezoneMode === "UTC" ? "UTC+7" : "UTC")}
              className="font-mono font-bold text-cyan-300 hover:underline"
              title="Nhấp để chuyển đổi giữa UTC và Giờ địa phương UTC+7"
            >
              {timezoneMode}
            </button>
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo nếu Backend chưa có endpoint /system/status */}
      {statusUnavailable && (
        <UnavailableNotice
          endpoint="/api/v1/system/status"
          hint="Backend chưa triển khai route này (thuộc Task 4 BE). Bảng dưới đây hiển thị danh mục 7 Terminals và thông số chu kỳ chuẩn theo kiến trúc."
        />
      )}

      {error && <ErrorState message={error} onRetry={fetchStatus} />}

      {/* 1. Bảng 7 Terminals của GDMAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>Trạng Thái Vận Hành 7 Terminals</span>
          </h2>
          <span className="font-mono text-xs text-slate-500">
            Cập nhật lần cuối: {formatEventTime(lastCheckTime.toISOString(), timezoneMode)}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Terminal</th>
                  <th className="px-4 py-3">Tên Tiến Trình</th>
                  <th className="px-4 py-3">Chu Kỳ</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3">Lần Chạy Cuối</th>
                  <th className="px-4 py-3">Độ Tươi Mới (§9.4)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                {TERMINAL_KEYS.map((key) => {
                  const spec = TERMINAL_SPECS[key];
                  const svc = services ? (services[key as keyof typeof services] as any) : null;
                  const freshness = evaluateServiceFreshness(svc);

                  return (
                    <tr key={key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-cyan-400">{spec.terminalId}</td>
                      <td className="px-4 py-3 font-sans font-medium text-white">
                        {spec.name}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {spec.description}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{spec.cycle}</td>
                      <td className="px-4 py-3">
                        {svc?.status ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] uppercase font-bold ${
                              svc.status === "active" || svc.status === "running"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {svc.status}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {svc?.last_run ? (
                          <div>
                            <span>{formatEventTime(svc.last_run, timezoneMode)}</span>
                            <span className="block text-[10px] text-slate-500">
                              ({formatElapsedMinutes(freshness.diffMinutes)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-sans font-medium ${freshness.badgeClass}`}
                        >
                          {freshness.state === "fresh" && <CheckCircle2 className="h-3 w-3" />}
                          {freshness.state === "stale" && <AlertTriangle className="h-3 w-3" />}
                          {freshness.state === "interrupted" && <ShieldAlert className="h-3 w-3" />}
                          {freshness.state === "unknown" && <HelpCircle className="h-3 w-3" />}
                          <span>{freshness.label}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. Kiểm tra kết nối API & Thông tin hệ thống */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span>Kiểm Tra Trực Tiếp API Backend</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Gửi yêu cầu ping tới endpoint <code className="text-cyan-300 font-mono">GET /api/v1/health</code> để kiểm tra độ trễ mạng và trạng thái kết nối CSDL PostgreSQL 16.
          </p>

          <button
            type="button"
            onClick={handlePingHealth}
            disabled={pingLoading}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
          >
            {pingLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Kiểm tra kết nối</span>
          </button>

          {pingResult && (
            <div
              className={`mt-4 rounded-lg border p-3 text-xs leading-relaxed ${
                pingResult.success
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}
            >
              <p className="font-semibold">{pingResult.message}</p>
              <p className="mt-1 font-mono text-[10px] opacity-75">
                Thời gian: {formatEventTime(pingResult.timestamp, timezoneMode)}
              </p>
            </div>
          )}

          {healthData?.success && !pingResult && (
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Trạng thái định kỳ /health:</span>{" "}
              <span className="text-emerald-400 font-mono font-bold">{healthData.data.status}</span> · DB:{" "}
              <span className="text-cyan-400 font-mono font-bold">{healthData.data.database}</span>
            </div>
          )}
        </div>

        {/* 3. Hướng dẫn Kịch bản Demo 6 bước */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-purple-400" />
            <span>Kịch Bản Demo 6 Bước (docs/yeucaubatbuoc.md §4)</span>
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B1:</span>
              <span>Khởi động 7 Terminals độc lập qua runner.py riêng biệt.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B2:</span>
              <span>Xoá CSDL kiểm chứng: cả 5 trang chuyển sang Empty State không có mock.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B3:</span>
              <span>Lắng nghe SSE: kết nối tự phục hồi, hiển thị banner CSDL đã bị xoá.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B4:</span>
              <span>Ingestion đồng bộ dữ liệu: biểu đồ thống kê và bản đồ cập nhật tự động.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B5:</span>
              <span>Phân tích 6 Patterns và phân cụm DBSCAN không gian.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-cyan-400 font-bold shrink-0">B6:</span>
              <span>Xuất báo cáo PDF/Print chuẩn định dạng và kiểm soát độ tươi mới §9.4.</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};
