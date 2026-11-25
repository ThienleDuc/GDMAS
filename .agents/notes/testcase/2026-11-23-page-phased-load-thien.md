# Testcase: Giảm tải & chống giật các page bằng phased load

## Metadata
- ID: 2026-11-23-page-phased-load-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/features/overview/, apps/web/src/hooks/useEarthquakeInsights.ts, apps/web/src/features/earthquakes/EarthquakesPage.tsx
- Test File: apps/web/tests/page-phased-load.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: draft
- Related Bugs: none

## 1. Ràng buộc
I2 (flag default true), I3 (giữ filter), I5 (không mock, phân biệt Loading/Empty), I7 (offline).

| TC | Kết quả | Trạng thái |
|---|---|---|
| 01 | `useEarthquakeInsights` có options includeTemporal/includeClusters default true | `PASS` |
| 02 | phase 1 Overview = statistics + clusters + trend + earthquakes(5) | `PASS` |
| 03 | Không gọi `seasonality?interval=month`; field vẫn tồn tại (null) | `PASS` |
| 04 | EarthquakesPage truyền flag false → 3 request | `PASS` |
| 05 | Card phase 2 có skeleton, loading aggregate | `PASS` |
| 06 | refreshVersion (database_cleared) refetch cả 2 phase | `PASS` |
| 07 | 5 pattern page là chunk riêng (gộp theo yêu cầu) | `PASS` |

## 2. Lệnh & Kết quả
```bash
cd apps/web && pnpm test && pnpm build
```
- Ngày chạy: 2026-11-23
- Kết quả: `pnpm test` **297/297 PASS**, `pnpm build` OK, `notes_index.py --check` OK. Không xoá test cũ (2 assertion cập nhật theo flag/call mới).
- Build tạo 5 chunk riêng cho 5 pattern page (~0.5–0.9 kB/chunk); StatisticsRoutes không còn import tĩnh `patterns/index.ts`.

## 3. Lỗi & Bug Logs
- none
