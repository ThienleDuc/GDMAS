<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Giữ lựa chọn quốc gia/khu vực khi chuyển trang & sau refresh

## Metadata
- ID: 2026-11-24-catalog-selection-persistence-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/earthquakes/{catalog-selection,useCatalogSelection}.ts`, `apps/web/src/layouts/`, `apps/web/src/features/{overview,statistics}/`
- Test File: `apps/web/tests/catalog-selection-persistence.test.ts` (mới), bổ sung `header-global.test.ts`, `overview-page.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** hàm thuần `pathWithSelection`, method `withSelection`, 3 file điều hướng, refetch theo filter sau SSE 5 phút.
- **Ràng buộc:** I2 (giữ chữ ký cũ), I3 (URL làm nguồn sự thật), I5 (không mock), I7 (offline, không xoá test).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- `node:test`, không mạng; fixture selection `{country:"Japan", region:"Tokyo"}` và `{country:"all", region:"all"}`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Nối selection vào path thuần | Functional | `pathWithSelection("/monitoring", {Japan,Tokyo})` | `/monitoring?country=Japan&region=Tokyo` | `PASSED` |
| `TC-02` | Về "all" thì xoá param | Boundary | selection all/all + base có sẵn query | Không còn `country`/`region`, giữ query khác & hash | `PASSED` |
| `TC-03` | method `withSelection` | Structural | Đọc `useCatalogSelection.ts` | Có `withSelection` trong result, dùng `pathWithSelection` | `PASSED` |
| `TC-04` | 3 file điều hướng dùng helper | Structural | Đọc `DashboardLayout`, `OverviewPage`, `StatisticsLayout` | NavLink/Link/navigate dùng `withSelection`; `handleRankSelect` dùng `pathWithSelection` với selection mới | `PASSED` |
| `TC-05` | Refresh 5 phút giữ filter | Structural | Đọc `OverviewPage.tsx` | `useOverviewData({country, region}, dbReset.refreshVersion, window)` — không hardcode `all` | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **357 tests / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
