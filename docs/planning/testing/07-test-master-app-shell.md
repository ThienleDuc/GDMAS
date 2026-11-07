# [KẾ HOẠCH KIỂM THỬ: TC-UI-01 - MASTER APP SHELL & DESIGN TOKENS]

- **Mã kiểm thử (Test ID):** `TC-UI-01`
- **Tên ca kiểm thử:** Kiểm thử Khung Bố Cục Master App Shell, 5 Menu Sidebar, Header Breadcrumbs, Đèn Báo SSE & Dark Mode Tokens
- **Phân hệ & Terminal:** `T7 - Web Client` (React + Vite tại Port 3000)
- **Tầng kiểm thử (Level):** `Component UI Test`
- **Mức độ ưu tiên:** `P0 (Critical - Khung điều phối 100% màn hình hệ thống)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/web/src/layouts/DashboardLayout.test.tsx`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/00-master-app-shell.md](../ui/00-master-app-shell.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§3. Giao diện Dark Mode)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra việc render chuẩn xác của **Master App Shell**:
  1. **Fixed Sidebar:** Hiển thị đủ 5 menu điều hướng chính: Dashboard (`/`), Động đất (`/earthquakes`), Phân tích (`/analytics`), Cụm không gian (`/clusters`), Hệ thống & Demo (`/system`).
  2. **Active State:** Menu tương ứng với URL hiện tại phải được gắn lớp nổi bật (`text-sky-400`, `border-l-4`).
  3. **Header:** Breadcrumbs hiển thị đúng phân cấp, đồng hồ UTC/ICT đếm giây đều đặn, đèn báo trạng thái SSE hiển thị đúng màu (Xanh khi Live, Vàng khi Reconnecting, Đỏ khi Offline).
  4. **Global Toast Container:** Nảy thông báo nổi khi nhận được sự kiện SSE `earthquake_alert` và tự đóng sau 5s.
  5. **Thừa hưởng Design Tokens Dark Mode:** Nền chính `bg-slate-900` (`#0f172a`), thẻ `bg-slate-800` (`#1e293b`), viền `border-slate-700` (`#334155`).

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-UI-SHELL-01:** Khung layout thống nhất, không để xảy ra hiện tượng vỡ layout hay lệch màu.
- [x] **REQ-UI-SHELL-02:** Đáp ứng đầy đủ các menu dẫn tới các tính năng bắt buộc của đồ án.
- [x] **REQ-UI-SHELL-03:** Lắng nghe kênh SSE toàn cục.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Sử dụng Vitest và `@testing-library/react`.
- Bao bọc component kiểm thử trong `<MemoryRouter>` của React Router v6.
- Giả lập (Mock) custom hook `useSSE`.

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-UI-01** | **Hiển thị đầy đủ 5 mục menu Sidebar** | URL `/` | 1. Render `DashboardLayout`<br>2. Tìm các liên kết menu | • Tìm thấy 5 mục: Dashboard, Động Đất, Phân Tích, Bản Đồ Cụm, Hệ Thống |
| **SC-UI-02** | **Đồng bộ trạng thái Active khi chuyển trang** | URL `/analytics` | 1. Render với initial route `/analytics`<br>2. Kiểm tra menu Phân Tích | • Menu Phân Tích có class active (`border-sky-400`)<br>• Breadcrumb hiển thị "Phân Tích" |
| **SC-UI-03** | **Đèn báo trạng thái SSE Real-time** | Mock SSE status `LIVE` | 1. Hook `useSSE` trả về `connected`<br>2. Kiểm tra Header badge | • Hiển thị badge 🟢 "SSE Live" với text màu `text-emerald-400` |
| **SC-UI-04** | **Hiển thị Global Toast khi có động đất mới** | SSE push `earthquake_alert` | 1. Bắn sự kiện SSE có trận M 6.2<br>2. Kiểm tra Toast xuất hiện | • Toast hiển thị ở góc dưới phải<br>• Có thông tin độ lớn "M 6.2" và nút đóng |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Vitest Scaffold)

```typescript
// apps/web/src/layouts/DashboardLayout.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";

// Giả lập hook useSSE
vi.mock("../hooks/useSSE", () => ({
  useSSE: vi.fn(() => ({
    data: { event: "heartbeat", timestamp: Date.now() },
    isConnected: true,
  })),
}));

describe("DashboardLayout (Master App Shell) Tests", () => {
  it("render đúng 5 menu điều hướng chính trên Sidebar", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DashboardLayout />
      </MemoryRouter>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Động Đất/i)).toBeInTheDocument();
    expect(screen.getByText(/Phân Tích/i)).toBeInTheDocument();
    expect(screen.getByText(/Bản Đồ Cụm/i)).toBeInTheDocument();
    expect(screen.getByText(/Hệ Thống/i)).toBeInTheDocument();
  });

  it("hiển thị đèn báo SSE Live khi kết nối thành công", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <DashboardLayout />
      </MemoryRouter>
    );

    expect(screen.getByText(/SSE/i)).toBeInTheDocument();
  });
});
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** 100% tests kiểm tra điều hướng, breadcrumb và SSE status badge vượt qua.
- [ ] **Accessibility:** Các menu có gắn thuộc tính `aria-current="page"` khi active.

