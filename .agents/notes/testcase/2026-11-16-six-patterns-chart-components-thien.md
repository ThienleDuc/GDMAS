# Testcase: Bộ component biểu đồ 6 Patterns — lớp dữ liệu thuần `chart-data.ts`

## Metadata
- ID: 2026-11-16-six-patterns-chart-components-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/components/charts/chart-data.ts, apps/web/src/components/charts/types.ts
- Test File: apps/web/tests/chart-data.test.ts
- Author: agent | thien
- Created: 2026-11-16
- Status: passed
- Related Bugs: BUG-thien-001

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Toàn bộ hàm biến đổi dữ liệu thuần dùng để render 6 biểu đồ: gom nhóm thời gian UTC (`bucketKeyUtc`, `buildLineSeriesFromScatter`), histogram, trend, seasonality, dải tin cậy dự báo, phân phối xác suất rủi ro, quyết định Empty State (`resolvePatternView`) và format số an toàn.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — task chỉ chạm T7 Frontend, không có worker).
  - [x] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (không mạng, không DB, không `fetch`/`EventSource` — I7).
  - [x] Mock payload chỉ đọc từ `contracts/examples/patterns_sample.json`, không import vào runtime.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Node `v22.23.4` (type stripping chạy trực tiếp `.ts`), `node:test` + `node:assert/strict`; fixture `contracts/examples/patterns_sample.json` (mock hợp đồng `GET /api/v1/patterns`).
- **Sự kiện mẫu trong mock (UTC & WGS84):**
```json
{
  "id": "pattern_1",
  "status": "COMPUTED",
  "metrics": {
    "interval": "day",
    "scatter_plot": [
      { "id": 1, "timestamp": "2026-11-01T04:12:00Z", "magnitude": 5.2, "depth_km": 20.1 }
    ]
  }
}
```
- **Mock có sẵn 1 pattern `PENDING`** (không có bản ghi) để kiểm Empty State.
  - *Ghi chú deviation:* file mock `contracts/examples/patterns_sample.json` giữ đủ 6 pattern ở trạng thái `COMPUTED` (dùng chung làm fixture cho cả 6 biểu đồ); trạng thái `PENDING` / `insufficient_data` / thiếu bản ghi được tạo trong test bằng cách clone payload (`{ status: "PENDING", metrics: {} }`) — vẫn kiểm chứng đúng hành vi Empty State, không cần thêm biến thể vào mock hợp đồng.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Happy path — đọc mock hợp đồng | Functional | `readFileSync(contracts/examples/patterns_sample.json)` | Parse được; đủ 6 pattern `pattern_1..pattern_6`; mọi `timestamp` kết thúc bằng `Z`; `pattern_4.variables` chứa đủ cặp tọa độ WGS84 `latitude` + `longitude` | `PASS` |
