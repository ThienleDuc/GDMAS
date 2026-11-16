import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/AsyncState";
import { normalizeClusters, type MapCluster } from "../../components/map";
import { useDatabaseResetFromEvent } from "../../hooks/useDatabaseReset";
import { useSSE } from "../../hooks/useSSE";
import {
  getClustersOptional,
  getEarthquakeStatistics,
  getPatterns,
  getSystemStatusOptional,
  type PatternItem,
  type StatisticsResponse,
} from "../../services/earthquake-api";
import { formatEventTime, getStoredTimezone } from "../../utils/timezone";

export const ReportsPage: React.FC = () => {
  const [stats, setStats] = useState<StatisticsResponse["data"] | null>(null);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [clusters, setClusters] = useState<MapCluster[]>([]);
  const [systemStatusUnavailable, setSystemStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<string>(new Date().toISOString());

  const sse = useSSE();
  const resetInfo = useDatabaseResetFromEvent(sse.data);
  const timezone = getStoredTimezone();

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, patternsRes, clustersRes, sysRes] = await Promise.all([
        getEarthquakeStatistics().catch(() => null),
        getPatterns().catch(() => null),
        getClustersOptional().catch(() => ({ data: null, unavailable: true })),
        getSystemStatusOptional().catch(() => ({ data: null, unavailable: true })),
      ]);

      if (statsRes && statsRes.success) {
        setStats(statsRes.data);
      } else {
        setStats(null);
      }

      if (patternsRes && patternsRes.success && Array.isArray(patternsRes.patterns)) {
        setPatterns(patternsRes.patterns);
      } else {
        setPatterns([]);
      }

      if (!clustersRes.unavailable && clustersRes.data) {
        setClusters(normalizeClusters(clustersRes.data));
      } else if (patternsRes && patternsRes.clustering_summary) {
        setClusters(normalizeClusters(patternsRes));
      } else {
        setClusters([]);
      }

      setSystemStatusUnavailable(Boolean(sysRes.unavailable));
      setReportGeneratedAt(new Date().toISOString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tạo báo cáo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData, resetInfo.refreshVersion]);

  // CSDL bị xoá -> xoá dữ liệu báo cáo
  useEffect(() => {
    if (resetInfo.isCleared) {
      setStats(null);
      setPatterns([]);
      setClusters([]);
    }
  }, [resetInfo.isCleared]);

  const handlePrint = () => {
    window.print();
  };

  const isDatabaseEmpty =
    (!stats || stats.total_events === 0) &&
    patterns.length === 0 &&
    clusters.length === 0;

  // 6 Patterns chuẩn theo chuỗi thời gian GDMAS
  const patternDefs = [
    {
      type: "temporal",
      nameEn: "Temporal Analysis",
      nameVi: "Phân bố thời gian",
      description: "Phân tích mật độ xuất hiện và năng lượng địa chấn theo chuỗi thời gian",
    },
    {
      type: "trend",
      nameEn: "Trend Analysis",
      nameVi: "Xu hướng chuỗi thời gian",
      description: "Đánh giá xu hướng gia tăng hoặc suy giảm chấn động qua OLS/Theil-Sen",
    },
    {
      type: "seasonality",
      nameEn: "Seasonality Analysis",
      nameVi: "Tính mùa vụ & Chu kỳ",
      description: "Phân tích chu kỳ lặp và dao động chu kỳ của hoạt động địa chấn",
    },
    {
      type: "correlation",
      nameEn: "Correlation Analysis",
      nameVi: "Tương quan đa biến",
      description: "Tương quan ma trận giữa độ sâu (depth), độ lớn (magnitude) và khoảng thời gian",
    },
    {
      type: "prediction",
      nameEn: "Dự báo t+1",
      nameVi: "Mô hình dự báo t+1",
      description: "Dự báo số lượng và cường độ cực đại thời điểm kế tiếp kèm dải tin cậy",
    },
    {
      type: "classification",
      nameEn: "Phân loại t+1",
      nameVi: "Phân loại rủi ro t+1",
      description: "Phân loại cấp độ nguy cơ địa chấn (LOW, MEDIUM, HIGH, CRITICAL)",
    },
  ];

  return (
    <div className="space-y-8 text-slate-200 print:text-black print:space-y-6" data-testid="reports-page">
      {/* Action Header (Ẩn khi in ấn) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <span>Báo Cáo Giám Sát & Phân Tích Địa Chấn Toàn Cầu</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Thời điểm lập báo cáo: {formatEventTime(reportGeneratedAt, timezone)} (UTC: {formatEventTime(reportGeneratedAt, "UTC")})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span>Tải lại</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isDatabaseEmpty}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In báo cáo / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Banner thông báo CSDL bị xoá trống (Demo Bước 2) */}
      {resetInfo.isCleared && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300 flex items-center gap-2 print:border-black print:text-black">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>CSDL đã bị xoá trống (Demo Bước 2). Toàn bộ nội dung báo cáo chuyển sang trạng thái trống.</span>
        </div>
      )}

      {loading && !stats && (
        <LoadingState label="Đang tổng hợp dữ liệu báo cáo từ các Terminal…" />
      )}

      {error && <ErrorState message={error} onRetry={loadReportData} />}

      {/* Empty State khi chưa có dữ liệu */}
      {!loading && !error && isDatabaseEmpty && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center print:border-black print:bg-white">
          <EmptyState
            title="Chưa có dữ liệu để lập báo cáo"
            message="Cơ sở dữ liệu đang trống hoặc chưa hoàn thành chu kỳ thu thập Ingestion (Demo Bước 2/3). Vui lòng đợi worker Ingestion hoàn thành chu kỳ hoặc đồng bộ dữ liệu."
          />
        </div>
      )}

      {/* Nội dung báo cáo (chỉ hiển thị khi có dữ liệu) */}
      {!isDatabaseEmpty && (
        <>
          {/* Section 1: Executive Summary */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 print:text-black print:border-black flex items-center gap-2">
              <span className="font-mono text-cyan-400 print:text-black">1.</span>
              <span>Tóm Tắt Tình Hình Địa Chấn (Executive Summary)</span>
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 leading-relaxed text-xs sm:text-sm text-slate-300 print:border-black print:bg-white print:text-black">
              <p>
                Tính đến mốc thời gian{" "}
                <strong className="text-white print:text-black">{formatEventTime(reportGeneratedAt, timezone)}</strong>,
                hệ thống GDMAS đã ghi nhận tổng cộng{" "}
                <strong className="text-cyan-400 font-mono print:text-black font-bold">
                  {stats?.total_events?.toLocaleString() ?? 0}
                </strong>{" "}
                trận động đất toàn cầu trong CSDL.
                Trong đó bao gồm{" "}
                <strong className="text-rose-400 font-mono print:text-black">
                  {stats?.strong_events_count ?? 0}
                </strong>{" "}
                trận cường độ mạnh (M &ge; 5.0),{" "}
                <strong className="text-amber-400 font-mono print:text-black">
                  {stats?.moderate_events_count ?? 0}
                </strong>{" "}
                trận cường độ trung bình (M 3.0 &ndash; 4.9).
                Hoạt động trong 24 giờ gần nhất ghi nhận{" "}
                <strong className="text-cyan-300 font-mono print:text-black">
                  {stats?.recent_24h_count ?? 0}
                </strong>{" "}
                sự kiện, độ lớn trung bình đạt M{" "}
                <strong className="text-white font-mono print:text-black">
                  {stats?.avg_magnitude ? stats.avg_magnitude.toFixed(2) : "—"}
                </strong>{" "}
                và độ lớn cao nhất đạt M{" "}
                <strong className="text-rose-400 font-mono print:text-black">
                  {stats?.max_magnitude ? stats.max_magnitude.toFixed(1) : "—"}
                </strong>.
              </p>
            </div>
          </section>

          {/* Section 2: 6 Patterns Breakdown Table */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 print:text-black print:border-black flex items-center gap-2">
              <span className="font-mono text-cyan-400 print:text-black">2.</span>
              <span>Thống Kê 6 Patterns Chuỗi Thời Gian Bắt Buộc</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl print:border-black print:bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold uppercase text-[11px] tracking-wider print:bg-gray-100 print:text-black print:border-black">
                    <tr>
                      <th className="px-4 py-3">Loại Pattern</th>
                      <th className="px-4 py-3">Tên Tiếng Việt</th>
                      <th className="px-4 py-3">Trạng Thái</th>
                      <th className="px-4 py-3">Chỉ Số Đặc Trưng (Metrics)</th>
                      <th className="px-4 py-3">Chu Kỳ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono text-xs print:divide-black">
                    {patternDefs.map((p) => {
                      const computed = patterns.find(
                        (item) => item.type?.toLowerCase() === p.type || item.id?.toLowerCase() === p.type
                      );
                      const isComputed = computed?.status === "COMPUTED";
                      const metrics = computed?.metrics || {};

                      // Trích xuất chỉ số tóm tắt
                      let metricSummary = "—";
                      if (isComputed) {
                        if (p.type === "temporal") {
                          const pts = metrics.data_points ?? metrics.total_points ?? "—";
                          const avg = metrics.avg_magnitude ? Number(metrics.avg_magnitude).toFixed(2) : "—";
                          metricSummary = `Điểm: ${pts} | M_TB: ${avg}`;
                        } else if (p.type === "trend") {
                          const dir = metrics.trend_direction ?? "—";
                          const slope = metrics.slope ? Number(metrics.slope).toFixed(4) : "—";
                          metricSummary = `Hướng: ${dir} | Hệ số góc: ${slope}`;
                        } else if (p.type === "seasonality") {
                          const str = metrics.seasonality_strength ? Number(metrics.seasonality_strength).toFixed(3) : "—";
                          metricSummary = `Độ mạnh chu kỳ: ${str}`;
                        } else if (p.type === "correlation") {
                          const r = metrics.max_abs_r ?? metrics.correlation_depth_mag ?? "—";
                          metricSummary = `Tương quan chính: ${r}`;
                        } else if (p.type === "prediction") {
                          const pred = metrics.predicted_value ? Number(metrics.predicted_value).toFixed(2) : "—";
                          metricSummary = `Dự báo t+1: ${pred}`;
                        } else if (p.type === "classification") {
                          const label = metrics.predicted_label ?? metrics.risk_level ?? "—";
                          metricSummary = `Cấp rủi ro: ${label}`;
                        }
                      }

                      return (
                        <tr key={p.type} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                          <td className="px-4 py-3 font-bold text-cyan-400 print:text-black">
                            {p.nameEn}
                          </td>
                          <td className="px-4 py-3 font-sans font-medium text-white print:text-black">
                            {p.nameVi}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold uppercase print:border print:border-black print:text-black ${
                                isComputed
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {isComputed ? "COMPUTED" : "PENDING"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 print:text-black">
                            {metricSummary}
                          </td>
                          <td className="px-4 py-3 text-slate-400 print:text-black font-sans">
                            {computed?.period || "5 phút"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 3: DBSCAN Clusters Summary */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 print:text-black print:border-black flex items-center gap-2">
              <span className="font-mono text-cyan-400 print:text-black">3.</span>
              <span>Tổng Hợp Cụm Không Gian Địa Chấn (DBSCAN Clustering)</span>
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-black print:bg-white text-xs sm:text-sm">
              {clusters.length > 0 ? (
                <div>
                  <p className="text-slate-300 print:text-black mb-3">
                    Thuật toán DBSCAN đã phát hiện{" "}
                    <strong className="text-purple-400 font-mono font-bold print:text-black">
                      {clusters.length} cụm địa chấn
                    </strong>{" "}
                    có mật độ hoạt động cao:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {clusters.slice(0, 6).map((c) => (
                      <div
                        key={c.clusterId}
                        className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 print:border-black print:bg-white"
                      >
                        <p className="font-bold text-purple-300 print:text-black">
                          {c.name || c.dominantPlace || `Cụm #${c.clusterId}`}
                        </p>
                        <div className="mt-1 font-mono text-[11px] text-slate-400 print:text-black space-y-0.5">
                          <p>Số sự kiện: <strong className="text-white print:text-black">{c.eventCount}</strong></p>
                          <p>Độ lớn TB: <strong className="text-amber-300 print:text-black">{c.avgMagnitude?.toFixed(2) ?? "—"}</strong></p>
                          <p>Bán kính: {c.radiusKm ? `${c.radiusKm} km` : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 print:text-black italic">
                  Chưa ghi nhận cụm địa chấn nào được tính toán từ Terminal 4.
                </p>
              )}
            </div>
          </section>

          {/* Section 4: Operational Recommendations */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2 print:text-black print:border-black flex items-center gap-2">
              <span className="font-mono text-cyan-400 print:text-black">4.</span>
              <span>Kiến Nghị Vận Hành Hệ Thống (Operational Recommendations)</span>
            </h2>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 print:border-black print:bg-white">
              {systemStatusUnavailable && (
                <p className="mb-2 text-[11px] text-amber-400/80 italic print:text-black">
                  (Lưu ý: Endpoint /api/v1/system/status chưa triển khai trên Backend &mdash; kiến nghị dưới đây dựa trên quy tắc chuẩn kiến trúc GDMAS)
                </p>
              )}
              <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-slate-300 print:text-black">
                <li>
                  Duy trì Terminal Ingestion (T2) chạy đều chu kỳ 5 phút để bảo đảm dữ liệu địa chấn mới nhất từ USGS.
                </li>
                <li>
                  Giám sát độ tươi mới dữ liệu theo §9.4: nếu thời gian chạy lần cuối &gt; 15 phút cần kiểm tra kết nối mạng ngoài USGS.
                </li>
                <li>
                  Theo dõi chặt chẽ các cụm có độ lớn cực đại M &ge; 5.0 và kiểm tra cảnh báo SSE tự động tại Dashboard.
                </li>
                <li>
                  Định kỳ rà soát các phân loại rủi ro HIGH/CRITICAL của mô hình t+1 để đưa ra cảnh báo sớm tới các đơn vị liên quan.
                </li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
