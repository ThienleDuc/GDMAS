# Proposal: Áp dụng chế độ UTC/UTC+7 từ Header tới mọi trang dùng thời gian

## Metadata
- ID: 2026-11-23-global-timezone-context-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: refactor
- Status: approved
- Priority: medium
- Area: apps/web/src/layouts/header/RealtimeClock.tsx, apps/web/src/layouts/DashboardLayout.tsx, apps/web/src/features/{overview,earthquakes,monitoring}/, apps/web/src/components/map/, apps/web/src/utils/timezone.ts, apps/web/tests/
- Architecture Impact: none — chỉ thay luồng state phía FE; không đổi UTC storage, payload API, `contracts/`, `docs/api/API.md`.
- Related Docs:
  - docs/coding-rules.md (I1–I7, RULE-03)
  - docs/agent-workflow.md
- Related Proposals:
  - Liên quan: 2026-11-21-header-country-clock-refresh-thien — proposal đó **tạo** đồng hồ UTC/UTC+7 ở header + helper thuần `utils/timezone.ts`, nhưng chưa lan chế độ đã chọn xuống các trang. Proposal này mở rộng, **không override** quyết định cũ (giữ nguyên helper, localStorage, UI header).
  - Liên quan: 2026-11-22-earthquake-detail-panel-thien — panel chi tiết nhận `timezone` qua prop; proposal này đổi nguồn prop thành context (giữ chữ ký prop, I2).
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Header có nút toggle UTC ⇄ UTC+7 (`RealtimeClock.tsx`) lưu lựa chọn vào `localStorage` qua `setStoredTimezone()`. Các helper `getStoredTimezone()` / `formatEventTime(iso, mode)` đã có sẵn và chạy offline.

### Vấn đề
Người dùng (`thien`) yêu cầu 2026-11-23: "UTC trên header phải được áp dụng vào mọi trang có sử dụng utc cho thời gian". Hiện tại:
- `OverviewPage`, `EarthquakesPage` gọi `getStoredTimezone()` **một lần lúc mount** (`useState`) → đổi ở header không cập nhật cho tới khi reload.
- `EventListPanel` (trang Bản đồ) **hardcode** `formatEventTime(..., "UTC")`.
- `popupFields()` mặc định `mode = "UTC"`; `MapPopupCard` không truyền mode.
- `formatEventRow()` / `earthquakeDetailFields()` mặc định `"UTC"` và thường được gọi không truyền mode.

### Ảnh hưởng
Cùng một sự kiện hiển thị giờ khác nhau giữa header, Danh mục, Tổng quan, Bản đồ và Panel chi tiết — sai kỳ vọng người dùng và khó đối chiếu với chu kỳ 5 phút.

---

## 2. Hiện trạng
| Vị trí | Cách đọc timezone hiện tại |
|---|---|
| `utils/timezone.ts` | `TimezoneMode = "UTC" \| "UTC+7"`, `getStoredTimezone()` (mặc định UTC+7), `setStoredTimezone()`, `formatEventTime(iso, mode = "UTC+7")`, `formatClockTime(now, mode)` — **giữ nguyên** |
| `RealtimeClock.tsx` | `useState(getStoredTimezone())` nội bộ + `setStoredTimezone(next)` — chưa broadcast |
| `OverviewPage.tsx:60` | `const timezone = getStoredTimezone()` (snapshot) |
| `EarthquakesPage.tsx:53` | `useState(getStoredTimezone())` (snapshot) |
| `EventListPanel.tsx` | `formatEventTime(event.eventTime, "UTC")` (hardcode) |
| `monitoring-view.ts:184` | `popupFields(event, mode = "UTC")` |
| `earthquake-view.ts:103`, `earthquake-detail.ts:20` | default `"UTC"` |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Tạo `TimezoneContext` dùng chung tại `DashboardLayout` (một nguồn sự thật), expose `{ timezone, setTimezone }`; `RealtimeClock` đọc/ghi qua context thay vì state nội bộ (vẫn gọi `setStoredTimezone` để persist — I2).
  2. Mọi nơi hiển thị thời gian (Overview, Danh mục, Bản đồ popup + danh sách, Panel chi tiết, SSE meta nếu có) dùng `useTimezone()` từ context, đổi ở header là **cập nhật ngay** không cần reload.
  3. Giữ nguyên helper thuần và chữ ký hàm/props cũ để caller cũ không vỡ (I2); mặc định vẫn UTC+7 khi chưa có lựa chọn.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE, storage UTC (`TIMESTAMPTZ` / ISO `Z`), `contracts/`, `docs/api/API.md`, migration (I3/I4).
  - Không thêm thư viện, không đổi cấu trúc route, không commit/push ở proposal này.

---

