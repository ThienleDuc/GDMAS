import React from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, Globe, ShieldAlert } from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import { ConnectionStatusBadge } from "../components/ui/ConnectionStatusBadge";

export const FullscreenMapLayout: React.FC = () => {
  const { status, reconnectAttempt } = useSSE();

  return (
    <div className="layout layout--fullscreen">
      {/* Floating Header Overlay */}
      <header className="layout__overlay">
        {/* Left: Back Navigation & Branding */}
        <div className="layout__overlay-group">
          <Link
            to="/"
            className="layout__overlay-chip layout__button"
            title="Quay về Dashboard"
          >
            <ArrowLeft className="layout__icon layout__icon--primary" />
            <span className="hidden sm:inline">Quay về Dashboard</span>
          </Link>

          <div className="layout__overlay-chip">
            <Globe className="layout__icon layout__icon--primary" />
            <span className="text-sm font-semibold">
              GDMAS Live Geospatial
            </span>
          </div>
        </div>

        {/* Right: Live SSE Stream Indicators & Quick Controls */}
        <div className="layout__overlay-group">
          <ConnectionStatusBadge status={status} reconnectAttempt={reconnectAttempt} />

          <div className="layout__overlay-chip hidden sm:flex">
            <ShieldAlert className="layout__icon" />
            <span>Cảnh báo M &ge; 5.0 Sẵn sàng</span>
          </div>
        </div>
      </header>

      {/* Main Fullscreen Outlet (Map container) */}
      <main className="layout__viewport">
        <Outlet />
      </main>
    </div>
  );
};

