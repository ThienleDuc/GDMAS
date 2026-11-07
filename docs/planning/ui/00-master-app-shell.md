# [ĐẶC TẢ BỐ CỤC GIAO DIỆN: MASTER APP SHELL & DESIGN TOKENS]

- **Mã bố cục:** LAYOUT-01
- **Tên bố cục:** Master App Shell Layout
- **Phạm vi áp dụng:** Khung bố cục dùng chung cho 100% màn hình chính (`/`, `/earthquakes`, `/analytics`, `/clusters`, `/system`)
- **Vị trí nhúng nội dung động:** Thẻ `<Outlet />` (React Router v6)
- **Chế độ hiển thị:** Dark Mode mặc định (`Slate 900` / `#0f172a`)
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/README.md](README.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§3. Giao diện người dùng, §4. Demo)
  * [docs/api/API.md](../../api/API.md) (§3.5. SSE Stream `/api/v1/events/stream`)

---

## 1. Mục Tiêu & Nguyên Tắc Thiết Kế Bố Cục (Layout Objectives)

1. **Triệt tiêu nguy cơ lệch chuẩn (Anti-UI Drift):** Khung Master App Shell đóng vai trò là "mỏ neo" quy chuẩn thị giác duy nhất. Toàn bộ sidebar, thanh điều hướng trên, bộ hiển thị thời gian, đèn báo kết nối thời gian thực và ngăn chứa thông báo nổi đều được đóng gói tại đây.
2. **Tách biệt mối quan tâm (Separation of Concerns):** Các màn hình con (Views) cắm vào vùng `<Outlet />` hoàn toàn không cần quan tâm đến thanh điều hướng hay cấu hình thông báo thời gian thực, chỉ tập trung vào nghiệp vụ trực quan hóa dữ liệu.
3. **Thẩm mỹ cao & Chuẩn Dark Mode:** Thiết kế tinh tế với gam màu tối sâu (`#0f172a`), viền mờ (`#334155`), hiệu ứng chuyển động mượt mà (smooth transitions) và đèn báo trạng thái công nghệ cao.

---

## 2. Bản Đặc Tả Design System Tokens Chuẩn (Design Tokens Specification)

> ⚠️ Mọi trang nội dung con bắt buộc phải tái sử dụng các biến token dưới đây:

### 2.1. Bảng màu chuẩn Dark Mode (Color Palette)
- **Nền chính (Background Root):** `#0f172a` (`slate-900`) — Nền toàn trang, độ tương phản cao với chữ sáng.
- **Nền khung thẻ / Card Surface:** `#1e293b` (`slate-800`) — Khung chứa bản đồ, biểu đồ và bảng dữ liệu.
- **Nền tương tác nổi bật (Card Hover / Active):** `#334155` (`slate-700`).
- **Đường viền ngăn cách (Borders):** `#334155` (`slate-700` / độ dày 1px) hoặc `#1e293b` cho viền mờ.
- **Màu nhấn thương hiệu (Primary Accent):** `#38bdf8` (`sky-400` / `sky-500`) — Nút bấm, icon active, brush selector.
- **Màu cảnh báo địa chấn mạnh (Danger / Hotspot):** `#f43f5e` (`rose-500`) — Động đất $\ge 6.0$ Richter.
- **Màu cảnh báo trung bình (Warning / Medium):** `#f59e0b` (`amber-500`) — Động đất $4.5 - 5.9$ Richter.
- **Màu trạng thái an toàn / Dịch vụ online (Success):** `#10b981` (`emerald-500`) — Động đất $< 4.5$ Richter, SSE Live.
- **Chữ chính (Text Primary):** `#f8fafc` (`slate-50`).
- **Chữ phụ (Text Secondary / Muted):** `#94a3b8` (`slate-400`).

