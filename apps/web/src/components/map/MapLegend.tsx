import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

interface MapLegendProps {
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Chú giải bản đồ địa chấn Dark Mode:
 * - Thang màu độ lớn (Magnitude):
 *   - M ≥ 6.0: Đỏ (#f43f5e)
 *   - M 5.0 - 5.9: Cam (#f97316)
 *   - M 4.0 - 4.9: Vàng (#facc15)
 *   - M < 4.0: Xanh Cyan (#22d3ee)
 * - Độ sâu (Depth): Nông (đậm) → Sâu (nhạt)
 * - Cụm DBSCAN: Vòng tròn tím nhạt nét đứt
 */
export const MapLegend: React.FC<MapLegendProps> = ({
  className = "",
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md ${className}`}
      data-testid="map-legend"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-400" />
          <span>Chú giải bản đồ</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-800 p-3 pt-2 text-xs">
          {/* Thang độ lớn */}
          <div>
            <span className="text-[11px] font-medium text-slate-400">Độ lớn (Magnitude):</span>
            <div className="mt-1.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#f43f5e] shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                <span className="text-slate-300">M ≥ 6.0</span>
                <span className="ml-auto text-[10px] text-rose-400">Rất mạnh</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                <span className="text-slate-300">M 5.0 – 5.9</span>
                <span className="ml-auto text-[10px] text-amber-400">Mạnh</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#facc15]" />
                <span className="text-slate-300">M 4.0 – 4.9</span>
                <span className="ml-auto text-[10px] text-yellow-400">Trung bình</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" />
                <span className="text-slate-300">M &lt; 4.0</span>
                <span className="ml-auto text-[10px] text-cyan-400">Nhẹ</span>
              </div>
            </div>
          </div>

          {/* Độ sâu */}
          <div className="mt-3 border-t border-slate-800/80 pt-2">
            <span className="text-[11px] font-medium text-slate-400">Độ sâu chấn tiêu (Depth):</span>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 opacity-100" />
                <span>Nông (0 km)</span>
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 opacity-40" />
                <span>Sâu (&gt; 300 km)</span>
              </div>
            </div>
          </div>

          {/* Cụm DBSCAN */}
          <div className="mt-3 border-t border-slate-800/80 pt-2">
            <span className="text-[11px] font-medium text-slate-400">Phân cụm:</span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border border-dashed border-purple-400 bg-purple-500/30" />
              <span className="text-slate-300">Vùng cụm địa chấn (DBSCAN)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
