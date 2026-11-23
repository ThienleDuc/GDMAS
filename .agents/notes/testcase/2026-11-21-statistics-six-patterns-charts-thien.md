# Testcase: Trực quan hóa 6 Patterns trên `/statistics` (T7.06–T7.09)

## Metadata
- ID: 2026-11-21-statistics-six-patterns-charts-thien
- Mode: single-file-test   <!-- proposal-paired | single-file-test -->
- Proposal: none
- Target: `apps/web/src/features/statistics/statistics-view.ts`, `apps/web/src/lib/transforms/chart-{data,types}.ts` (adapter, giữ chữ ký)
- Test File: `apps/web/tests/statistics-view.test.ts`, `apps/web/tests/pattern-nav.test.ts`, `apps/web/tests/ai-insights.test.ts`, `apps/web/tests/insight-structure.test.ts`, `apps/web/tests/chart-guides.test.ts` (mới) + bổ sung `apps/web/tests/chart-data.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** logic thuần trang thống kê (params UTC, view state, correlation cells/color, forecast/CI, evaluation text) + transform 6 pattern có sẵn.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách 7 Terminals (I1): FE chỉ gọi T6 qua service.
  - [x] UTC `Z` cho mốc thời gian (I3); trục thời gian do `chart-data.ts` tạo.
  - [x] Không fallback mock/số giả; 6 tên pattern đúng; thiếu số liệu → `null`/`"—"` (I5).
  - [x] Test offline 100%, không fetch/Recharts DOM (I7).
  - [x] Giữ 12 test `chart-data.test.ts` cũ đang pass.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node --test` + type stripping; fixture từ `contracts/examples/analysis_sample.json` & `patterns_sample.json`, `now` cố định.
