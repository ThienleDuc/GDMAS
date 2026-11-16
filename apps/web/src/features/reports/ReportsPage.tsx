import React from "react";

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-8 text-slate-200 print:text-black">
      {/* Executive Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white print:text-black border-b border-slate-800 pb-2 print:border-black">
          1. Tóm Tắt Tình Hình Địa Chấn (Executive Summary)
        </h2>
        <p className="text-sm leading-relaxed text-slate-300 print:text-gray-800">
          Trong chu kỳ quan sát 30 ngày qua, hệ thống GDMAS đã ghi nhận tổng cộng <strong>1,248</strong> trận động đất trên toàn cầu thông qua USGS API và EMSC websocket. Quá trình tiền xử lý và gom cụm không gian bằng thuật toán DBSCAN đã xác định được <strong>16 cụm địa chấn</strong> có hoạt động nổi bật.
        </p>
      </section>

      {/* Pattern Breakdown Table */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white print:text-black border-b border-slate-800 pb-2 print:border-black">
          2. Thống Kê Phân Loại 6 Patterns Chuỗi Thời Gian
        </h2>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden print:border-black print:bg-white">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-xs border-b border-slate-800 print:bg-gray-100 print:text-black print:border-black">
              <tr>
                <th className="px-4 py-3">Loại Pattern</th>
                <th className="px-4 py-3">Tên Tiếng Việt</th>
                <th className="px-4 py-3">Số Lượng</th>
                <th className="px-4 py-3">Mức Độ Rủi Ro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 print:divide-black">
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-cyan-400 print:text-black">Cyclic</td>
                <td className="px-4 py-3">Chu kỳ lặp</td>
                <td className="px-4 py-3 font-mono">24</td>
                <td className="px-4 py-3 text-emerald-400 print:text-black">Trung bình</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-indigo-400 print:text-black">Swarm</td>
                <td className="px-4 py-3">Đàn động đất</td>
                <td className="px-4 py-3 font-mono">18</td>
                <td className="px-4 py-3 text-amber-400 print:text-black">Cảnh giác</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-emerald-400 print:text-black">Quiet</td>
                <td className="px-4 py-3">Khoảng lặng địa chấn</td>
                <td className="px-4 py-3 font-mono">9</td>
                <td className="px-4 py-3 text-rose-400 print:text-black">Nguy cơ tích tụ</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-rose-400 print:text-black">Burst</td>
                <td className="px-4 py-3">Bùng nổ cường độ</td>
                <td className="px-4 py-3 font-mono">14</td>
                <td className="px-4 py-3 text-rose-400 print:text-black">Nguy cơ cao</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-amber-400 print:text-black">Aftershock</td>
                <td className="px-4 py-3">Dư chấn</td>
                <td className="px-4 py-3 font-mono">65</td>
                <td className="px-4 py-3 text-amber-400 print:text-black">Theo dõi suy giảm</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-bold text-purple-400 print:text-black">Foreshock</td>
                <td className="px-4 py-3">Tiền chấn</td>
                <td className="px-4 py-3 font-mono">8</td>
                <td className="px-4 py-3 text-rose-500 font-bold print:text-black">Báo động sớm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendations & Signoff */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-white print:text-black border-b border-slate-800 pb-2 print:border-black">
          3. Kiến Nghị Vận Hành
        </h2>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300 print:text-gray-800">
          <li>Duy trì terminal Ingestion chạy liên tục chu kỳ 5 phút để bắt kịp các sự kiện chấn tiêu nông.</li>
          <li>Thực hiện phân tích mô hình LSTM/Random Forest cho các khu vực ghi nhận Quiet pattern kéo dài quá 14 ngày.</li>
          <li>Kích hoạt cơ chế phát cảnh báo SSE tức thời khi có địa chấn vượt ngưỡng M &ge; 5.5.</li>
        </ul>
      </section>
    </div>
  );
};
