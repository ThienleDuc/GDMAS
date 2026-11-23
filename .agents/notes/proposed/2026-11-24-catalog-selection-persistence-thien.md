<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Giữ lựa chọn quốc gia/khu vực khi chuyển trang & sau chu kỳ cập nhật 5 phút

## Metadata
- ID: 2026-11-24-catalog-selection-persistence-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/web/src/layouts/`, `apps/web/src/features/{earthquakes,overview,statistics}/`, `apps/web/tests/`
- Architecture Impact: none   <!-- FE-only; vẫn dùng `?country=&region=` làm nguồn sự thật, không đổi API/contract -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md   (*URL `?country=&region=` là nguồn sự thật — proposal này **tuân thủ**, không override*)
  - .agents/notes/proposed/2026-11-23-earthquakes-filter-header-controls-thien.md
  - .agents/notes/proposed/2026-11-23-overview-ranking-map-ux-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Header có 2 combobox dùng chung: `GlobalCountryFilter` → `?country=`, `GlobalRegionFilter` → `?region=`
(nguồn sự thật duy nhất, proposal `2026-11-21-header-country-clock-refresh-thien`). Các trang đọc qua
`useCatalogSelection()`; chu kỳ 5 phút (`ingestion_cycle_completed`) tăng `refreshVersion` → refetch với
`geo = {country, region}`.

### Vấn đề
Các liên kết điều hướng dùng `to` tĩnh:
- `DashboardLayout`: `<NavLink to={item.path}>`
- `OverviewPage`: `navigate(APP_ROUTES.MONITORING)`, `<Link to={MONITORING|STATISTICS|EARTHQUAKES}>`
- `StatisticsLayout`: `<NavLink to={patternPath(item.slug)}>`

→ Khi chuyển trang, query `?country=&region=` bị rơi, combobox header trở về "Tất cả", người dùng phải chọn lại mỗi lần.
Người dùng làm rõ: **không phải cố định vĩnh viễn** (vẫn được đổi), chỉ là không muốn chọn lại khi chuyển trang;
và khi refresh 5 phút kích hoạt thì bộ lọc vẫn phải được áp dụng.

### Ảnh hưởng
Lọc dùng chung bị đứt giữa các giao diện, dễ đọc nhầm số liệu toàn cục thành số liệu đã lọc (I3/I5).

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `apps/web/src/features/earthquakes/catalog-selection.ts` | `parseSelection`, `selectionToParams(selection, base)` — đã merge param vào base, pure. |
| `apps/web/src/features/earthquakes/useCatalogSelection.ts` | Trả `{country, region, setCountry, setRegion, setSelection, reset}` — đọc/ghi URL, **chưa** có helper tạo link. |
| `apps/web/src/layouts/DashboardLayout.tsx` | `NavLink to={item.path}` — rơi query. |
| `apps/web/src/features/overview/OverviewPage.tsx` | `navigate`/`Link` tĩnh; `handleRankSelect` gọi `setSelection` rồi navigate — cần truyền selection mới rõ ràng. |
| `apps/web/src/features/statistics/StatisticsLayout.tsx` | `NavLink to={patternPath(...)}` — rơi query. |
| `apps/web/src/hooks/useDatabaseReset.ts` + `useOverviewData.ts` | `ingestion_cycle_completed` → `refreshVersion++` → refetch theo `geo` (đã đúng nếu URL giữ param). |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Mọi điều hướng nội bộ (aside, hero CTA, link "xem toàn bộ danh mục", xếp hạng → bản đồ, tab 6 Patterns) **giữ nguyên** `?country=&region=` đang chọn.
  2. Combobox vẫn cho phép đổi bất kỳ lúc nào — không khóa cứng; reset về "Tất cả" vẫn dùng được (`reset()`).
  3. Sau chu kỳ cập nhật 5 phút, bộ lọc vẫn áp dụng (kiểm chứng bằng assertion: refetch dùng `geo` từ `useCatalogSelection`, không hardcode `all`).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE, API, contract, migration, SSE protocol.
  - Không thay nguồn sự thật: **không** dùng localStorage thay URL (deep link vẫn活动).
  - Không đổi logic lọc dữ liệu, badge/màu, header combobox UI.
  - Không xoá test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm hàm/phương thức mới, giữ nguyên chữ ký `useCatalogSelection()` và các props/link cũ. FE thuần (I1), UTC/WGS84 không đổi (I3), không mock (I5), test offline (I7).

### 4.1. Hàm thuần tạo link có selection
- `catalog-selection.ts`: thêm `pathWithSelection(to: string, selection: CatalogSelection): string` — tách path/query/hash, gọi `selectionToParams(selection, existingParams)`, trả `path?country=..&region=..#hash`. Pure, test node:test được.
- `useCatalogSelection.ts`: thêm `withSelection: (to: string) => string` vào `CatalogSelectionResult`, implement bằng `pathWithSelection(to, {country, region})` (useCallback theo `country`/`region`).