## 4. Giải pháp đề xuất
1. **Tệp mới** `apps/web/src/contexts/timezone-context.tsx`: `TimezoneProvider` (đọc `getStoredTimezone()` lúc mount, `setTimezone` gọi `setStoredTimezone` + `setState`) + hook `useTimezone()`; ném lỗi rõ nếu dùng ngoài provider.
2. `DashboardLayout.tsx`: bọc `<Outlet />` bằng `TimezoneProvider` (cùng chỗ với `SseMarkersProvider`) — không thêm state ở page nào.
3. `RealtimeClock.tsx`: thay `useState`/`setStoredTimezone` trực tiếp bằng `const { timezone, setTimezone } = useTimezone()`; giữ UI nút toggle & `formatClockTime` như cũ.
4. `OverviewPage.tsx`, `EarthquakesPage.tsx`: thay snapshot `getStoredTimezone()` bằng `useTimezone().timezone` → re-render khi đổi.
5. `EventListPanel.tsx`: bỏ hardcode `"UTC"`, dùng `useTimezone().timezone`; `MapPopupCard.tsx`: truyền mode từ `useTimezone()` vào `popupFields(event, mode)` (giữ default `"UTC"` của hàm — I2).
6. `earthquake-view.ts` / `earthquake-detail.ts`: caller truyền mode từ context; **giữ** default `"UTC"` trong chữ ký hàm (I2).
7. Kiểm chứng bằng test thuần: context trả mode mặc định, `setTimezone` ghi localStorage (giả lập), `formatEventTime` với 2 mode cho output khác nhau — chạy `node --test` offline (I7), không render DOM/leaflet.

Tuân **I1** (chỉ FE/T7), **I2** (thêm file/context; giữ helper & prop cũ), **I3** (dữ liệu vẫn UTC `Z`, chỉ đổi cách hiển thị), **I5** (không mock), **I7** (test offline).

---

## 5. Phương án đã cân nhắc
### A: Mỗi page tự poll localStorage (`storage` event)
Ưu: không context. Nhược: rời rạc, dễ sót page mới, khó test. **Không chọn.**
### B: Context dùng chung tại shell (chọn)
Ưu: một nguồn sự thật, đổi ngay mọi trang, dễ test. Nhược: thêm 1 provider + sửa vài caller. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 context + ~6 caller |
| Hiệu năng | Tốt | Chỉ re-render consumer khi đổi mode (hiếm) |
| Open-Closed | Tốt | Giữ helper/props cũ, chỉ thêm provider |
| Độ tin cậy | Tốt | Hết tình trạng lệch giờ giữa các trang |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Giảm thiểu |
|---|---|---|
| Page render ngoài DashboardLayout không có provider | Thấp | Hook ném lỗi rõ; tất cả page hiện tại đều nằm trong layout |
| Test cũ soi cứng `getStoredTimezone()` ở page | Trung bình | Chạy `pnpm test`, cập nhật assertion additive, không xoá test |
| localStorage chặn (private mode) | Thấp | Helper cũ đã try/catch; context kế thừa |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-23-global-timezone-context-thien.md` *(copy `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):** `apps/web/tests/timezone-context.test.ts` *(mới — mode mặc định, persistence qua localStorage giả lập, format 2 mode)*; cập nhật additive test cũ nếu soi cứng snapshot.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`; bấm toggle UTC/UTC+7 ở header rồi lần lượt mở Tổng quan, Danh mục, Bản đồ (popup + danh sách), Panel chi tiết → cùng một mode, đổi ngay không reload.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng (`thien`) xác nhận rõ trong chat 2026-11-23: "Approved - tiếp tục workflow" cho proposal này. Ghi nhận §9 Approved theo quy chế thả lỏng (không cần chờ ThienleDuc). Nhánh `refactor/2026-11-23-global-timezone-context-thien` đã checkout từ develop; PR #103/#104 đã merge xong trước đó.
Scope of Rejection: -

---

## 10. Next Action
§9 Approved → đã checkout nhánh `refactor/2026-11-23-global-timezone-context-thien`, sinh artifacts, triển khai, validation xanh, dừng CHECKPOINT 1.

### Revision 2026-11-23 (fix runtime: provider phải bọc cả header)
- Lỗi runtime: `Uncaught Error: useTimezone phải được dùng trong <TimezoneProvider>` tại `RealtimeClock`.
- Nguyên nhân: provider ban đầu chỉ bọc `<Outlet />` trong `<main>`, trong khi `RealtimeClock` nằm ở `<header>` (sibling phía trên).
- Sửa: dời `<TimezoneProvider>` lên bọc toàn bộ root `<div className="layout layout--dashboard app-layout">` của `DashboardLayout`; bỏ provider cũ trong `<main>`. Giờ cả header lẫn mọi page đều ở trong provider.
- Test: cập nhật TC-05 trong `timezone-context.test.ts` — provider đứng trước root layout, bọc `HeaderActions`, không còn provider trong `<main>`. `pnpm test` **326/326 PASS**, `pnpm build` OK.
