# Implementation Status: Ranking từ sự kiện, gom lọc quốc gia, tile cùng origin

## Metadata
- ID: 2026-11-23-overview-ranking-map-ux-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Overrides 2 proposal cũ)
- Tạo đồng thời plan/status/testcase
- Step 1–2: rankFromCountryCatalog/rankFromRegionCatalog (top 5 theo count, `TOP_RANK_LIMIT = 5`) + useOverviewData fetch catalog + OverviewPage ưu tiên/fallback
- Step 3: bỏ combobox quốc gia trong MapRegionPanel, dọn MonitoringMapPage (quốc gia lấy từ header/URL)
- Step 4: Vite proxy `/tile` → CARTO; SeismicMap dùng URL tương đối ở dev, tuyệt đối ở prod
- Step 5: test offline + validate
- Step 6 (yêu cầu mới): nhãn khoảng tin cậy ghi rõ mức 95% + tên mô hình (Overview, AI insights); test `forecast-confidence-label.test.ts`

In Progress: none
Blocked: none

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + `overview-ranking-catalog.test.ts`, `map-tile-proxy.test.ts` |
| Test/Build | PASS | FE `pnpm test` 266/266, `pnpm build` OK |
| Notes check | PASS | `notes_index.py --check` |
| Runtime | PASS | catalog 102 quốc gia; tile `/tile/...` → 200 PNG |

## Known Issues
- Cụm địa chấn vẫn rỗng (T4 DBSCAN chưa có) — nằm ở proposal riêng, không thuộc phạm vi này.

## Deviations From Plan
- `vite-proxy.test.ts` TC-01 cập nhật assertion theo cấu trúc `proxy` object mới (không xoá test).

## Decisions Made During Implementation
- Ranking từ catalog chỉ có count → avg/max để null, không bịa; fallback cụm cũ giữ nguyên.

## Next Actions
- CHECKPOINT 1: chờ `tiếp tục workflow` / dừng / sửa thêm.

## Last Update
2026-11-23 — Validation xanh, dừng CHECKPOINT 1.