```json
{
  "now": "2026-11-21T00:00:00Z",
  "correlation": {
    "variables": ["magnitude", "depth_km", "latitude", "longitude", "daily_event_count"],
    "matrix": [[1, 0.2, 0, 0, 0], [0.2, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]]
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | intervalToParams UTC `Z` | Functional | `day/week/month` + now cố định | `start_time`/`end_time` ISO `Z`; đúng khoảng; `interval` đúng | PASS |
| `TC-02` | metricsFor empty envelope | Resilience | `{success:false,data:null,message}` | Trả `null`, không throw → UI Empty | PASS |
| `TC-03` | buildCorrelationCells đối xứng | Functional | Matrix 5×5 mẫu | 25 ô, giữ thứ tự biến, ô null → `"—"`, đối xứng đúng | PASS |
| `TC-04` | correlationColor biên | Boundary | `-1 / -0.5 / 0 / 0.5 / 1 / NaN` | 5 dải màu phân kỳ hợp lệ; NaN → màu trung tính | PASS |
| `TC-05` | evaluationText thiếu số liệu | Functional | `evaluation_metrics` rỗng / có mae+rmse | `"chưa có dữ liệu kiểm định"` / chuỗi có số | PASS |
| `TC-06` | forecastRows CI hợp lệ | Functional | `buildForecastBand` + prediction mẫu | `lower ≤ predicted ≤ upper`; bridge nối quan sát cuối; thiếu predicted → `[]` | PASS |
| `TC-07` | statisticsView 3 trạng thái | Functional | loading/error/empty/ready | `"loading"/"error"/"empty"/"ready"`; error/empty không bị dữ liệu cũ che | PASS |
| `TC-08` | chart-data sample additive | Functional | `analysis_sample.json` qua transform có sẵn | Line/histogram/trend/seasonal đúng fixture; 12 test cũ vẫn pass | PASS |
| `TC-09` | Mock 4 route analysis theo contract | Functional | `resolveContractMock` với `/analysis/{temporal,trend,seasonality,correlation}` | Trả đúng subsection của `analysis_sample.json` dạng envelope, status 200; opt-in, dev-only | PASS |
| `TC-10` | Adapter payload thật predictions/classifications | Functional | `asPrediction`/`asClassification` với fixture contract | `confidence_interval` → `lower_bound/upper_bound` (CI span > 0); `probabilities` → `probability_scores` (4 mức rủi ro) | PASS |
| `TC-11` | Tên 6 pattern & nhãn tiếng Việt | Functional | `PATTERN_TITLES`, `correlationVariableLabel`, `forecastMetricLabel`, `NEXT_DAY_EXPLANATION` | 6 tên đúng `yeucaubatbuoc.md` §2; giải thích rõ "t+1 = ngày kế tiếp"; không còn từ tiếng Anh trên UI | PASS |
| `TC-12` | Subnav đủ 6 pattern | Functional | `PATTERN_NAV` | 6 mục, index 1–6, slug duy nhất, có label + mô tả tiếng Việt | PASS |
| `TC-13` | Route con & fallback | Functional | `patternPath` / `patternSlugFor` | 6 route con `/statistics/<slug>` khớp; path lạ và `/statistics` fallback về pattern 1 | PASS |
| `TC-14` | Outlet sublayout không trống | Resilience | Render thử cây route + đọc `StatisticsRoutes.tsx` | Route con **không** viết lại prefix `/statistics` (pathless layout + slug tương đối); nếu có prefix thì descendant `<Routes>` render rỗng | PASS |
| `TC-15` | Biểu đồ nét dày, token theme | Functional | Đọc 4 file chart + `StatisticsPage.css` | Đều dùng `chart-theme.ts` + `strokeWidth={CHART_LINE_WIDTH}`; `.stat-chart-block` có nền `--surface`, CSS override trục Recharts | PASS |
| `TC-16` | Bảng chuyên gia — dữ liệu trống | Resilience | `buildExpertReport` với 6 nguồn null | 6 nhận xét đều `info`, có chữ "Chưa có", headline "chưa cho thấy tín hiệu bất thường", kèm disclaimer | PASS |
| `TC-17` | Bảng chuyên gia — dữ liệu thật | Functional | Fixture 6 pattern có số liệu | Nhận xét bám số liệu (50.0, 40.0–60.0), phân loại "Critical" → "Rất cao"/`alert`, headline "Cần chú ý", correlation không suy diễn nhân quả | PASS |
| `TC-18` | Bảng chuyên gia — mức thấp | Functional | `Low` + alias phẳng `lower_bound/upper_bound` | Headline không có "Cần chú ý", vẫn đọc được khoảng 10.0–14.0, nhãn "Thấp" | PASS |
| `TC-19` | Cấu trúc 5 phần khớp docs | Functional | Đọc `docs/analysis/insights-structure.md` + `insight-structure.ts` | 5 tên phần trong code đều có trong docs; `sectionTitle` trả đúng | PASS |
| `TC-20` | Báo cáo đủ 5 phần, có evidence | Functional | `buildExpertReport` với dữ liệu mẫu | `summary/recommendations/caveats/outlook` đầy đủ; mỗi nhận xét có `evidence` | PASS |
| `TC-21` | Gộp 5&6, bỏ aside | Functional | Đọc 5 file page | `ForecastClassificationPatternPage` render cả 2 chart; không page nào dùng `stat-layout__aside` | PASS |
| `TC-22` | Không còn ký hiệu viết tắt | Functional | Đọc 9 file UI (statistics/charts/map/nav) | Không còn `R²`, `MAE`, `RMSE`, `t+1`, `WGS84 ·`, `Live`, `↔`, `≥ 6` — thay bằng cụm tiếng Việt đầy đủ | PASS |
| `TC-24` | Chu kỳ M/W/D rõ nghĩa | Functional | `resampleFreqLabel` | `M → Tháng`, `W → Tuần`, `D → Ngày`, null → "Chưa xác định" | PASS |
| `TC-25` | Hướng dẫn đọc 6 chart | Functional | `CHART_GUIDES`, `RMSE_EXPLANATION` | Đủ 6 pattern, mỗi ít nhất 3 dòng ngắn; RMSE giải thích đầy đủ trong title, câu ngắn nằm trong guide | PASS |
| `TC-26` | Hướng dẫn nằm bên phải, có tô màu | Functional | Đọc 6 file chart + `ChartReadingGuide.tsx` | Mỗi chart dùng `stat-chart-row` (2 cột) + `ChartReadingGuide`; guide có `--side` và từ khóa `stat-reading-guide__hl--*` | PASS |
| `TC-27` | Highlight pastel là token dùng chung | Functional | Đọc `globals.css` + `StatisticsPage.css` | 6 biến `--highlight-{blue,orange,red}-{bg,fg}` định nghĩa trong globals và được component dùng lại; không còn màu hardcode | PASS |
| `TC-28` | Viền mỏng bao quanh hướng dẫn | Functional | Đọc `StatisticsPage.css` + `globals.css` | `.stat-reading-guide--side` dùng `border: var(--border-width-thin) solid var(--border)`, không còn `border-left` đậm | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/statistics-view.test.ts
cd apps/web && pnpm test
cd apps/web && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:** `node --test tests/statistics-view.test.ts` → 7/7 pass (TC-01…TC-07). Bổ sung TC-13 vào `chart-data.test.ts` → 13/13 pass (12 test cũ giữ nguyên). Thêm TC-11 vào `dev-mock.test.ts` cho 4 route analysis → pass (TC-09). `cd apps/web && pnpm test` → **143/143 pass, 0 fail** (baseline sau khi merge layout là 116). Bổ sung TC-28 cho viền hướng dẫn. Bổ sung TC-27 cho token màu highlight dùng chung. Bổ sung TC-26 cho bố cục hướng dẫn bên phải + tô màu. Bổ sung TC-24/TC-25 cho nhãn chu kỳ và hướng dẫn đọc biểu đồ. Bổ sung TC-12/TC-13 cho sublayout điều hướng, TC-14 chặn lỗi Outlet trống, TC-15 kiểm nét dày/theme biểu đồ, TC-16…TC-18 cho bảng phân tích chuyên gia, TC-19/TC-20 cho cấu trúc theo docs, TC-21 cho gộp 5&6/bỏ aside, TC-22 chặn ký hiệu viết tắt. Bổ sung TC-10 (adapter B1/B2 phát hiện khi đối chiếu contracts↔BE) và TC-11 (tên 6 pattern + tiếng Việt). `pnpm build` → sạch; Vite tách riêng chunk `StatisticsPage` (451 kB) nhờ lazy import, không còn cảnh báo chunk >500 kB. `python3 scripts/notes_index.py --check` → OK. Không phát sinh lỗi, không tạo bug log.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
