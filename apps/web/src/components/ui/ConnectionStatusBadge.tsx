import React from "react";
import { Radio, RadioTower, WifiOff } from "lucide-react";
import { sseStatusLabel, type SseStatus } from "../../hooks/sse-machine";

interface ConnectionStatusBadgeProps {
  status: SseStatus;
  reconnectAttempt?: number;
  className?: string;
  /** Ẩn nhãn chữ, chỉ giữ icon (dùng cho header hẹp). */
  compact?: boolean;
}

/**
 * Badge trạng thái kết nối SSE trên shell (DashboardLayout / FullscreenMapLayout).
 * 3 trạng thái người dùng thấy: LIVE · Reconnecting… · Disconnected.
 */
export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  status,
  reconnectAttempt = 0,
  className = "",
  compact = false,
}) => {
  const palette =
    status === "open"
      ? {
          wrapper: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
          icon: "text-emerald-400",
          Icon: Radio,
        }
      : status === "disconnected"
        ? {
            wrapper: "border-rose-500/40 bg-rose-500/10 text-rose-300",
            icon: "text-rose-400",
            Icon: WifiOff,
          }
        : {
            wrapper: "border-amber-500/40 bg-amber-500/10 text-amber-300",
            icon: "text-amber-400",
            Icon: RadioTower,
          };

  const { wrapper, icon, Icon } = palette;
  const label = sseStatusLabel(status);

  return (
    <div
      role="status"
      aria-live="polite"
      title={status === "reconnecting" && reconnectAttempt > 0 ? `Lần thử lại: ${reconnectAttempt}` : label}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-mono shadow-lg backdrop-blur-md ${wrapper} ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${icon} ${status === "open" ? "animate-pulse" : ""}`} />
      {compact ? null : <span className="font-medium">{label}</span>}
      {!compact && status === "reconnecting" && reconnectAttempt > 0 ? (
        <span className="text-[10px] opacity-80">#{reconnectAttempt}</span>
      ) : null}
    </div>
  );
};
