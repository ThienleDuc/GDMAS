import React from "react";
import { AlertTriangle, Inbox, Loader2, PlugZap, RefreshCw } from "lucide-react";

/**
 * Ba trạng thái chuẩn của mọi trang dữ liệu (I5 + kịch bản Demo §4):
 * Loading → Error → Empty. Không component nào được render số liệu thay thế.
 */

interface LoadingStateProps {
  label?: string;
  hint?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = "Đang tải dữ liệu…",
  hint,
  className = "",
}) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-10 text-center ${className}`}
  >
    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
    <p className="text-sm font-medium text-slate-300">{label}</p>
    {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
  </div>
);

interface ErrorStateProps {
  message: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  hint,
  onRetry,
  className = "",
}) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-10 text-center ${className}`}
  >
    <AlertTriangle className="h-5 w-5 text-rose-400" />
    <p className="text-sm font-medium text-rose-200">Không tải được dữ liệu</p>
    <p className="max-w-lg text-xs leading-relaxed text-rose-300/80">{message}</p>
    {hint ? <p className="text-[11px] text-rose-300/60">{hint}</p> : null}
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Thử lại
      </button>
    ) : null}
  </div>
);

interface EmptyStateProps {
  title?: string;
  message: string;
  hint?: string;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Chưa có dữ liệu",
  message,
  hint,
  className = "",
  children,
}) => (
  <div
    role="status"
    className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-4 py-10 text-center ${className}`}
  >
    <div className="rounded-full border border-slate-700/60 bg-slate-800/60 p-2">
      <Inbox className="h-4 w-4 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-300">{title}</p>
    <p className="max-w-lg text-xs leading-relaxed text-slate-500">{message}</p>
    {hint ? <p className="max-w-lg text-[11px] text-slate-600">{hint}</p> : null}
    {children}
  </div>
);

interface UnavailableNoticeProps {
  endpoint: string;
  className?: string;
  hint?: string;
}

/**
 * Nhãn minh bạch khi Backend chưa triển khai endpoint (404).
 * Không thay bằng mock — xem contracts/README.md §3.8.
 */
export const UnavailableNotice: React.FC<UnavailableNoticeProps> = ({
  endpoint,
  hint = "Frontend không dùng dữ liệu giả thay thế. Số liệu sẽ hiển thị ngay khi Backend bổ sung route theo contracts/.",
  className = "",
}) => (
  <div
    role="status"
    className={`flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200 ${className}`}
  >
    <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
    <div>
      <p className="font-medium">
        BE chưa triển khai endpoint <code className="font-mono text-amber-100">{endpoint}</code>
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-200/70">{hint}</p>
    </div>
  </div>
);