### 4.2. Dùng ở mọi điều hướng
- `DashboardLayout.tsx`: `const { withSelection } = useCatalogSelection()` → `<NavLink to={withSelection(item.path)}>`.
- `OverviewPage.tsx`: lấy thêm `withSelection`; `navigate`/3 `<Link>` dùng `withSelection(...)`.
  `handleRankSelect`: tính selection mới `next = {country: ..., region: ...}` rồi `navigate(pathWithSelection(APP_ROUTES.MONITORING, next))` — tránh stale closure của `withSelection`.
- `StatisticsLayout.tsx`: `withSelection(patternPath(item.slug))` cho tab NavLink.

### 4.3. Refresh 5 phút vẫn giữ filter
- Không đổi `CompactRefreshCountdown`/`sse.reconnect` — URL không bị ghi khi reconnect.
- Bổ sung test structural: `useOverviewData({country, region}, refreshVersion, window)` trong `OverviewPage` và `dbReset.refreshVersion` từ `ingestion_cycle_completed` — chứng minh refetch dùng filter hiện tại.

### 4.4. Test (đồng thời khi §9 Approved — I7)
- `apps/web/tests/catalog-selection-persistence.test.ts` (mới): thuần — `pathWithSelection` giữ query/hash khác, xoá param khi về `all`, không nhân đôi; source assertion 3 file nav dùng `withSelection`.
- `apps/web/tests/header-global.test.ts` / `overview-page.test.ts`: bổ Sung assertion link có selection + refresh dùng `geo` (không xoá test cũ).
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Lưu selection vào localStorage rồi khôi phục ở shell
Ưu: sống cả khi mở tab mới. Nhược: 2 nguồn sự thật (URL + storage), conflict với deep link `?country=X`, dễ lệch khi chia sẻ link. **Không chọn.**

### B (chọn): Giữ query param trên mọi link nội bộ — URL vẫn là nguồn duy nhất
Ưu: nhất quán deep link, không state trùng, deep-link vẫn đúng, user vẫn đổi/reset được. Nhược: phải sửa vài chỗ điều hướng + test. **Chọn.**

### C: Context provider lưu selection ở shell
Ưu: tự động mọi navigation. Nhược: tách khỏi URL, phải sync 2 chiều, rủi ro stale; vượt phạm vi bug. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 hàm thuần + 1 method + 3 file link |
| Hiệu năng | Không đổi | Chỉ nối query string |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký cũ, thêm method mới |
| Độ tin cậy | Tốt | Một nguồn sự thật; refresh dùng filter hiện tại |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Stale closure ở `handleRankSelect` | Trung bình | Trung bình | Truyền selection mới vào `pathWithSelection` thay vì `withSelection` |
| Link có query lạ bị nhân đôi | Thấp | Thấp | Dùng `selectionToParams(base)` — set/delete thay vì nối chuỗi |
| Working tree timezone chặn nhánh/sync | Cao | Trung bình | Chờ người dùng chọn (a/b/c) trước Phần A hoặc stage chọn lọc như trước |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-24-catalog-selection-persistence-thien.md`
- **Code test offline:** `apps/web/tests/catalog-selection-persistence.test.ts` (mới) + bổ sung test cũ.
- **Cách kiểm chứng:** `pnpm build`, `pnpm test`, `notes_index.py --check`; tay: chọn quốc gia/khu vực → chuyển trang qua aside/CTA/tab → combobox vẫn giữ; đổi/reset vẫn được; chờ 5 phút (hoặc giả SSE) → số liệu vẫn theo filter.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng đang thao tác xác nhận rõ trong chat 2026-11-24: "sau khi có proposal thì approved và triển khai". Duyệt toàn bộ §4: thêm `pathWithSelection` thuần + `withSelection` trong `useCatalogSelection`, dùng cho mọi link điều hướng (aside, overview CTA/link, tab Statistics), giữ URL làm nguồn duy nhất; refresh 5 phút vẫn refetch theo filter hiện tại. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ handle nào cũng duyệt). Sau `Approved`: xử lý working tree timezone (đang chặn local sync) rồi rẽ nhánh `fix/2026-11-24-catalog-selection-persistence-thien`; sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`; implement, test, validation, dừng **CHECKPOINT 1**.
