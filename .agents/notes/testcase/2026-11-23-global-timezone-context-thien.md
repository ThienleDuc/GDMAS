# Testcase: Áp dụng chế độ UTC/UTC+7 từ Header tới mọi trang

## Metadata
- ID: 2026-11-23-global-timezone-context-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-23-global-timezone-context-thien.md
- Target: apps/web/src/contexts/timezone-context.tsx, apps/web/src/layouts/header/RealtimeClock.tsx
- Test File: apps/web/tests/timezone-context.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** context chia sẻ `timezone` ở shell và việc mọi caller thời gian dùng chung chế độ đó.
- **Ràng buộc GDMAS liên quan:**
  - [x] I2 — giữ nguyên helper `utils/timezone.ts` và chữ ký hàm/props cũ (only additive).
  - [x] I3 — dữ liệu vẫn lưu UTC ISO 8601 `Z`; chỉ đổi cách hiển thị.
  - [x] I7 — test offline 100%, không DOM/leaflet/mạng.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** giả lập `localStorage` bằng object thuần (`getItem`/`setItem`); `Date` cố định cho format.

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Đọc mode mặc định | Functional | env không có `localStorage` | Trả `"UTC+7"` | `PASSED` |
| `TC-02` | Đọc mode đã lưu | Functional | `gdmas_timezone_mode = "UTC"` | Trả `"UTC"` | `PASSED` |
| `TC-03` | Ghi mode khi đổi | Functional | `setTimezone("UTC")` | `setItem("gdmas_timezone_mode", "UTC")` được gọi | `PASSED` |
| `TC-04` | Format 2 mode khác nhau | Functional | `formatEventTime("2026-11-23T00:00:00Z", "UTC"/"UTC+7")` | Hai output khác nhau | `PASSED` |
| `TC-05` | Mọi caller dùng context | Regression | Đọc source các page/component | Không còn `getStoredTimezone()` snapshot ở page, không còn hardcode `"UTC"` ở `EventListPanel`/`MapPopupCard`; `popupFields`/`formatEventRow`/`detailFields` giữ default cũ | `PASS` |
| `TC-06` | Header toggle dùng context | Functional | Đọc `RealtimeClock.tsx` | Dùng `useTimezone()` + `setTimezone(next)`, không còn state/localStorage trực tiếp | `PASS` |
| `TC-07` | Overview & Danh mục dùng context | Functional | Đọc 2 page | `const { timezone } = useTimezone()`, không còn `getStoredTimezone` | `PASS` |
| `TC-08` | Bản đồ không hardcode UTC | Functional | Đọc `EventListPanel`/`MapPopupCard` | Dùng `timezone` từ context truyền vào `formatEventTime`/`popupFields` | `PASS` |
| `TC-09` | Giữ default UTC của hàm thuần | Regression | Đọc 3 file | `popupFields`/`formatEventRow`/`detailFields` vẫn default `"UTC"` (I2) | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/timezone-context.test.ts
cd apps/web && pnpm test && pnpm build
```

- **Ngày chạy cuối:** 2026-11-23
- **Kết quả quan sát thật:** `timezone-context.test.ts` **5/5 PASS**; `timezone-display.test.ts` **4/4 PASS**; toàn bộ `pnpm test` **362/362 PASS** (các assertion cũ cập nhật additive — không xoá test); `pnpm build` **OK**. `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
