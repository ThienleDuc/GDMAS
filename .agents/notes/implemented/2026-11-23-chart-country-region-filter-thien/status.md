# Implementation Status: Lọc biểu đồ & KPI theo quốc gia/khu vực

## Metadata
- ID: 2026-11-23-chart-country-region-filter-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Reviewer thien, `Overrides:` quyết định "giữ toàn cầu" của proposal 2026-11-21)
- Tạo đồng thời plan.md / status.md / testcase note
- Step 1: `services/analysis/filtered.py` — scope/load_filtered_events_df/compute_filtered_metrics/filtered_day_counts/build_filtered_forecast
- Step 2: 4 route `/analysis/*` nhận country/region, tính on-the-fly, default vẫn đọc snapshot
- Step 3: `/statistics/earthquakes` lọc 8 query + bucket 24h
- Step 4: P5/P6 on-the-fly (`/predictions`, `/classifications`), insufficient → Empty State
- Step 5: FE service/hooks forwarding; EarthquakesPage dùng URL + lọc region; Overview/Statistics phản ánh phạm vi; RegionPicker trên Statistics
- Step 6: test BE/FE, refresh snapshot, validation

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-23-chart-country-region-filter-thien.md` + `test_analysis_filtered.py`, `chart-region-filter.test.ts` |
| Test liên quan (`pytest`) | PASS | 352/352 (`.venv/bin/python -m pytest -q`) |
| Lint / Build | PASS | ruff sạch; FE `pnpm test` 255/255, `pnpm build` OK |
| Scripts | PASS | 43/43 |
| Notes check | PASS | `notes_index.py --check` OK |
| Tài liệu cập nhật | DONE | `docs/api/API.md` §3.2/§3.3 (query param + ghi chú artifact toàn cầu) |
| Runtime | PASS | default 9460 vs Japan 80; temporal 80 điểm; forecast Japan 5.1 |

---

## Known Issues
- P5/P6 dùng artifact huấn luyện toàn cầu; phạm vi ít hơn 10 ngày → Empty State `insufficient_data` (đúng, không bịa).

## Deviations From Plan
- `filtered_day_counts` tính bằng pandas thay vì `func.timezone()` SQL để tương thích SQLite test offline.
- `analysis-query-params.test.ts` TC-05 cập nhật assertion theo lời gọi mới (giữ ý nghĩa cấm cửa sổ giả).

## Decisions Made During Implementation
- Không migration/worker: tái dùng hàm thuần T3/T5, giữ default path đọc snapshot (I2/I4).

## Next Actions
- CHECKPOINT 1: báo cáo, chờ `tiếp tục workflow` / `dừng lại` / `sửa thêm`.

## Last Update
2026-11-23 — Validation xanh, dừng CHECKPOINT 1.
