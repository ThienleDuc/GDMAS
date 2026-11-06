import React from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, Printer, Download, FileText, CheckCircle2 } from "lucide-react";

export const ReportLayout: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 font-sans print:bg-white print:text-black">
      {/* Non-printable top action bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400" />
            <span>Về Dashboard</span>
          </Link>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              title="In báo cáo"
            >
              <Printer className="h-4 w-4 text-cyan-400" />
              <span>In Báo Cáo</span>
            </button>
            <button
              onClick={() => alert("Tính năng xuất PDF đang được chuẩn bị")}
              className="flex items-center space-x-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
              title="Xuất file PDF"
            >
              <Download className="h-4 w-4" />
              <span>Tải PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Report Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0">
        {/* Report Official Header */}
        <div className="border-b border-slate-800 pb-6 mb-8 print:border-black print:pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400 mb-1 print:text-black">
                <FileText className="h-5 w-5" />
                <span className="text-xs uppercase font-mono tracking-widest font-bold">
                  Hệ Thống Phân Tích Địa Chấn GDMAS
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white print:text-black">
                Báo Cáo Phân Tích & Giám Sát Chuỗi Thời Gian Động Đất
              </h1>
              <p className="text-xs text-slate-400 mt-1 print:text-gray-600">
                Tài liệu tổng hợp 6 patterns động đất: cyclic, burst, swarm, quiet, aftershock, foreshock.
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end text-xs font-mono text-slate-400 print:text-black">
              <span className="flex items-center space-x-1 text-emerald-400 print:text-black">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified by GDMAS Core</span>
              </span>
              <span className="mt-1">ISO: GDMAS-RPT-{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Content Rendered via Outlet */}
        <main className="pb-12 print:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

