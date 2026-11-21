# Implementation Status: Trực quan hóa 6 Patterns trên `/statistics`

## Metadata
- ID: 2026-11-21-statistics-six-patterns-charts-thien
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-21
- Last Updated: 2026-11-21
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Validation xong — dừng CHECKPOINT 1

Completed:
- Proposal §9 Approved (thien, 2026-11-21); nhánh `feat/...` rẽ từ develop (đã gồm layout mới).
- Sinh đồng thời plan.md / status.md / testcase/<id>.md.
- Step 1 — `statistics-view.ts` thuần: `intervalToParams` (UTC `Z`), `metricsFor`, `buildCorrelationCells`, `correlationColor`, `evaluationText`, `forecastRows`, `statisticsView`.
- Step 2 — 8 tệp `components/charts/`: `PatternPanel` + 6 chart/panel + barrel; dùng lại `chart-data.ts`, không sửa file thuần.
- Step 3 — `StatisticsPage.tsx` gọi 6 service (AbortController), đổi interval refetch; CSS import tập trung; `App.tsx` route `/statistics` dùng lazy + Suspense.
- Step 4 — `statistics-view.test.ts` (7 TC) + bổ sung `chart-data.test.ts` (TC-13); 124/124 test pass.
- Bổ sung mock (theo yêu cầu): `dev-mock.ts` serve 4 route `/analysis/*` từ `analysis_sample.json`; fixture làm giàu 14 line / 24 scatter / 8 bin / 12 trend / 12 seasonal / matrix 5×5, đã kiểm cấu trúc khớp schema; `dev-mock.test.ts` TC-11. Tổng 125/125 test pass.
- Vòng sau: đổi tên 6 panel theo đúng `yeucaubatbuoc.md` §2 / `architecture.md` §12, giải thích rõ "t+1 = ngày kế tiếp", thay từ tiếng Anh trên UI bằng tiếng Việt (nhãn biến heatmap, chỉ số dự báo, mô hình, CI, MAE/RMSE, nav "6 nhóm phân tích").
- Đối chiếu contracts↔BE↔docs phát hiện 2 blocking: `/predictions` trả `confidence_interval` lồng nhau, `/classifications` trả `probabilities` nhưng typed view chỉ đọc alias phẳng → đã thêm adapter trong `asPrediction`/`asClassification` (giữ chữ ký), cập nhật fixture phân loại sang 4 nhãn thật của BE. Tổng 127/127 test pass.
- Sublayout 6 pattern (yêu cầu mới): `StatisticsLayout` gồm subnav dọc + Outlet; 6 route con `/statistics/<slug>`; mỗi pattern một bố cục riêng (`--stack`, `--metrics-left`, `--chart-note`, `--heatmap`, `--forecast`, `--split`); context nạp dữ liệu một lần, chuyển tab không refetch. `StatisticsPage` giờ redirect sang pattern 1.
- Sửa lỗi vùng nội dung trống: `StatisticsRoutes` nằm dưới route cha `/statistics/*` nhưng lại khai báo `path="/statistics"` ở route con → descendant `<Routes>` không khớp (đã render thử bằng `createMemoryRouter` + `renderToString` để xác nhận). Đổi sang route layout không path + slug tương đối; thêm TC-14 chặn tái diễn.
- Làm đẹp biểu đồ (yêu cầu "đường line mờ"): thêm `chart-theme.ts` dùng token CSS; nét line 1px → 2.5px (forecast 3px), thêm chấm dữ liệu/activeDot màu đậm hơn, grid opacity 0.25 → 0.55, trục用 `--muted-foreground`, tooltip/legend theo token, brush tô `--primary`; `.stat-chart-block` có nền `--surface` + viền. TC-15 chặn tái diễn.
- Bảng phân tích chuyên gia (yêu cầu mới): `ai-insights.ts` (thuần, quy tắc từ 6 pattern, không gọi AI/mạng, không bịa số), `ExpertInsightsPanel.tsx` nổi absolute có nút mở/thu; ban đầu ở góc phải-dưới.
- Vòng chỉnh theo yêu cầu: (1) đổi thuật ngữ Pattern 3 từ "mùa vụ" sang **chu kỳ** (nav, tiêu đề, legend, nhận xét); (2) dời bảng phân tích **lên header** sublayout (`top:0; right:0`, panel mở xuống); (3) tạo `docs/analysis/insights-structure.md` mô tả 5 phần báo cáo + `insight-structure.ts` + test đối chiếu; bổ sung `summary`, `evidence`, `recommendations`, `caveats` vào báo cáo.
- Vòng giao diện cuối: bỏ hoàn toàn `stat-layout__aside` (diễn giải BE đã nằm ngay dưới chart), các trang chuyển sang 1 cột full-width; tăng chiều cao chart 240/260 → 320/340/360; gộp Pattern 5 & 6 thành `ForecastClassificationPatternPage` (subnav 5 mục, slug `du-bao-phan-loai`). Giữ file `ForecastPatternPage.tsx`/`ClassificationPatternPage.tsx` để tương thích import (RULE-03), không export ở barrel.
- Thay ký hiệu viết tắt bằng cụm tiếng Việt: `R²` → "độ phù hợp mô hình", `MAE/RMSE` → "sai số tuyệt đối trung bình / sai số căn quân phương", `t+1` → "ngày kế tiếp", `M` → "độ lớn", `WGS84 · UTC` → "tọa độ địa lý · giờ quốc tế", `Live` → "Trực tiếp", `↔`/`≥` → "và"/"từ … trở lên", `API`/`BE` → "dịch vụ dữ liệu"/"máy chủ". TC-22 chặn tái diễn.
- Làm rõ theo phản hồi: `chart-guides.ts` đổi `M/W/D` thành Tháng/Tuần/Ngày và giải thích sai số căn quân phương bằng ngôn ngữ dễ hiểu; `ChartReadingGuide.tsx` + CSS `.stat-reading-guide` thêm hướng dẫn đọc cho cả 6 pattern.
- Chuyển hướng dẫn sang **cột bên phải** (`stat-chart-row`: chart trái / guide 240px phải), rút gọn câu chữ, thêm `GUIDE_HIGHLIGHTS` tô màu xanh/cam/đỏ theo từ khóa; giải thích RMSE đầy đủ đặt trong `title` khi di chuột. Pattern 3 cũng đổi "Chu kỳ: M" sang "Chu kỳ lấy mẫu: Tháng".
- Đổi highlight sang **màu pastel nhạt**: thêm 6 token `--highlight-{blue,orange,red}-{bg,fg}` trong `globals.css` (mục 3.4.1) và dùng lại trong `StatisticsPage.css` (bỏ fallback hardcode).
- Bỏ viền trái xanh 3px của panel hướng dẫn, thay bằng viền mỏng bao quanh dùng `--border-width-thin` (=1px) + `--border`. TC-24…TC-28 pass. 143/143 test pass.

