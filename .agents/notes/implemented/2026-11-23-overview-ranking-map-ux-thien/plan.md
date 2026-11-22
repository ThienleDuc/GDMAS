# Implementation Plan: Ranking từ sự kiện, gom lọc quốc gia, tile cùng origin

## Metadata
- ID: 2026-11-23-overview-ranking-map-ux-thien
- Proposal: .agents/notes/proposed/2026-11-23-overview-ranking-map-ux-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: in_progress

---

## 1. Mục tiêu
Xếp hạng Overview có số thật từ catalog sự kiện; bỏ combobox quốc gia trùng trong MapRegionPanel; tile bản đồ đi qua Vite proxy cùng origin.

## 2. Phạm vi
### In Scope
- `apps/web/src/features/overview/overview-view.ts` (thêm hàm thuần rank từ catalog)
- `apps/web/src/features/overview/useOverviewData.ts` (fetch catalog, trả ranking)
- `apps/web/src/features/overview/OverviewPage.tsx` (dùng ranking catalog, fallback cũ)
- `apps/web/src/components/map/MapRegionPanel.tsx` (bỏ combobox quốc gia)
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` (bỏ prop/fetch liên quan)
- `apps/web/vite.config.ts` (proxy `/tile`)
- `apps/web/src/components/map/SeismicMap.tsx` (URL tile tương đối)
- `apps/web/src/features/overview/OverviewPage.css` (nhãn cơ sở tin cậy)
- `apps/web/src/features/statistics/ai-insights.ts` (mức + mô hình trong evidence)
- `apps/web/tests/overview-ranking-catalog.test.ts`, `apps/web/tests/map-tile-proxy.test.ts`, `apps/web/tests/forecast-confidence-label.test.ts` (mới)
- `apps/web/tests/vite-proxy.test.ts` *(cập nhật assertion theo cấu trúc proxy object — không xoá test)*
- `.agents/notes/testcase/2026-11-23-overview-ranking-map-ux-thien.md`

### Out of Scope
- T4 DBSCAN/seed cụm, mock region clusters, `contracts/`, migration, BE routes.

## 3. Các bước
1. Hàm thuần rank từ catalog → `RankRow[]` (avg/max = null).
2. `useOverviewData` gọi catalog; `OverviewPage` ưu tiên ranking mới.
3. Bỏ combobox quốc gia trong panel + dọn parent.
4. Proxy `/tile` trong vite.config + đổi TILE_URL.
5. Test offline + validate.

## 4. Thay đổi dữ liệu/API/cấu hình
- Không đổi payload; chỉ Vite dev proxy `/tile`.

## 5. Validation
- [x] testcase note sinh đồng thời
- [ ] `pnpm test` + `pnpm build`
- [ ] `notes_index.py --check`
- [ ] curl catalog & tile

## 6. Rủi ro
Catalog rỗng → fallback; tile proxy chỉ dev.

## 7. Rollback
Revert PR;面板/header vẫn chạy độc lập.

## 8. Ghi chú
`Overrides:` 2 proposal cũ; không mock (I5).
