import React from "react";
import { BarChart3, Info } from "lucide-react";

interface PatternCard {
  name: string;
  vietnameseName: string;
  description: string;
  characteristics: string;
  color: string;
  count: number;
}

const PATTERNS: PatternCard[] = [
  {
    name: "Cyclic",
    vietnameseName: "Chu kỳ lặp",
    description: "Các đợt dao động rung chấn lặp lại theo khoảng thời gian tuần hoàn xác định.",
    characteristics: "Fourier spectrum có đỉnh tần số rõ rệt.",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-950/20",
    count: 24,
  },
  {
    name: "Swarm",
    vietnameseName: "Đàn động đất",
    description: "Tập hợp nhiều trận động đất cục bộ mà không có một trận động đất chính vượt trội.",
    characteristics: "Tập trung dày đặc về không gian và thời gian ngắn.",
    color: "border-indigo-500/40 text-indigo-400 bg-indigo-950/20",
    count: 18,
  },
  {
    name: "Quiet",
    vietnameseName: "Khoảng lặng địa chấn",
    description: "Giai đoạn suy giảm bất thường về tần suất và cường độ địa chấn tại vùng hoạt động mạnh.",
    characteristics: "Độ tích lũy ứng suất tăng dần có thể báo hiệu động đất lớn.",
    color: "border-emerald-500/40 text-emerald-400 bg-emerald-950/20",
    count: 9,
  },
  {
    name: "Burst",
    vietnameseName: "Bùng nổ cường độ",
    description: "Sự gia tăng đột ngột về tần suất phóng thích năng lượng trong khoảng thời gian rất ngắn.",
    characteristics: "Gia tốc năng lượng cực đại theo thang logarit.",
    color: "border-rose-500/40 text-rose-400 bg-rose-950/20",
    count: 14,
  },
  {
    name: "Aftershock",
    vietnameseName: "Dư chấn",
    description: "Các trận động đất xảy ra sau một trận động đất chính (mainshock) với tần suất giảm dần theo quy luật Omori.",
    characteristics: "M < M(mainshock), tuân thủ định luật Omori.",
    color: "border-amber-500/40 text-amber-400 bg-amber-950/20",
    count: 65,
  },
  {
    name: "Foreshock",
    vietnameseName: "Tiền chấn",
    description: "Động đất nhỏ xảy ra trước một trận động đất lớn hơn tại cùng một nguồn đứt gãy.",
    characteristics: "Xảy ra trước mainshock từ vài giờ đến vài tuần.",
    color: "border-purple-500/40 text-purple-400 bg-purple-950/20",
    count: 8,
  },
];

export const StatisticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-cyan-400" />
          <span>6 Patterns Phân Tích Chuỗi Thời Gian</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Hệ thống phân loại chuỗi thời gian tự động do Terminal 2 (Analysis) và Terminal 4 (Prediction) thực hiện.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PATTERNS.map((p) => (
          <div
            key={p.name}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${p.color}`}>
                  {p.name.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {p.count} phát hiện
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-1">{p.vietnameseName}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-start space-x-2 text-[11px] text-slate-500">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{p.characteristics}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

