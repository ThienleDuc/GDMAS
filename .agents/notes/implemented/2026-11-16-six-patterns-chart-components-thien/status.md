# Implementation Status: Bộ component biểu đồ Recharts cho 6 Patterns chuỗi thời gian

## Metadata
- ID: 2026-11-16-six-patterns-chart-components-thien
- Status: validation
- Started: 2026-11-16
- Last Updated: 2026-11-16
- Owner: agent | thien

---

## Tiến độ
Progress: 100% (code + test + docs xong; chưa commit theo yêu cầu người dùng)
Current Phase: Step 7 — Chờ người dùng kiểm thử trước khi commit

Completed:
- Step 1 — `contracts/schemas/patterns.json`, `contracts/examples/patterns_sample.json`, `contracts/README.md` §3.3.
- Step 2 — `types.ts`, `theme.ts`, `chart-data.ts` (hàm thuần, UTC).
- Step 3 — 7 component UI (`EmptyChartState`, `ChartPanel`, 5 component pattern) + `index.ts`.
- Step 4 — `StatisticsPage.tsx` viết lại 6 panel, bỏ toàn bộ fallback tĩnh.
- Step 5 — `apps/web/tests/chart-data.test.ts` (12 test offline) + script `pnpm test`.
- Step 6 — Validation chạy đầy đủ (xem bảng dưới).
- Fix kèm theo — bổ sung `apps/web/src/lib/api-client.ts` (module thiếu trên `develop`) + ngoại lệ `!apps/web/src/lib/` trong `.gitignore`.

In Progress:
- Chờ người dùng tự kiểm thử giao diện trước khi chạy `scope` / `project-review` / commit / push.

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + FE test) | PASS | `apps/web/tests/chart-data.test.ts` — 12 test, `Mode: proposal-paired` |
| Test FE (`pnpm test` → `node --test`) | PASS | 12/12 pass, Node v22.23.4, offline (không `fetch`/DB) |
| Build FE (`pnpm build` → `tsc -b && vite build`) | PASS | 2459 modules; chỉ còn cảnh báo chunk > 500 kB có sẵn từ trước |
| Contract JSON parse | PASS | `contracts/schemas/patterns.json`, `contracts/examples/patterns_sample.json` — `json.load` OK |
| Notes check (`python3 scripts/notes_index.py --check`) | PASS | OK |
| Tài liệu cập nhật | DONE | `contracts/README.md` (§2 tree + §3.3), `apps/web/src/components/charts/README.md` |
| Backend validation (`uv run pytest` / `ruff`) | N/A | Không đụng `apps/api/**` theo chỉ đạo người dùng |

---

## Known Issues
- `apps/web/src/services/earthquake-api.ts` vẫn khai báo `PatternItem.metrics: Record<string, any>` (giữ nguyên chữ ký để không phá Task 4); typed view nằm ở `components/charts/types.ts`.
- Vite cảnh báo bundle 838 kB (> 500 kB) — tình trạng có sẵn, không do thay đổi này.
- `BUG-thien-001` (dải tin cậy Pattern 5 bị cắt khi `lower_bound > predicted_value`) — đã `fixed` 2026-11-16, xem `.agents/notes/bugs/BUG-thien-001-dai-tin-cay-du-bao.md`.

---

## Deviations From Plan
1. **`apps/web/src/lib/api-client.ts` (file mới ngoài In Scope ban đầu).** Trên `develop`, `apps/web/src/services/earthquake-api.ts` import `../lib/api-client` nhưng module chưa từng được commit → `pnpm build` fail (`TS2307`). Bổ sung module `fetchApi`/`ApiError` theo RULE-03 (chỉ thêm file mới, giữ nguyên chữ ký đang được import).
   - Phát sinh tiếp: đường dẫn `apps/web/src/lib/` bị `.gitignore` dòng `lib/` (luật build artifact Python) nuốt → file không thể commit. Đã thêm ngoại lệ `!apps/web/src/lib/` + `!apps/web/src/lib/**` trong mục Frontend của `.gitignore` (2 dòng, additive) và xác nhận `git check-ignore -q` trả exit 1 (không còn bị ignore).
2. **Mock `contracts/examples/patterns_sample.json` không chứa pattern `PENDING`.** Đề bài plan Step 1 dự kiến mock có sẵn 1 pattern PENDING; thực tế mock giữ đủ 6 pattern `COMPUTED` để làm fixture cho cả 6 biểu đồ, còn trạng thái `PENDING` / `insufficient_data` / thiếu bản ghi được tạo trong test bằng clone payload. Đã ghi chú lại trong `testcase/<id>.md` §2.
3. **Pattern 1 chuyển khung Ngày/Tuần/Tháng.** Khi `metrics.interval === interval` dùng `line_chart` server; ngược lại re-bucket `scatter_plot` phía client theo UTC (tuần bắt đầu Thứ 2) thay vì gọi API tham số hóa — tránh đụng backend.

---

## Decisions Made During Implementation
- Pattern 5: `metric_name`, `model_version`, `evaluation_metrics.{mae,rmse,baseline_mae,confidence_level}`, `generated_at` khai báo **optional** trong hợp đồng vì route BE hiện chỉ trả `target_date/predicted_value/lower_bound/upper_bound/model_name`. FE hiển thị thông báo "chưa có dữ liệu kiểm định" thay vì bịa số.
- Pattern 4: dựng heatmap bằng CSS grid có `role="grid"`/`role="gridcell"` (Recharts không có heatmap native), thang màu phân kỳ −1 → 0 → +1, tooltip `title` + panel live hiển thị Pearson 4 chữ số.
- Pattern 5: dải tin cậy vẽ bằng 2 `Bar` xếp chồng (`ciBase` trong suốt + `ciSpan`) để tạo band nổi, kèm đường `bridge` nét đứt nối điểm quan sát cuối → điểm dự báo.
- `buildForecastBand` nới `lower/upper` bao trùm cả `predicted_value` (phát hiện qua TC-07 khi `lower_bound > predicted_value`).
- Dừng ở bước commit theo yêu cầu người dùng 2026-11-16 (không chạy `scope`/`project-review`/`commit`/`push`).

---

## Next Actions
- Người dùng kiểm thử giao diện (`cd apps/web && pnpm dev`) với CSDL rỗng và có dữ liệu.
- Sau khi người dùng xác nhận: chạy `./scripts/git-ship.sh scope`, `project-review`, commit tiếng Việt, `update`, `push`, tạo PR và merge khi 0 conflict.

---

## Last Update
2026-11-16 — Hoàn tất code + test + hợp đồng + tài liệu; validation PASS; chuyển `Status: validation`, chờ người dùng kiểm thử trước khi commit.
