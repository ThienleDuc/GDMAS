# Implementation Status: Giảm tải Statistics bằng sub-route

## Metadata
- ID: 2026-11-23-statistics-subroute-load-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved; plan/status/testcase sinh đồng thời
- `usePanel(fetcher, deps, enabled)` — không fetch khi `enabled=false`, state rỗng
- Provider đọc `useLocation()` + `patternSlugFor()` → chỉ bật đúng nguồn của route active (P5/P6 dùng chung cờ forecast)
- Test `statistics-subroute.test.ts` (4 case) — không đổi API/contract/filter

In Progress: none
Blocked: none

## Validation
| Kiểm tra | Kết quả |
|---|---|
| Testcase & test | DONE — `testcase/<id>.md` + `statistics-subroute.test.ts` |
| Test/Build | PASS — FE `pnpm test` 291/291, `pnpm build` OK |
| Notes check | PASS — `notes_index.py --check` |

## Known Issues
- `ExpertInsightsPanel` vẫn đọc context nên chỉ có insight của pattern đang xem (các nguồn khác để trống). Không bịa số.

## Deviations From Plan
- Giữ `StatisticsDataProvider`/context thay vì bỏ hoàn toàn: thêm cờ `enabled` vào `usePanel` + đọc route active. Cùng mục tiêu (1 request/pattern, 2 cho P5+P6) nhưng không phải sửa 6 page + ExpertInsightsPanel — giảm rủi ro (I2).

## Decisions
- Cờ enabled tính từ slug active; đổi `?country=&region=` hoặc `interval` vẫn refetch nguồn đang xem.

## Next Actions
- CHECKPOINT 1: chờ `tiếp tục workflow`.

## Last Update
2026-11-23 — Validation xanh, dừng CHECKPOINT 1.
