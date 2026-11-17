import React from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, Printer, Download, FileText, CheckCircle2 } from "lucide-react";

export const ReportLayout: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="layout layout--report">
      {/* Non-printable top action bar */}
      <header className="layout__report-toolbar layout__no-print">
        <div className="layout__report-toolbar-inner">
          <Link
            to="/"
            className="layout__back-link"
          >
            <ArrowLeft className="layout__icon layout__icon--primary" />
            <span>Về Dashboard</span>
          </Link>

          <div className="layout__report-actions">
            <button
              onClick={handlePrint}
              className="layout__button"
              title="In báo cáo"
            >
              <Printer className="layout__icon layout__icon--primary" />
              <span>In Báo Cáo</span>
            </button>
            <button
              onClick={() => alert("Tính năng xuất PDF đang được chuẩn bị")}
              className="layout__button ds-button-primary"
              title="Xuất file PDF"
            >
              <Download className="h-4 w-4" />
              <span>Tải PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Report Container */}
      <div className="layout__report-document">
        {/* Report Official Header */}
        <div className="layout__report-heading">
          <div className="layout__report-heading-row">
            <div>
              <div className="layout__report-kicker">
                <FileText className="h-5 w-5" />
                <span className="layout__report-kicker-text">
                  Hệ Thống Phân Tích Địa Chấn GDMAS
                </span>
              </div>
              <h1 className="page-title">
                Báo Cáo Phân Tích & Giám Sát Chuỗi Thời Gian Động Đất
              </h1>
              <p className="text-caption layout__report-summary">
                Tài liệu tổng hợp 6 patterns động đất: cyclic, burst, swarm, quiet, aftershock, foreshock.
              </p>
            </div>
            <div className="layout__report-meta hidden sm:flex">
              <span className="layout__report-verified">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified by GDMAS Core</span>
              </span>
              <span>ISO: GDMAS-RPT-{new Date().getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Content Rendered via Outlet */}
        <main className="layout__report-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

