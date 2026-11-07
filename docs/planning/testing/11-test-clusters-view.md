# [KẾ HOẠCH KIỂM THỬ: TC-UI-05 - BẢN ĐỒ CỤM KHÔNG GIAN ĐỊA CHẤN DBSCAN]

- **Mã kiểm thử (Test ID):** `TC-UI-05`
- **Tên ca kiểm thử:** Kiểm thử Trực Quan Hóa Bản Đồ Cụm Leaflet, Điểm Nóng Địa Chấn, Đa Giác Cụm & Drawer Chi Tiết
- **Phân hệ & Terminal:** `T7 - Web Client` (Route `/clusters`)
- **Tầng kiểm thử (Level):** `Component UI & GIS Visualization Test`
- **Mức độ ưu tiên:** `P0 (Critical - Trực quan hóa kết quả Terminal 4 DBSCAN)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/web/src/features/clusters/ClustersView.test.tsx`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/04-clusters-view.md](../ui/04-clusters-view.md)
  * [docs/planning/features/04-spatial-clustering.md](../features/04-spatial-clustering.md)
  * [docs/api/API.md](../../api/API.md) (§3.4. Endpoints Phân Cụm)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra việc trực quan hóa kết quả phân cụm không gian **DBSCAN** trên bản đồ Leaflet:
  1. **Phân màu cụm trực quan:** Mỗi cụm động đất mang một màu sắc nhận diện riêng biệt, các điểm nhiễu mang màu xám mờ.
  2. **Đồng bộ hai chiều (Two-Way Synchronization):** Nhấp chọn cụm ở danh sách bên phải tự động bay bản đồ (`flyTo`) đến vị trí tâm cụm và làm nổi bật cụm đó.
  3. **Thẻ tóm tắt thuật toán:** Hiển thị rõ ràng tham số $\epsilon = 150$ km, $MinPts = 5$, tổng số cụm và số điểm nhiễu nạp từ API.
  4. **Drawer danh sách sự kiện:** Mở xem chi tiết các trận động đất cấu thành nên cụm đang chọn.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-UI-CLU-01:** Hiển thị bản đồ Leaflet Dark CartoDB tương thích với các điểm cụm.
- [x] **REQ-UI-CLU-02:** Đồng bộ chọn cụm giữa bảng số liệu và bản đồ.
- [x] **REQ-UI-CLU-03:** Ứng xử an toàn khi chưa có cụm nào được tạo.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Sử dụng Vitest, `@testing-library/react`.
- Mock thư viện `leaflet` và `react-leaflet` (do Leaflet yêu cầu DOM canvas thực tế).

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-CLU-UI-01** | **Hiển thị thông số thuật toán DBSCAN** | Mock API clusters: 8 cụm, 24 nhiễu | 1. Render trang `/clusters`<br>2. Kiểm tra thẻ thống kê | • Hiển thị "8 Cụm Địa Chấn"<br>• Hiển thị "24 điểm nhiễu"<br>• Tham số Epsilon: 150km |
| **SC-CLU-UI-02** | **Hiển thị danh sách cụm bên phải** | Mock 2 cụm | 1. Kiểm tra danh sách | • Cụm 1: Vùng Honshu, Nhật Bản<br>• Cụm 2: Quần đảo Tonga |
| **SC-CLU-UI-03** | **Mở Drawer xem chi tiết các sự kiện trong cụm** | Nhấp vào cụm 1 | 1. Click vào thẻ cụm 1<br>2. Kiểm tra Drawer | • Drawer xuất hiện hiển thị danh sách các trận động đất trong cụm 1 |
| **SC-CLU-UI-04** | **Trạng thái CSDL rỗng cho Demo §4** | API trả về 0 cụm | 1. Mock DB rỗng<br>2. Render trang | • Hiển thị Empty state thông báo CSDL rỗng<br>• Không sập bản đồ Leaflet |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Vitest Scaffold)

```typescript
// apps/web/src/features/clusters/ClustersView.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ClustersView } from "./ClustersView";

vi.mock("../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          algorithm: "DBSCAN",
          parameters: { eps_km: 150, min_samples: 5 },
          clusters_count: 8,
          noise_count: 24,
          clusters: [
            {
              cluster_id: 1,
              center_latitude: 38.2,
              center_longitude: 142.4,
              event_count: 48,
              avg_magnitude: 4.6,
              max_magnitude: 6.1,
            },
          ],
        },
      })
    ),
  },
}));

describe("ClustersView Tests", () => {
  it("hiển thị số lượng cụm phát hiện và tham số thuật toán DBSCAN", async () => {
    render(
      <MemoryRouter>
        <ClustersView />
      </MemoryRouter>
    );

    expect(await screen.findByText(/8 Cụm Địa Chấn/i)).toBeInTheDocument();
    expect(screen.getByText(/24 điểm nhiễu/i)).toBeInTheDocument();
    expect(screen.getByText(/150/i)).toBeInTheDocument();
  });
});
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Danh sách cụm và tham số DBSCAN nạp chuẩn xác, Drawer chi tiết hoạt động mượt mà.

