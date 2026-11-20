# Proposal: Trang Danh mục động đất với bộ lọc thời gian & độ lớn (Task T7.03)

## Metadata
- ID: 2026-11-20-earthquakes-catalog-filter-thien
- Author: agent | thien
- Created: 2026-11-20
- Type: feature
- Status: approved
- Priority: high
- Area: `apps/web/src/features/earthquakes/`, `apps/web/src/app/App.tsx`, `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ dựng UI FE tiêu thụ GET /api/v1/earthquakes; không đổi endpoint, schema hay payload. -->
- Related Docs:
  - docs/api/API.md §3.2 (`GET /api/v1/earthquakes` — params, envelope, metadata)
  - docs/coding-rules.md (I2/I3/I5/I7)
  - docs/development/coding-conventions.md §3.2–§3.3 (service layer, UI 3 trạng thái)
  - docs/task/thien.md — T7.03
  - contracts/README.md §3.1, §3.8
- Related Proposals:
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — nền FE mới (1 layout, globals.css, lib/contracts); proposal này xây page đầu tiên trên nền đó.
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md — T7.02 đã chuẩn hoá `getEarthquakes` + guard UTC/WGS84.
  - Overrides: 2026-11-16-fe-contract-gis-reports-thien — `EarthquakesPage.tsx` của proposal đó đã bị gỡ trong PR #26; proposal này dựng lại trang trên nền mới, không khôi phục mã cũ.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Sau PR #26, route `APP_ROUTES.EARTHQUAKES` đang trỏ tới `PlaceholderPage`. T7.01 (nền tảng) và T7.02 (hợp đồng T6↔T7) đã hoàn tất; các task UI sau phụ thuộc vào việc có trang Danh mục động đất thật để kiểm chứng dữ liệu thật.

### Vấn đề
Chưa có giao diện liệt kê sự kiện với phân trang, lọc thời gian/độ lớn/độ sâu và xử lý đúng 3 trạng thái Loading/Error/Empty theo dữ liệu từ T6.

### Ảnh hưởng
Đây là task UI đầu tiên sau tái cấu trúc; nếu sai hợp đồng hoặc fallback mock sẽ vi phạm I5 và làm sai Kịch bản Demo 6 bước.

---

## 2. Hiện trạng
- `apps/web/src/app/App.tsx`: 6 route dùng chung `PlaceholderPage`; layout duy nhất `DashboardLayout` (aside + Outlet).
- `apps/web/src/services/earthquake-api.ts`: `getEarthquakes(params, signal)` đã validate UTC `Z`, bbox WGS84, thời gian tăng dần (T7.02).
- `apps/web/src/contracts/earthquake.ts`: `EarthquakeItem`, `EarthquakeListResponse`, `QueryEarthquakeParams` đầy đủ.
- `apps/web/src/lib/formatters.ts`: `formatEventTime` (re-export từ `utils/timezone.ts`), `formatWgs84Point`.
- `apps/web/src/styles/globals.css`: có `.page-title`, `.text-caption`, `.dashboard-card`, `.ds-table-wrapper`, `.ds-button*`; `styles/index.css` chỉ import.
- Không có DOM testing library; test FE dùng `node --test` + type stripping → cần tách logic thuần để test offline.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Trang `/earthquakes` hiển thị bảng sự kiện thật từ `GET /api/v1/earthquakes`, phân trang và sắp xếp.
  2. Bộ lọc Ngày/Tuần/Tháng + thanh magnitude/depth (debounce), đổi filter → reset `page = 1` và refetch đúng query.
  3. Thời gian hiển thị qua `formatEventTime` (mặc định UTC, cho phép UTC+7), toạ độ qua `formatWgs84Point`.
  4. Đủ 3 trạng thái Loading (skeleton) / Error (`ApiError` + Retry) / Empty (DB rỗng), không fallback mock.
  5. Có module logic thuần + test offline 100% cho 4 nhóm trạng thái và ánh xạ param.
- **Out of Scope:** không đụng T6/API/schema, không xây bản đồ (T7.04), không sửa layout dùng chung, không thêm dependency test DOM.

---

## 4. Giải pháp đề xuất
- Tạo `apps/web/src/features/earthquakes/EarthquakesPage.tsx` (theo naming convention) thay `PlaceholderPage` cho route `EARTHQUAKES` trong `App.tsx`.
- Tách logic thuần vào `apps/web/src/features/earthquakes/earthquake-view.ts` (additive, dễ test):
  - `buildEarthquakeQuery(filters, page, limit): QueryEarthquakeParams` — ánh xạ `dateRange` (day/week/month) sang `start_time`/`end_time` UTC `Z`, kèm min/max magnitude/depth, `sort_by`, `order`, `page`, `limit`.
  - `deriveViewState(input): "loading" | "error" | "empty" | "ready"` — từ loading flag / error / `data.length`.
  - `formatEventRow(item)` — dùng `formatEventTime`/`formatWgs84Point` (không format lại trong JSX).
- Component dùng CSS class có sẵn từ `globals.css` (`.page-title`, `.dashboard-card`, `.ds-table-wrapper`, `.ds-button`), không import CSS riêng nếu không cần; nếu cần file CSS thì đặt cạnh page theo cấu trúc đã định.
- Debounce thanh lọc bằng `useEffect` + `setTimeout` trong component (không đưa timer vào module thuần).
- Test offline `apps/web/tests/earthquakes-page.test.ts`: gọi `buildEarthquakeQuery`, `deriveViewState` và một hàm fetch thuần có dependency injection (`fetchPage(params, fetcher = getEarthquakes)`) để mock — đủ 4 trạng thái, UTC/WGS84, reset page, param mapping.

---

## 5. Phương án đã cân nhắc
### Phương án A: Viết mọi logic trong component
Ưu: ít file. Nhược: không test được bằng `node --test` (không có DOM lib), khó kiểm chứng I5. **Không chọn.**
### Phương án B: Tách module logic thuần + component mỏng
Ưu: test offline đầy đủ, component chỉ render, dễ mở rộng cho T7.04/T7.10. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Số file | +2 source (page + view) +1 test | Tách logic để test 100% offline |
| Hiệu năng | Debounce tránh gọi API liên tục | Theo yêu cầu task |
| Bảo trì / OCP | Tốt | Không sửa service/contracts/layout; chỉ thay placeholder bằng page mới |
| Độ tin cậy | Tốt | 4 trạng thái được test; dữ liệu rỗng hiển thị Empty, không mock |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Query lọc sai định dạng UTC | Trung bình | Trung bình | Dùng helper tạo `Z`, dựa guard `isUtcTimestamp` của T7.02; test mapping |
| API trả metadata không đủ | Thấp | Thấp | `total_pages` fallback 1, `total` fallback `data.length` |
| Component render lỗi do class design system | Thấp | Thấp | Dùng class có sẵn trong `globals.css`; `pnpm build` là gate |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-20-earthquakes-catalog-filter-thien.md`
- **Code test tự động (offline):** `apps/web/tests/earthquakes-page.test.ts` *(mới — thuần `node --test`, mock fetcher, không DOM/mạng)*
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test`; cơ bản đối chiếu `docs/api/API.md` §3.2; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-20
Comments: Người dùng xác nhận rõ "Approved — tiến hành implement" trong chat. Duyệt phạm vi §4, gồm tách logic thuần để test offline; không đổi API/schema, không đụn dịch vụ/layout đã ổn định.
Scope of Rejection: -

---

## 10. Next Action
Đã sang Pha 4 (`build-implementation`): implement theo `.agents/notes/implemented/2026-11-20-earthquakes-catalog-filter-thien/plan.md`, validation xanh rồi dừng CHECKPOINT 1.