### 2.2. Quy chuẩn Typography & Spacing
- **Font chữ:** Inter hoặc Tailwind `font-sans` (sạch sẽ, tối ưu hiển thị số liệu đo đạc khoa học).
- **Bo góc chuẩn:**
  * Cards & Containers: `rounded-xl` (12px).
  * Inputs, Buttons, Badges: `rounded-lg` (8px).
  * Pills / Trạng thái SSE: `rounded-full`.
- **Lề & Đệm:**
  * Padding nội dung trang mặc định: `p-6` (24px).
  * Khoảng cách giữa các thẻ: `gap-6` (24px).
  * Chiều rộng Sidebar: Cố định `w-[260px]`.
  * Chiều cao Header: Cố định `h-16` (64px).

---

## 3. Sơ Đồ Phân Vùng Khung Bố Cục (Wireframe Layout Shell)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER (H: 64px, Sticky):                                                          │
│ Logo GDMAS │ Breadcrumbs │ Live Clock UTC/ICT │ [🟢 SSE: Realtime Live] │ Theme / Help  │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ FIXED        │ MAIN VIEW REGION (<Outlet /> - Auto Scroll, P: 24px)                    │
│ SIDEBAR      │                                                                         │
│ (W: 260px)   │                                                                         │
│              │                                                                         │
│ • Dashboard  │  [NỘI DUNG TỪNG VIEW SẼ ĐƯỢC CẮM VÀO KHU VỰC NÀY]                       │
│ • Động Đất   │  • View 01: / (Dashboard Tổng Quan)                                     │
│ • Phân Tích  │  • View 02: /earthquakes (Danh Sách & Bộ Lọc)                            │
│ • Bản Đồ Cụm │  • View 03: /analytics (6 Patterns Chuỗi Thời Gian)                     │
│ • Hệ Thống   │  • View 04: /clusters (Bản Đồ Cụm Không Gian)                           │
│              │  • View 05: /system (Giám Sát 7 Terminals & Demo §4)                     │
│ ──────────── │                                                                         │
│ DB Widget:   │                                                                         │
│ [🟢 PG: 15k] │                                                                         │
├──────────────┴─────────────────────────────────────────────────────────────────────────┤
│ GLOBAL TOAST CONTAINER (Góc dưới phải, z-50): Pop-up thông báo khi có động đất mới      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Các Thành Phần Bao Ngoài Dùng Chung (Shared Shell Components)

### 4.1. Thanh Điều Hướng Cố Định (Fixed Sidebar Navigation)
- Cố định bên trái (`fixed left-0 top-0 bottom-0 w-[260px] bg-slate-800 border-r border-slate-700`).
- Danh sách 5 mục điều hướng chính:
  1. **Dashboard** (`/`) — Icon: `LayoutDashboard` (Lucide-react)
  2. **Động Đất** (`/earthquakes`) — Icon: `Activity`
  3. **Phân Tích** (`/analytics`) — Icon: `LineChart` (Huy hiệu: `6 Patterns`)
  4. **Bản Đồ Cụm** (`/clusters`) — Icon: `MapPin` (Huy hiệu: `DBSCAN`)
  5. **Hệ Thống & Demo** (`/system`) — Icon: `Server` (Huy hiệu: `7 Terminals`)
- **Trạng thái Active:** Nền `bg-sky-500/10`, chữ `text-sky-400`, viền trái `border-l-4 border-sky-400`.
- **Chân Sidebar (Mini Status Card):**
  * Tình trạng kết nối PostgreSQL: 🟢 `PostgreSQL 16 Connected`.
  * Tổng số sự kiện trong DB: `Total: 15,420 events` (cập nhật tự động).

### 4.2. Thanh Tiêu Đề Trên (Top Navigation & Header)
- Cố định trên đỉnh (`sticky top-0 z-40 h-16 bg-slate-800/90 backdrop-blur border-b border-slate-700 px-6`).
- **Breadcrumb động:** Tự động phản ánh vị trí của người dùng dựa theo URL (ví dụ: `GDMAS / Phân Tích / 6 Patterns Chuỗi Thời Gian`).
- **Bộ hiển thị đồng hồ kép (Dual Clock):**
  * Giờ quốc tế: `UTC: 04:15:30Z`.
  * Giờ Việt Nam: `ICT (UTC+7): 11:15:30`.
