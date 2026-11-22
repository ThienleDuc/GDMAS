# Testcase: Ranking từ catalog, gom lọc quốc gia, tile cùng origin

## Metadata
- ID: 2026-11-23-overview-ranking-map-ux-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-23-overview-ranking-map-ux-thien.md
- Target: apps/web/src/features/overview/, apps/web/src/components/map/, apps/web/vite.config.ts
- Test File: apps/web/tests/overview-ranking-catalog.test.ts, apps/web/tests/map-tile-proxy.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Ranking có số thật từ catalog; panel bỏ combobox trùng; tile qua proxy cùng origin.
- I2 (giữ chữ ký hàm/props), I5 (không mock), I7 (offline).

| TC | Đầu vào | Kết quả | Kết quả |
|---|---|---|---|
| 01 | `rankFromCountryCatalog([{country:Japan,count:80}])` | `RankRow` count 80, avg/max null | `PASS` |
| 02 | `rankFromRegionCatalog` | RankRow theo region | `PASS` |
| 03 | OverviewPage ưu tiên ranking catalog | fallback cũ vẫn có | `PASS` |
| 04 | MapRegionPanel source | không còn `gm-country-combo` | `PASS` |
| 05 | SeismicMap TILE_URL | `/tile/...`, vite.config có proxy | `PASS` |

## 2. Lệnh & Kết quả
```bash
cd apps/web && pnpm test && pnpm build
```
- Ngày chạy: 2026-11-23
- Kết quả: `pnpm test` **266/266 PASS**, `pnpm build` OK, `notes_index.py --check` OK.
- Bổ sung theo yêu cầu người dùng: khoảng tin cậy Pattern 5 giờ ghi rõ **mức 95%** (`confidence_level`) và **cơ sở `ARIMA(2, 0, 1)_log`** (`model_name`) trên Overview & AI insights; payload thiếu → "mức chưa xác định", không tự giả 95%. Runtime xác nhận BE trả `confidence_level=0.95`, `model_name=ARIMA(2, 0, 1)_log`.
- Bổ sung theo yêu cầu người dùng: ranking chỉ lấy **top 5** quốc gia/khu vực (`TOP_RANK_LIMIT = 5`, truyền `limit` để đổi), sắp theo `count` giảm dần; không render toàn bộ 102 quốc gia.
- Runtime: `GET /api/v1/earthquakes/countries` → 102 quốc gia (top USA 8143); `GET /tile/dark_all/5/12/13.png` qua Vite → `200 image/png` 256×256 (proxy tới CARTO thành công).

## 3. Lỗi & Bug Logs
- none
