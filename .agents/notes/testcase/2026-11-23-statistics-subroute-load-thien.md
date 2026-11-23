# Testcase: Giảm tải Statistics bằng fetching theo sub-route

## Metadata
- ID: 2026-11-23-statistics-subroute-load-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-23-statistics-subroute-load-thien.md
- Target: apps/web/src/features/statistics/
- Test File: apps/web/tests/statistics-subroute.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: draft
- Related Bugs: none

## 1. Ràng buộc
I2 (giữ export/chữ ký), I5 (không mock), I7 (offline).

| TC | Đối tượng | Kết quả | Trạng thái |
|---|---|---|---|
| 01 | Temporal page | Chỉ gọi `/analysis/temporal` | `PASS` |
| 02 | Trend/Seasonality/Correlation | Mỗi page 1 endpoint | `PASS` |
| 03 | Forecast+Classification | 2 endpoint | `PASS` |
| 04 | Filter country/region | Vẫn forward | `PASS` |
| 05 | Không fetch sẵn 6 nguồn | Provider vẫn tồn tại nhưng `enabled=false` với nguồn không active → 0 request | `PASS` |

## 2. Lệnh & Kết quả
```bash
cd apps/web && pnpm test && pnpm build
```
- Ngày chạy: 2026-11-23
- Kết quả: `pnpm test` **291/291 PASS**, `pnpm build` OK, `notes_index.py --check` OK. Không xoá test cũ.

## 3. Lỗi & Bug Logs
- none