- **Đèn báo trạng thái kết nối Realtime (SSE Pill):**
  * 🟢 `SSE Live` (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/30`) kèm hiệu ứng xung nhịp (`animate-ping`).
  * 🟡 `Reconnecting...` (`bg-amber-500/10 text-amber-400`).
  * 🔴 `Offline` (`bg-rose-500/10 text-rose-400`).

### 4.3. Ngăn Chứa Thông Báo Nổi Toàn Cục (Global Toast Stack Container)
- Vị trí cố định: Góc dưới cùng bên phải màn hình (`fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md`).
- Lắng nghe sự kiện SSE từ endpoint `/api/v1/events/stream`:
  * **Sự kiện `earthquake_alert`:** Tự động trượt vào (Slide-in), hiển thị huy hiệu Richter, địa điểm, thời gian và nút "Xem chi tiết" dẫn thẳng tới Drawer sự kiện.
  * **Sự kiện `database_cleared`:** Báo động vàng khi kịch bản demo xóa sạch CSDL ở Bước 2.
  * **Sự kiện `service_completed`:** Thông báo chu kỳ nạp hoặc phân tích hoàn tất.
- Tự động đóng sau 5 giây hoặc khi người dùng nhấp nút đóng `X`.

---

## 5. Xử Lý Các Trạng Thái Toàn Cục (Global Layout States)

### 5.1. Khung Chờ Tải Trang (Global Skeleton Page Loader)
- Khi chuyển đổi giữa các Route, hiển thị Skeleton giả lập gồm Header, 4 thẻ KPI và 1 khối biểu đồ lớn có hiệu ứng nhấp nháy (`animate-pulse bg-slate-700/50 rounded-xl`), ngăn chặn co giật giao diện (CLS).

### 5.2. Biển Báo Mất Kết Nối API Backend (Global Network Error Banner)
- Khi không thể kết nối tới Backend API (`http://localhost:8000/api/v1`), một thanh banner đỏ nổi bật sẽ xuất hiện ở đỉnh đầu:
  > *"⚠️ Mất kết nối tới Database API. Vui lòng kiểm tra Terminal 06 (`uv run uvicorn gdmas.main:app --port 8000`)."*

---

## 6. Tiêu Chí Nghiệm Thu Bố Cục (Layout Acceptance Criteria)

- [ ] **AC-LAYOUT-01 (Đúng tỉ lệ & Không giật layout):** Khung Master App Shell hiển thị chuẩn xác trên màn hình Desktop (tối thiểu 1366px, tối ưu 1920px), không bị vỡ layout khi co giãn cửa sổ.
- [ ] **AC-LAYOUT-02 (Điều hướng Sidebar Active):** 5 mục menu điều hướng chuyển route tức thời qua React Router v6, trạng thái active đồng bộ chính xác theo pathname.
- [ ] **AC-LAYOUT-03 (Trạng thái SSE Real-time):** Đèn báo trạng thái SSE trên Header phản hồi chính xác (xanh khi backend bật, vàng khi reconnect, đỏ khi tắt backend).
- [ ] **AC-LAYOUT-04 (Global Toast thông báo động đất):** Toast xuất hiện mượt mà khi backend phát sinh sự kiện `earthquake_alert`, tự đóng sau 5s mà không chặn thao tác người dùng.
- [ ] **AC-LAYOUT-05 (Thừa hưởng Design Tokens Dark Mode):** 100% trang con cắm vào `<Outlet />` thừa hưởng toàn bộ biến màu Dark Mode (`#0f172a`), không phát sinh viền trắng hay xung đột theme.

