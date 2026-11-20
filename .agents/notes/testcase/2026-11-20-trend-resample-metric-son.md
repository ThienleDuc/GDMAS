<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md & .agents/skills/write-testcase/SKILL.md.
     Dùng cho cả 2 luồng:
       (1) Mode: proposal-paired — sinh đồng thời với implemented/<id>/ khi Proposal §9 Approved.
       (2) Mode: single-file-test — kiểm thử riêng 1 file cụ thể (checkout nhánh test/<id> -> viết unit test -> lỗi đưa vào .agents/notes/bugs/). -->

# Testcase: Pattern 2 (Trend) đa tần suất × đa metric — T3 → T6

## Metadata
- ID: 2026-11-20-trend-resample-metric-son
- Mode: proposal-paired   <!-- proposal-paired | single-file-test -->
- Proposal: .agents/notes/proposed/2026-11-20-trend-resample-metric-son.md   <!-- hoặc `none` khi Mode: single-file-test -->
- Target: `apps/api/src/gdmas/services/analysis/patterns.py`, `apps/api/src/gdmas/api/routes/analysis.py`
- Test File: `apps/api/tests/unit/test_analysis_trend_metrics.py`, `apps/api/tests/unit/test_analysis_trend_route.py`
- Author: agent | son
- Created: 2026-11-20
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: BUG-son-008   <!-- hoặc danh sách BUG-<handle>-NNN trong .agents/notes/bugs/ nếu test phát hiện lỗi -->

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `compute_trend(..., metric=)`, `compute_trend_bundle()`, `build_analysis_snapshot()` (T3) và route
  `GET /api/v1/analysis/trend` (T6) khi đọc snapshot thật của T3 — đúng tần suất `D|W|M`, đúng metric, không gắn nhãn sai.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — không nhúng worker vào `main.py`).
  - [x] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (SQLite in-memory của `tests/unit/conftest.py`, không mạng — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** DataFrame sự kiện dựng tay (UTC, lat/lon WGS84 hợp lệ); route test dùng fixture `client`/`db`
  (SQLite in-memory, model ORM thật) và ghi snapshot thật của T3 cho 200 ngày (1–4 trận/ngày, M2.0–4.0).
```json
{
  "sample_event": {
    "id": 1,
    "event_time": "2026-09-07T06:00:00Z",
    "latitude": 35.0,
    "longitude": 139.0,
    "depth_km": 10.0,
    "magnitude": 3.0
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Snapshot ghi trend cho mọi tần suất | Functional | 70 ngày dữ liệu | 3 bản `trend` theo thứ tự `week` (chính), `day`, `month`; mỗi bản đủ 3 metric; JSON hợp lệ | `PASS` |
| `TC-02` | Cấp cao nhất giữ định dạng `count` | Compatibility | `compute_trend_bundle(df, "day")` | `metric=count`, `series`/`slope` trùng `metrics.count`; tổng = số sự kiện | `PASS` |
| `TC-03` | Metric độ lớn đúng công thức | Functional | 3 ngày có độ lớn biết trước | avg = mean, max = max, count = số trận theo ngày | `PASS` |
| `TC-04` | Kỳ rỗng của metric độ lớn | Boundary | Ngày giữa không có sự kiện | `count` có kỳ 0; `avg_magnitude` bỏ kỳ rỗng (không bịa 0) | `PASS` |
| `TC-05` | Hồi quy giữ khoảng cách kỳ thật | Functional | Độ lớn tăng 0.1/ngày, có ngày trống | `increasing`, slope ≈ 0.1 | `PASS` |
| `TC-06` | Mặc định không đổi hành vi `count` | Regression (I2) | `compute_trend(df, "day")` vs `metric="count"` | Kết quả giống hệt | `PASS` |
| `TC-07` | Thiếu kỳ cho tháng | Empty/Sparse (Demo §4) | 10 ngày, interval `month`, 3 metric | `insufficient_data`, `stable` | `PASS` |
| `TC-08` | 1 sự kiện / 0 sự kiện | Empty (Demo §4) | 1 bản ghi; DataFrame rỗng | Không crash, `insufficient_data`, không NaN; snapshot rỗng = `[]` | `PASS` |
| `TC-09` | Metric không hỗ trợ | Negative | `metric="median_magnitude"` | `ValueError` | `PASS` |
| `TC-10` | Route trả đúng tần suất (BUG-son-008) | Integration T3→T6 | `resample_freq` = `D`/`W`/`M` | `series` trùng bản đúng tần suất; nhãn kỳ đúng định dạng; `D` không còn 422 | `PASS` |
| `TC-11` | Route trả đúng metric (BUG-son-008) | Integration T3→T6 | `W` × 3 metric | `series`/`slope`/`trend_direction`/`status` trùng `metrics[metric]`; độ lớn trong [2.0, 4.0] | `PASS` |
| `TC-12` | Không lùi sang tần suất khác | Resilience | Chỉ có bản `month`, gọi `W` | Empty State (`success=false`, `data=null`) | `PASS` |
| `TC-13` | Không gắn nhãn sai cho dữ liệu chỉ có `count` | Resilience | Bản cũ chỉ có `series` count, gọi `avg_magnitude` | `series=[]`, `status=insufficient_data`, `slope=null` | `PASS` |
| `TC-14` | Bảng rỗng | Empty (Demo §4) | `resample_freq=D`, DB rỗng | Empty State | `PASS` |
| `TC-15` | Tham số sai | Negative | `Y`, `w`, chuỗi rỗng | 400/422 | `PASS` |

Test cũ được cập nhật kỳ vọng (không xóa): `test_analysis_patterns.py::test_snapshot_types_and_periods`,
`test_analysis_service.py::test_cycle_writes_snapshot_with_run_link` (thêm `("trend","day")`, `("trend","month")`),
`tests/integration/test_analysis_transactions.py` (6 → 8 bản ghi), `tests/fixtures/quality_contracts.json` (`resample_freq` pattern `^(D|W|M)$`).

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_analysis_trend_metrics.py tests/unit/test_analysis_trend_route.py -v
cd apps/api && uv run pytest
cd apps/api && uv run ruff check . && uv run ruff format --check .
```

- **Ngày chạy cuối:** `2026-11-20`
- **Kết quả quan sát thật:**
  - 2 file mới: `23 passed`.
  - Chạy `test_analysis_trend_route.py` trên code cũ (stash `src/`): `8 failed, 4 passed` — tái hiện đúng BUG-son-008.
  - Toàn bộ backend: `296 passed` (trước thay đổi: 273). Ruff check/format: sạch.
  - (Máy local không có `uv` trên PATH — chạy bằng `apps/api/.venv/Scripts/python.exe -m pytest` / `-m ruff`, cùng môi trường `uv.lock`.)

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `BUG-son-008` — `/analysis/trend` trả chuỗi sai tần suất và sai metric nhưng gắn nhãn theo tham số yêu cầu → đã sửa trong proposal này.