In Progress:
- none (chờ xác nhận CHECKPOINT 1 để commit/push/PR)

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` = passed; `statistics-view.test.ts` + `chart-data.test.ts` bổ sung |
| Test liên quan (`pnpm test`) | PASS | **143/143 pass, 0 fail** (baseline 116 sau merge layout — không giảm) |
| Build (`pnpm build`) | PASS | sạch; tách chunk `StatisticsPage` 451 kB, index 473 kB — hết cảnh báo >500 kB |
| Notes check | PASS | OK |
| OCP working tree | PASS | 0 deletion, không đụng core protected/API/contracts |
| Kiểm chức năng | PASS | 6 tên pattern đúng; đổi interval refetch; `insufficient_data` → thông điệp BE; heatmap 5×5; CI hợp lệ |

---

## Known Issues
- BE `/analysis/trend|seasonality|correlation` bỏ qua `start_time/end_time` (audit cũ) — UI chỉ filter thời gian trên `/temporal`, ghi chú rõ, không tự suy diễn.
- Chưa kiểm trình duyệt thật (Recharts render, SSE/DB rỗng trực tiếp).

---

## Deviations From Plan
- Baseline test trong proposal/plan ghi 110 (trước khi merge PR #40); thực tế nhánh rẽ từ develop sau merge layout nên baseline **116**. Không có test nào bị xóa.
- Thêm `React.lazy` + `Suspense` cho `StatisticsPage` trong `App.tsx` (ngoài dự kiến "1 dòng route") để tách bundle Recharts — không đổi route/name pattern.
- Mock analysis là **opt-in** (`VITE_API_MOCKING=enabled`, chỉ Vite `apply: "serve"`), không import vào view runtime — tuân I5. Fixture `analysis_sample.json` nằm trong `contracts/examples`, chỉ làm giàu dữ liệu, giữ nguyên schema/`additionalProperties`.
- Đổi nhãn route `/statistics` trong `layouts/navigation.ts` ("6 nhóm phân tích") và fallback `App.tsx` — chạm 2 tệp layout dù plan ghi Out of Scope; cần theo yêu cầu "thay từ tiếng Anh sang tiếng Việt".
- Cập nhật fixture `contracts/examples/classifications_sample.json` từ 3 nhãn cũ sang 4 nhãn thật của BE (`Low/Moderate/High/Critical`) — chỉ fixture, không đổi schema.
- BE `/analysis/trend` bỏ `r_squared`, `/analysis/correlation` bỏ `note`/`status` dù FE contract có → UI hiển thị "—"/không có ghi chú. Không tự sửa `apps/api` (chủ vùng T3/T6) — đưa vào câu hỏi cuối phiên.
- Đổi thuật ngữ Pattern 3 sang "chu kỳ" theo yêu cầu người dùng, dù `docs/yeucaubatbuoc.md`/`docs/architecture.md` ghi "Tính mùa vụ" — ghi nhận divergence, không tự sửa tài liệu gốc (vùng spec). Cần cân nhắc cập nhật docs riêng nếu muốn đồng nhất.
- Theo yêu cầu "thay ký hiệu viết tắt", đã đụng thêm 4 tệp `components/map/*` + `MonitoringMapPage.tsx` (đã merge ở PR #38) và `layouts/navigation.ts` (PR #40) — chỉ đổi chuỗi hiển thị, không đổi logic; plan cập nhật In Scope để phản ánh.
- `docs/api/API.md` lỗi thời (stats/SSE/Pattern 6 3 nhãn, danh sách endpoint), FE/BE đã đồng nhất — không tự sửa docs, ghi nhận đề xuất cho owner T6.
- `statistics-view.ts` import lên 2 cấp (`../../contracts`, `../../lib`) do nằm trong `features/statistics/` — đã sửa sau build lần đầu.

---

## Decisions Made During Implementation
- Logic thuần tách riêng để test `node --test` (không render Recharts); component chỉ render + gọi helper `chart-data.ts`.
- CSS page import trong `styles/index.css` (tập trung) để tránh lỗi thứ tự như bản đồ.
- Heatmap dùng CSS grid + `correlationColor` thay vì Recharts Scatter custom shape — dễ test, vẫn đúng 5×5 và tooltip `title`.

---

## Next Actions
- CHECKPOINT 1: chờ `tiếp tục workflow` → commit/push/PR (Phần B1) → CHECKPOINT 2 trước merge. Chưa commit/push.

---

## Last Update
2026-11-21 — Validation xanh (124/124 test, build sạch, notes OK); `Status: validation`, dừng CHECKPOINT 1.
