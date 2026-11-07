import React, { useEffect, useState, useRef } from "react";
import { Radio, X, CheckCircle2 } from "lucide-react";

export interface ToastData {
  id?: string;
  title?: string;
  message: string;
  records_processed?: number;
  time?: string;
}

interface IngestionToastProps {
  toast: ToastData | null;
  onClose: () => void;
  durationMs?: number; // Mặc định 5000ms = 5 giây
}

export const IngestionToast: React.FC<IngestionToastProps> = ({
  toast,
  onClose,
  durationMs = 5000,
}) => {
  const [progress, setProgress] = useState<number>(100);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Khóa định danh duy nhất của thông báo để tránh bị reset timer khi parent re-render mỗi giây
  const toastKey = toast ? (toast.id || `${toast.time}-${toast.message}`) : null;

  useEffect(() => {
    if (!toastKey) {
      setProgress(100);
      return;
    }

    setProgress(100);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onCloseRef.current();
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [toastKey, durationMs]);

  if (!toast) return null;

  const isNewData = (toast.records_processed ?? 0) > 0;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-[calc(100%-2.5rem)] sm:w-full transition-all duration-300 ease-out pointer-events-auto">
      <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl border-l-4 ${
        isNewData 
          ? "border-emerald-500/50 bg-slate-900/95 border-l-emerald-400 shadow-emerald-500/10" 
          : "border-cyan-500/50 bg-slate-900/95 border-l-cyan-400 shadow-cyan-500/10"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className={`rounded-xl p-2.5 border shrink-0 mt-0.5 ${
              isNewData 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
            }`}>
              {isNewData ? (
                <CheckCircle2 className="h-5 w-5 animate-pulse" />
              ) : (
                <Radio className="h-5 w-5 animate-pulse" />
              )}
            </div>
            
            <div className="space-y-1 pr-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  {toast.title || "Cập Nhật Dữ Liệu Tự Động (Chu kỳ 5 phút)"}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                  isNewData
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold"
                    : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                }`}>
                  {isNewData ? `+${toast.records_processed} Mới` : "USGS 5m"}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {toast.message}
              </p>

              {toast.time && (
                <p className="text-[11px] text-slate-500 font-mono">
                  Mốc thời gian: {toast.time}
                </p>
              )}
            </div>
          </div>

          {/* Dấu close để người dùng tắt ngay lập tức */}
          <button
            onClick={() => onCloseRef.current()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo ngay"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thanh đếm ngược tiến trình tự động tắt sau 5 giây */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full transition-all ease-linear ${
              isNewData
                ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                : "bg-gradient-to-r from-cyan-500 to-indigo-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
