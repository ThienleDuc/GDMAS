import React from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, Globe, ShieldAlert } from "lucide-react";
import { useSSE } from "../hooks/useSSE";
import { ConnectionStatusBadge } from "../components/ui/ConnectionStatusBadge";

export const FullscreenMapLayout: React.FC = () => {
  const { status, reconnectAttempt } = useSSE();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Floating Header Overlay */}
      <header className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between pointer-events-none">
        {/* Left: Back Navigation & Branding */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <Link
            to="/"
            className="flex items-center space-x-2 rounded-lg bg-slate-900/90 px-3.5 py-2 text-sm font-medium text-slate-200 border border-slate-700/80 shadow-lg backdrop-blur-md hover:bg-slate-800 hover:text-white transition-all"
            title="Quay về Dashboard"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">Quay về Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2 rounded-lg bg-slate-900/90 px-3.5 py-2 border border-slate-700/80 shadow-lg backdrop-blur-md">
            <Globe className="h-4 w-4 text-cyan-400 animate-spin-slow" />
            <span className="text-sm font-semibold tracking-wide text-cyan-300">
              GDMAS Live Geospatial
            </span>
          </div>
        </div>

        {/* Right: Live SSE Stream Indicators & Quick Controls */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <ConnectionStatusBadge status={status} reconnectAttempt={reconnectAttempt} />

          <div className="hidden sm:flex items-center space-x-1.5 rounded-lg bg-rose-500/10 px-3 py-2 border border-rose-500/30 text-xs text-rose-300 backdrop-blur-md shadow-lg">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Cảnh báo M &ge; 5.0 Sẵn sàng</span>
          </div>
        </div>
      </header>

      {/* Main Fullscreen Outlet (Map container) */}
      <main className="h-full w-full relative">
        <Outlet />
      </main>
    </div>
  );
};

