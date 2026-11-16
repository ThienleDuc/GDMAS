import React from "react";
import { Info } from "lucide-react";

interface EmptyChartStateProps {
  reason: string;
  hint?: string;
}

/**
 * Empty State dùng chung khi Pattern `PENDING`, thiếu bản ghi hoặc `insufficient_data`.
 * Tuyệt đối không render số liệu thay thế (I5 / kịch bản Demo Bước 3).
 */
export const EmptyChartState: React.FC<EmptyChartStateProps> = ({ reason, hint }) => (
  <div
    role="status"
    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-10 text-center"
  >
    <div className="rounded-full border border-slate-700/60 bg-slate-800/60 p-2">
      <Info className="h-4 w-4 text-slate-400" />
    </div>
    <p className="mt-3 text-sm font-medium text-slate-300">Chưa có dữ liệu biểu đồ</p>
    <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">{reason}</p>
    {hint ? <p className="mt-2 max-w-md text-[11px] text-slate-600">{hint}</p> : null}
  </div>
);
