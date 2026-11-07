# [KẾ HOẠCH KIỂM THỬ: TC-UI-02 - DASHBOARD ĐIỀU HÀNH TỔNG QUAN]

- **Mã kiểm thử (Test ID):** `TC-UI-02`
- **Tên ca kiểm thử:** Kiểm thử Màn Hình Dashboard: 4 Thẻ KPI Tóm Tắt, Bản Đồ Vệ Tinh Leaflet Nhanh & Danh Sách Sự Kiện Mới
- **Phân hệ & Terminal:** `T7 - Web Client` (Route `/`)
- **Tầng kiểm thử (Level):** `Component UI & Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Màn hình chào đón khi mở ứng dụng)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/web/src/features/dashboard/DashboardOverviewPage.test.tsx`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/01-dashboard-view.md](../ui/01-dashboard-view.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§3. Giao diện, §4. Demo)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra hiển thị chính xác của **4 thẻ KPI đầu trang**:
  1. Tổng số sự kiện trong 24h qua.
  2. Trận động đất lớn nhất ($M_{max}$).
  3. Độ sâu chấn tiêu trung bình.
  4. Badge kết quả dự báo mức độ rủi ro ngày mai ($t+1$) nạp từ mô hình AI.
- Kiểm tra render Bản đồ tương tác nhanh Leaflet và danh sách 10 sự kiện mới nhất.
- **Bảo chứng Demo §4:** Khi API trả về CSDL rỗng, trang hiển thị đúng Empty State và nút bấm điều hướng sang trang Hệ Thống.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-UI-DASH-01:** Nạp 100% dữ liệu từ API qua `api-client` (không hardcode).
- [x] **REQ-UI-DASH-02:** Xử lý Skeleton Loading khi đang chờ dữ liệu API.
- [x] **REQ-UI-DASH-03:** Chuyển trạng thái an toàn khi CSDL rỗng.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Sử dụng Vitest, `@testing-library/react`.
- Mock các lời gọi `apiClient.get` trả về số liệu KPI và danh sách động đất.

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-DASH-01** | **Hiển thị 4 thẻ KPI chuẩn xác từ API** | Mock API stats: 142 sự kiện, $M_{max}=6.2$ | 1. Render DashboardPage<br>2. Chờ API load xong | • Thẻ 1: "142 sự kiện"<br>• Thẻ 2: "M 6.2"<br>• Thẻ 4: Hiển thị nhãn dự báo $t+1$ |
| **SC-DASH-02** | **Hiển thị danh sách 10 sự kiện mới nhất** | Mock 10 sự kiện địa chấn | 1. Kiểm tra khối Event Feed | • Đủ 10 dòng thẻ sự kiện<br>• Hiển thị đúng địa điểm và độ lớn |
| **SC-DASH-03** | **Trạng thái CSDL rỗng (Demo Bước 2 & 3)** | API trả về `{ total_count: 0 }` | 1. Mock DB rỗng<br>2. Kiểm tra giao diện | • Hiển thị khối cảnh báo CSDL rỗng<br>• Có nút [Kích hoạt nạp lại dữ liệu] |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Vitest Scaffold)

```typescript
// apps/web/src/features/dashboard/DashboardOverviewPage.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardOverviewPage } from "./DashboardOverviewPage";

// Mock API Client
vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes("/statistics/earthquakes")) {
        return Promise.resolve({
          data: {
            summary_24h: { total_count: 142, max_magnitude: 6.2, avg_magnitude: 3.4 },
          },
        });
      }
      if (url.includes("/predictions")) {
        return Promise.resolve({
          data: { predicted_label: "Normal Activity", predicted_value: 46.2 },
        });
      }
      return Promise.resolve({ data: [] });
    }),
  },
}));

describe("DashboardOverviewPage Tests", () => {
  it("hiển thị số liệu 4 thẻ KPI sau khi API nạp xong", async () => {
    render(
      <MemoryRouter>
        <DashboardOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("142")).toBeInTheDocument();
      expect(screen.getByText(/6.2/)).toBeInTheDocument();
    });
  });
});
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** 4 thẻ KPI nạp chuẩn xác số liệu động, không crash khi dữ liệu API trễ hoặc rỗng.

