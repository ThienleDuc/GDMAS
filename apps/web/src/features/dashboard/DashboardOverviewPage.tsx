import React from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Layers, Radio, ArrowUpRight, TrendingUp } from "lucide-react";

export const DashboardOverviewPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Bảng Điều Khiển Giám Sát Địa Chấn Toàn Cầu
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Hệ thống GDMAS tích hợp 7 Terminals độc lập: FastAPI Backend, PostgreSQL DB và 4 Workers chuyên trách.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/monitoring"
              className="inline-flex items-center space-x-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors shadow-sm"
            >
              <span>Xem Bản Đồ Trực Tiếp</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Số Sự Kiện</span>
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">1,248</span>
            <span className="ml-2 text-xs font-medium text-emerald-400">+38 sự kiện (24h)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Chu kỳ Ingestion: 5 phút/lần</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cảnh Báo Nguy Hiểm (M &ge; 5.0)</span>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-amber-400">12</span>
            <span className="ml-2 text-xs font-medium text-amber-500">Cần theo dõi</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Động đất cấp độ mạnh</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cụm Địa Chấn (DBSCAN)</span>
            <Layers className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">16</span>
            <span className="ml-2 text-xs font-medium text-cyan-400">Cụm hoạt động</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Chu kỳ Clustering: 1 ngày/lần</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">6 Chuỗi Thời Gian Pattern</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-emerald-400">100%</span>
            <span className="ml-2 text-xs font-medium text-slate-300">Đã phân loại</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Cyclic, Swarm, Quiet, Burst...</p>
        </div>
      </div>

      {/* Quick Service Status Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
          <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span>Kiến Trúc 7 Terminals Độc Lập</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200">Terminal 1: Ingestion</span>
              <span className="text-emerald-400 font-mono">5 min</span>
            </div>
            <p className="text-slate-400">Thu thập dữ liệu USGS/EMSC định kỳ 5 phút.</p>
          </div>
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200">Terminal 2: Analysis</span>
              <span className="text-emerald-400 font-mono">1 day</span>
            </div>
            <p className="text-slate-400">Phân tích chuỗi thời gian & tính thống kê đặc trưng.</p>
          </div>
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200">Terminal 3: Clustering</span>
              <span className="text-emerald-400 font-mono">1 day</span>
            </div>
            <p className="text-slate-400">Gom cụm không gian - thời gian (DBSCAN / HDBSCAN).</p>
          </div>
          <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-200">Terminal 4: Prediction</span>
              <span className="text-emerald-400 font-mono">1 day</span>
            </div>
            <p className="text-slate-400">Mô hình phân loại chuỗi thời gian & dự báo rung chấn.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