| `TC-02` | Gom nhóm theo ngày UTC | Functional | 3 điểm cùng ngày UTC, khác ngày | `bucketKeyUtc(..., "day")` trả `YYYY-MM-DD` theo UTC (không theo giờ local) | `PASS` |
| `TC-03` | Gom nhóm theo tuần (Thứ 2) & tháng | Boundary | Các ngày 2026-11-01 (CN), 2026-11-02 (T2), 2026-11-30 | Tuần của 2026-11-01 là `2026-10-26`; `2026-11-02` là `2026-11-02`; tháng là `2026-11` | `PASS` |
| `TC-04` | Line series từ scatter | Functional | 4 điểm trong 2 ngày | `event_count`, `avg_magnitude`, `max_magnitude` đúng; sắp xếp tăng dần theo nhãn kỳ | `PASS` |
| `TC-05` | Histogram bins | Functional | `magnitude_bins` từ mock | Giữ đúng thứ tự bin, `count` là số; rỗng → `[]` | `PASS` |
| `TC-06` | Trend & seasonality series | Functional | `series` có `trend_value = null`; `seasonal_line` rỗng | Trend giữ `null` (không thay bằng 0); seasonality rỗng → `[]` | `PASS` |
| `TC-07` | Dải tin cậy dự báo | Boundary | `predicted=46.2`, `lower=38.0`, `upper=54.4`, history 3 điểm | Điểm cuối lịch sử có `lower=upper=actual`; điểm dự báo có `lower/upper` đúng; `predicted` nằm trong khoảng; giá trị `null` bị loại | `PASS` |
| `TC-08` | Nhãn & xác suất rủi ro | Boundary | `Normal Activity`, `CRITICAL`, key lạ, giá trị âm/>1 | `Normal Activity` → `MEDIUM`; `CRITICAL` giữ nguyên; tổng xác suất chuẩn hóa về 1 (hoặc giữ nguyên nếu đã đúng); key lạ bị bỏ | `PASS` |
| `TC-09` | Empty State — PENDING / thiếu / insufficient | Resilience | `undefined`, `status=PENDING`, `status=insufficient_data`, metrics rỗng | `resolvePatternView` trả `available: false` + `reason` tương ứng; **không** trả số liệu thay thế | `PASS` |
| `TC-10` | Format số không bịa giá trị | Negative | `null`, `undefined`, `NaN`, `Infinity`, số thực | `formatNumber` trả `"—"` cho giá trị thiếu/không hữu hạn; `formatCoefficient(0.12345)` → `"0.1235"` (4 chữ số) | `PASS` |
| `TC-11` | An toàn kiểu với hex/chuỗi số | Negative | `"5.2"`, `{}`, mảng | Không crash; giá trị không phải số hữu hạn → `"—"` | `PASS` |
| `TC-12` | Lịch sử quan sát cho biểu đồ dự báo | Functional | `series` Pattern 2 (6 kỳ), `line_chart` Pattern 1 giới hạn 3 điểm | Ưu tiên Pattern 2; `toObservedFromTrend/LineChart` trả đúng số điểm + nhãn/giá trị; `undefined` → `[]` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm test
# tương đương: node --test tests/*.test.ts
```

- **Ngày chạy cuối:** `2026-11-16`
- **Kết quả quan sát thật:** `tests 12 · pass 12 · fail 0` (Node `v22.23.4`, `node:test`, chạy offline hoàn toàn — không `fetch`, không DB). Trong lần chạy đầu, `TC-07` fail (`ciBase` = 10 thay vì 8 do dải `lower_bound > predicted_value` chưa bao trùm điểm dự báo); đã sửa `buildForecastBand` để `lower/upper` bao trùm cả `predicted_value`, chạy lại pass 12/12.
- **Build FE liên quan:** `cd apps/web && pnpm build` → PASS (2459 modules, chỉ còn cảnh báo chunk > 500 kB có sẵn từ trước).

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)

- **BUG-thien-001** — [Dải tin cậy dự báo Pattern 5 tính sai khi `lower_bound` vượt `predicted_value`](../bugs/BUG-thien-001-dai-tin-cay-du-bao.md)
  - Phát hiện: lần chạy test đầu tiên, `TC-07` fail (`10 !== 8` ở `ciBase`).
  - Nguyên nhân: `buildForecastBand` chỉ so từng biên với `predicted_value` mà không so hai biên với nhau.
  - Trạng thái: `fixed` (2026-11-16) — sửa thành `lower/upper = Math.min/max(rawLower, rawUpper, predicted)`; chạy lại `pnpm test` → 12/12 pass.
  - Test hồi quy: chính `TC-07` trong `apps/web/tests/chart-data.test.ts`, phủ 3 nhánh: biên hoán vị (`lower_bound = 12`, `upper_bound = 8`, `predicted = 10`), chỉ biên trên dưới `predicted` (`10/15/20`), và thiếu biên (`predicted = 7` → band suy biến `ciSpan = 0`).
