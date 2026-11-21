/**
 * Nhãn và hướng dẫn đọc biểu đồ — thuần, không React/DOM.
 * Câu ngắn, có từ khóa được tô màu ở giao diện; giải thích đầy đủ đặt trong title.
 */

/** Đổi mã tần suất lấy mẫu do máy chủ trả sang tên đầy đủ. */
export function resampleFreqLabel(freq: string | null | undefined): string {
  const labels: Record<string, string> = {
    D: "Ngày",
    W: "Tuần",
    M: "Tháng",
  };
  if (!freq) return "Chưa xác định";
  return labels[freq] ?? freq;
}

/** Giải thích đầy đủ sai số căn quân phương (dùng làm title khi di chuột). */
export const RMSE_EXPLANATION =
  "Sai số căn quân phương đo mức độ dự báo lệch khỏi giá trị thực tế: lấy bình phương các độ lệch, cộng lại rồi căn ra. Giá trị càng nhỏ thì dự báo càng sát; so với sai số trung bình, chỉ số này phạt nặng hơn những lần dự báo sai lớn.";

export type ChartGuideKey =
  | "temporal"
  | "trend"
  | "seasonality"
  | "correlation"
  | "forecast"
  | "classification";

/** Hướng dẫn ngắn gọn cho từng biểu đồ Pattern 1–6. */
export const CHART_GUIDES: Record<ChartGuideKey, readonly string[]> = {
  temporal: [
    "Đường: số sự kiện và độ lớn theo kỳ",
    "Chấm: độ lớn và độ sâu của từng trận",
    "Cột: số trận theo khoảng độ lớn",
    "Kéo thanh chọn để phóng to",
  ],
  trend: [
    "Xanh: giá trị thực tế sau lấy mẫu",
    "Cam: đường xu hướng tính được",
    "Độ phù hợp gần 1 là đáng tin",
    "Nét đứt: kỳ chưa đầy đủ",
  ],
  seasonality: [
    "Mỗi điểm là hệ số của một tháng",
    "Hệ số trên 1: cao hơn bình thường",
    "Độ mạnh lớn là chu kỳ rõ",
  ],
  correlation: [
    "Mỗi ô là hệ số của một cặp biến",
    "Xanh: nghịch chiều · Đỏ: cùng chiều",
    "Chỉ mô tả, không suy nguyên nhân",
  ],
  forecast: [
    "Xanh: dữ liệu đã quan sát",
    "Đỏ: dự báo cho ngày kế tiếp",
    "Vùng tô: khoảng tin cậy 95%",
    "Nét đứt: không phải số liệu thực",
    "Sai số căn quân phương càng nhỏ càng sát",
  ],
  classification: [
    "Mỗi cột là xác suất một nhóm",
    "Tổng các cột bằng 100%",
    "Chỉ báo thống kê thử nghiệm",
  ],
};

export type GuideTone = "blue" | "orange" | "red";

/** Từ khóa cần tô màu trong từng dòng hướng dẫn. */
export const GUIDE_HIGHLIGHTS: Record<ChartGuideKey, ReadonlyArray<{ term: string; tone: GuideTone }>> = {
  temporal: [
    { term: "Đường", tone: "blue" },
    { term: "Chấm", tone: "orange" },
    { term: "Cột", tone: "red" },
  ],
  trend: [
    { term: "Xanh", tone: "blue" },
    { term: "Cam", tone: "orange" },
    { term: "Độ phù hợp", tone: "blue" },
    { term: "Nét đứt", tone: "red" },
  ],
  seasonality: [
    { term: "hệ số", tone: "blue" },
    { term: "trên 1", tone: "orange" },
    { term: "Độ mạnh", tone: "red" },
  ],
  correlation: [
    { term: "hệ số", tone: "blue" },
    { term: "Xanh", tone: "blue" },
    { term: "Đỏ", tone: "red" },
  ],
  forecast: [
    { term: "Xanh", tone: "blue" },
    { term: "Đỏ", tone: "red" },
    { term: "95%", tone: "orange" },
    { term: "Nét đứt", tone: "red" },
    { term: "Sai số căn quân phương", tone: "orange" },
  ],
  classification: [
    { term: "xác suất", tone: "blue" },
    { term: "100%", tone: "orange" },
  ],
};
