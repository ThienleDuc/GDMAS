# [KẾ HOẠCH KIỂM THỬ: TC-UI-04 - TRUNG TÂM PHÂN TÍCH 6 PATTERNS CHUỖI THỜI GIAN]

- **Mã kiểm thử (Test ID):** `TC-UI-04`
- **Tên ca kiểm thử:** Kiểm thử Trực Quan Hóa 6 Patterns Recharts, Thanh Trượt Zoom Brush, Heatmap Tương Quan & Dự Báo $t+1$
- **Phân hệ & Terminal:** `T7 - Web Client` (Route `/analytics`)
- **Tầng kiểm thử (Level):** `Component UI & Visualization Test`
- **Mức độ ưu tiên:** `P0 (Critical - Trọng tâm 3.0 điểm của đồ án TS. Phạm Tuấn)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/web/src/features/analytics/AnalyticsView.test.tsx`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/03-analytics-view.md](../ui/03-analytics-view.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§2. 6 Patterns, §5.2. Điểm cộng Zoom & Filter)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra việc trực quan hóa đầy đủ **6 Patterns chuỗi thời gian** trên 4 tabs điều hướng:
  1. **Tab 1 (Biểu diễn thời gian):** Recharts Line Chart (chuỗi thời gian), Scatter Plot (phân tán độ lớn), Histogram (tần suất Richter).
  2. **Tab 2 (Trend & Mùa vụ):** Đường xu hướng sau Re-sampling và chu kỳ mùa vụ theo các tháng trong năm.
  3. **Tab 3 (Heatmap Tương quan):** Ma trận nhiệt tương quan Pearson đa biến với dải màu trực quan.
  4. **Tab 4 (Dự báo $t+1$):** Biểu đồ diện tích dự báo định lượng kèm dải tin cậy 95% và Badge phân loại mức độ rủi ro ngày mai.
- **Điểm cộng tương tác (§5.2):** Kiểm tra thanh trượt `<Brush />` của Recharts cho phép người dùng kéo giãn dải quan sát mà không làm crash biểu đồ.
- **Bảo chứng Demo §4:** Khi CSDL rỗng, chuyển sang Empty State cảnh báo an toàn thay vì crash giao diện.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-UI-PAT-01:** Bao phủ trọn vẹn 6 patterns nạp từ API thật.
- [x] **REQ-UI-PAT-02:** Tương tác Zoom & Pan bằng Recharts Brush.
- [x] **REQ-UI-PAT-03:** Không phát sinh lỗi chia cho 0 hay màn hình trắng khi CSDL trống.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Sử dụng Vitest, `@testing-library/react`.
- Mock kích thước của `ResponsiveContainer` trong Recharts (vốn phụ thuộc vào DOM browser).

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-PAT-UI-01** | **Chuyển đổi mượt mà giữa 4 tabs phân tích** | Tương tác bấm tab | 1. Bấm Tab 1, 2, 3, 4<br>2. Kiểm tra nội dung active | • Cả 4 tabs chuyển đổi tức thì<br>• Hiển thị đúng tiêu đề và biểu đồ của từng pattern |
| **SC-PAT-UI-02** | **Render thanh trượt Zoom Brush (Điểm cộng §5.2)** | Tab 1 Line Chart | 1. Render biểu đồ Pattern 1<br>2. Tìm thẻ `<Brush />` trong DOM | • Phần tử Brush xuất hiện<br>• Cho phép kéo giãn thời gian |
| **SC-PAT-UI-03** | **Hiển thị Ma trận tương quan Heatmap** | Mock ma trận 5x5 | 1. Chuyển sang Tab 3<br>2. Kiểm tra các ô nhiệt độ | • Hiển thị đủ các ô tương quan<br>• Đường chéo chính mang giá trị $1.0$ |
| **SC-PAT-UI-04** | **Trạng thái CSDL rỗng cho Demo §4** | Mock API trả về DB rỗng | 1. Mock cờ `has_data: false`<br>2. Render trang | • Hiển thị thông báo "Chưa có dữ liệu phân tích chuỗi thời gian"<br>• Tuyệt đối không có lỗi đỏ console |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Vitest Scaffold)

```typescript
// apps/web/src/features/analytics/AnalyticsView.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsView } from "./AnalyticsView";

describe("AnalyticsView (6 Patterns Workspace) Tests", () => {
  it("hiển thị đúng 4 tabs phân tích và chuyển đổi tab mượt mà", () => {
    render(
      <MemoryRouter>
        <AnalyticsView />
      </MemoryRouter>
    );

    expect(screen.getByText(/Biểu Diễn Thời Gian/i)).toBeInTheDocument();
    expect(screen.getByText(/Xu Hướng & Mùa Vụ/i)).toBeInTheDocument();
    expect(screen.getByText(/Tương Quan Đa Biến/i)).toBeInTheDocument();
    expect(screen.getByText(/Dự Báo & Phân Loại/i)).toBeInTheDocument();

    // Chuyển sang tab Dự báo
    const predTab = screen.getByText(/Dự Báo & Phân Loại/i);
    fireEvent.click(predTab);

    expect(screen.getByText(/Dự Báo Định Lượng t\+1/i)).toBeInTheDocument();
  });
});
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Đầy đủ 6 patterns được render chuẩn mực, không có warning về Recharts prop types.
- [ ] **Resilience:** Không crash khi CSDL bị xóa trống (Demo Bước 2).

