# [KẾ HOẠCH KIỂM THỬ: TC-UI-03 - DANH SÁCH & BỘ LỌC ĐỘNG ĐẤT ĐA CHIỀU]

- **Mã kiểm thử (Test ID):** `TC-UI-03`
- **Tên ca kiểm thử:** Kiểm thử Bảng Dữ Liệu Phân Trang, Thanh Trượt Lọc Richter Debounce 300ms & Drawer Chi Tiết Sự Kiện
- **Phân hệ & Terminal:** `T7 - Web Client` (Route `/earthquakes`)
- **Tầng kiểm thử (Level):** `Component UI & Interaction Test`
- **Mức độ ưu tiên:** `P0 (Critical - Điểm cộng tương tác lọc §5.2)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/web/src/features/earthquakes/EarthquakesPage.test.tsx`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/02-earthquakes-view.md](../ui/02-earthquakes-view.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§5.2. Điểm cộng tương tác lọc)
  * [docs/api/API.md](../../api/API.md) (§3.2. Query Parameters)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra tính năng **Bộ lọc đa chiều tương tác (Điểm cộng §5.2)**:
  1. **Thanh trượt Richter:** Kéo trượt dải độ lớn có cơ chế **Debounce 300ms** (không gọi API dồn dập).
  2. **Bộ chọn Độ sâu chấn tiêu:** Lọc theo 3 phân cấp (Nông < 70km, Trung bình 70-300km, Sâu > 300km).
  3. **Bảng phân trang:** Chuyển đổi giữa các trang dữ liệu (Trang 1, 2, 3...) và đổi kích thước trang (20, 50 bản ghi).
  4. **Sắp xếp cột:** Nhấp vào tiêu đề cột (Thời gian, Độ lớn, Độ sâu) đổi chiều sắp xếp tăng/giảm dần.
  5. **Drawer trượt chi tiết:** Nhấp "Xem chi tiết" mở Drawer mép phải với đầy đủ thông số WGS84 và link USGS.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-UI-EQ-01:** Phân trang và sắp xếp dữ liệu mượt mà.
- [x] **REQ-UI-EQ-02:** Debounce 300ms khi thao tác lọc slider để tối ưu hiệu năng mạng.
- [x] **REQ-UI-EQ-03:** Drawer chi tiết hiển thị đúng `source_event_id` và tọa độ.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Sử dụng Vitest, `@testing-library/react`, `@testing-library/user-event`.
- Sử dụng `vi.useFakeTimers()` để kiểm tra cơ chế Debounce 300ms.

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-EQ-01** | **Render bảng dữ liệu phân trang** | Mock 20 sự kiện | 1. Render trang<br>2. Đếm số hàng trong `<tbody>` | • Đúng 20 hàng dữ liệu<br>• Hiển thị thanh phân trang phía dưới |
| **SC-EQ-02** | **Kiểm tra Debounce 300ms khi kéo Slider** | Thao tác thay đổi slider Richter | 1. Kéo slider liên tục 3 lần<br>2. Chờ 100ms -> Chưa gọi API<br>3. Chờ thêm 250ms (tổng 350ms) | • API chỉ được gọi đúng 1 lần duy nhất với giá trị cuối cùng |
| **SC-EQ-03** | **Mở Drawer chi tiết sự kiện** | Nhấp nút xem tại hàng 1 | 1. Click nút "Chi tiết"<br>2. Kiểm tra Drawer xuất hiện | • Drawer trượt ra từ mép phải<br>• Hiển thị mã sự kiện và tọa độ WGS84 |
| **SC-EQ-04** | **Trạng thái không có kết quả phù hợp** | API trả về mảng rỗng `[]` | 1. Kéo bộ lọc Richter lên $8.5$<br>2. API trả về 0 kết quả | • Hiển thị thông báo "Không có sự kiện nào thỏa mãn điều kiện lọc" |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Vitest Scaffold)

```typescript
// apps/web/src/features/earthquakes/EarthquakesPage.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { EarthquakesPage } from "./EarthquakesPage";
import { apiClient } from "../../lib/api-client";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: 101,
            source_event_id: "us_test_drawer_01",
            magnitude: 6.2,
            place: "Tonga Region",
            event_time: "2026-11-06T10:45:00Z",
            depth_km: 15.4,
            latitude: -20.5,
            longitude: -175.2,
          },
        ],
        metadata: { total: 1, page: 1, limit: 20 },
      })
    ),
  },
}));

describe("EarthquakesPage Interaction Tests", () => {
  it("render bảng động đất và mở Drawer chi tiết khi bấm vào dòng sự kiện", async () => {
    render(
      <MemoryRouter>
        <EarthquakesPage />
      </MemoryRouter>
    );

    const eventPlace = await screen.findByText(/Tonga Region/i);
    expect(eventPlace).toBeInTheDocument();

    // Click nút mở Drawer
    const detailBtn = screen.getByRole("button", { name: /chi tiết/i });
    fireEvent.click(detailBtn);

    // Kiểm tra thông tin trong Drawer
    expect(await screen.findByText(/us_test_drawer_01/i)).toBeInTheDocument();
  });
});
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Phân trang, lọc debounce 300ms và Drawer chi tiết hoạt động trơn tru không lỗi.

