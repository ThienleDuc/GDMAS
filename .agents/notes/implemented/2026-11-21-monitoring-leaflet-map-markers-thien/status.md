# Implementation Status: Bản đồ GIS Leaflet với marker động đất — `/monitoring` (T7.04)

## Metadata
- ID: 2026-11-21-monitoring-leaflet-map-markers-thien
- Status: completed   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-21
- Last Updated: 2026-11-21
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Vòng 2 (Revision 2026-11-21) xong — dừng CHECKPOINT 1

Completed:
- Vòng 1: bản đồ Leaflet + marker/Popup 6 trường + SSE shell + 10 test; 101/101 pass, build sạch.
- Proposal cập nhật Revision 2026-11-21 (§9 vẫn Approved, Comments ghi directive).
- Vòng 2 — aside tự thu khi vào `/monitoring` (useEffect theo `location.pathname` trong `DashboardLayout`).
- Vòng 2 — lọc quốc gia/khu vực: `region-filter.ts`, `countryFromPlace` nhận mã bang Mỹ, `MapControlsPanel` 2 select, bỏ bbox khi chọn cụ thể, SSE vẫn áp dụng sau khi lọc.
- Vòng 2 — đồng bộ Danh mục ↔ Bản đồ qua `?country=&region=` (`catalog-selection.ts` + `useCatalogSelection.ts`); page Danh mục có 2 select.
- Vòng 2 — `MapLegend` 4 màu + nhãn "Độ lớn"/mức độ tiếng Việt; `MAP_PAGE_SIZE = 100`.
- Vòng 2 — audit FE↔BE: B1 (empty envelope không throw), O2 (limit ≤ 100), C1 (`raw_data`), C2 (`details`); test TC-13…TC-18 pass.
- Vòng 3 — panel lọc dạng DANH SÁCH bên trái bản đồ: `MapRegionPanel` + mock cụm, chú giải góc trái-dưới; test TC-19/TC-20 pass.
- Vòng 4 — `gm-map__controls` lên đầu sidebar; quốc gia = combobox có tìm kiếm, khu vực = danh sách nút bấm (hàng rõ hơn, hiện tên quốc gia khi đang "Tất cả"); `EarthquakesPage.tsx` đã hoàn nguyên về checkout theo yêu cầu (không còn trong diff).
- Vòng 5 — sidebar nới rộng 300px → 360px, chữ to hơn; responsive `@media (width<=900px)`: panel lọc nổi lên có nút "Bộ lọc & khu vực" ẩn/hiện + nút ×; mọi chữ dài ép 1 hàng có dấu "..." (text-overflow: ellipsis).
- Vòng 6 — `.gm-region-panel__region-body` chuyển `column → row`: khu vực và quốc gia cùng 1 hàng, cách nhau `var(--space-2)`, mỗi bên có `min-width:0 + ellipsis`; thêm thuộc tính `title` trên tên khu vực/quốc gia/số liệu và option combobox để xem nội dung đầy đủ.

In Progress:
- none (chờ xác nhận CHECKPOINT 1 để commit/push/PR)

Blocked:
- B2 (BE `/clusters` thiếu `dominant_place`) — người dùng sẽ sửa BE sau; FE hiện fallback `"Khác"` khi thiếu. Không chặn T7.04.

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` passed; `monitoring-map.test.ts` (13 TC) + `region-filter.test.ts` + `catalog-selection.test.ts` + 2 file bổ sung |
| Test liên quan (`pnpm test`) | PASS | `cd apps/web && pnpm test` → **110/110 pass, 0 fail** (offline 100%) |
| Lint / Build (`pnpm build`) | PASS | `tsc -b && vite build` sạch; 2148 modules; CSS 59.82 kB / JS 467.10 kB |
| Notes check (`notes_index.py --check`) | PASS | OK |
| OCP working tree | PASS | không có file bị xóa; không đụng `apps/api/**`, repo `contracts/`, `docs/api/API.md` |
| CSS order | PASS | `.gm-*` được emit sau `globals.css` (import tập trung trong `styles/index.css`) |

---

## Known Issues
- B2: `/clusters` thiếu `dominant_place` → cụm thật rơi vào "Khác" (chờ BE, không phải lỗi FE).
- C4/C5 (cosmetic: mock SSE wrapper, param analysis bị BE bỏ qua) chưa sửa — không ảnh hưởng T7.04.
- project-review: mock cụm khu vực nằm riêng trong `mock-region-clusters.ts` theo yêu cầu người dùng; marker sự kiện vẫn lấy API thật, không thay API bằng mock — WARNING được chấp nhận, không chặn merge.

---

## Deviations From Plan
- Không đổi BE theo B2 (để người dùng xử lý sau như đã trao đổi).
- Không sửa `docs/api/API.md` (vùng khóa, drift docs-only đã ghi nhận §4.9 proposal).

---

## Decisions Made During Implementation
- Nhánh feature tạo sớm theo yêu cầu; SSE chia sẻ qua context tại shell (một EventSource).
- CSS page chuyển về import tập trung trong `styles/index.css` để tránh thứ tự ghi đè với globals.
- Lọc quốc gia/khu vực suy từ `place` (BE không có field riêng); `place` null → "Khác", không bịa dữ liệu.

---

## Next Actions
- none — proposal đã Approved, PR #38 đã merge vào `develop`; task hoàn tất.

---

## Merge Record
- PR: https://github.com/ThienleDuc/GDMAS/pull/38
- Merge commit: `21c712f` (`Merge pull request #38 from ThienleDuc/feat/2026-11-21-monitoring-leaflet-map-markers-thien`)
- Feature commit: `67fb8c8`
- Dry-run trước merge: 0 conflict (`mergeable=MERGEABLE`, `state=CLEAN`).

---

## Last Update
2026-11-21 — PR #38 đã merge vào `develop` (SHA `21c712f`), sync xong; `Status: completed`.
