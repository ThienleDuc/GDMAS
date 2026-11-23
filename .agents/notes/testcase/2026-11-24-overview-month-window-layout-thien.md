<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Overview — cửa sổ 1 tháng, 1 chart chu kỳ, layout 3 hàng

## Metadata
- ID: 2026-11-24-overview-month-window-layout-thien
- Mode: single-file-test
- Proposal: none
- Target: BE window config/analysis route + `apps/web/src/features/overview/`, `OverviewPage.css`
- Test File: `apps/api/tests/unit/test_analysis_query_params.py`, `apps/web/tests/overview-page.test.ts`, `apps/web/tests/services.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** 3 window config = 30; seasonality route nhận start/end; FE 1 chart chu kỳ + layout 3 hàng + ranking dọc.
- **Ràng buộc:** I1 (FE/BE chuẩn), I2 (giữ chữ ký), I3 (UTC), I5 (không mock), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- BE fixture sự kiện trong 10 ngày gần đây + 1 sự kiện 200 ngày trước; gọi seasonality có `start_time`/`end_time` → chỉ lấy 10 ngày.
- FE đọc source `OverviewPage.tsx`/`.css` để assert cấu trúc.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Window config 30 | Structural | Đọc `config.py`, `docker-compose.yml` | 3 biến = 30, compose default `:-30`, analysis service = 30 | `PASSED` |
| `TC-02` | Seasonality nhận cửa sổ | Functional | Query start/end | `data_points` chỉ đếm sự kiện trong cửa sổ | `PASSED` |
| `TC-03` | 1 chart chu kỳ | Structural | Đọc `OverviewPage.tsx` | 1 `OverviewSeasonalityChart`, không `monthlyBars`/`getMonthlyPeaks` | `PASSED` |
| `TC-04` | Layout 3 hàng | Structural | Đọc page + CSS | 3 cặp `ov-card--6`; ranking `.ov-chart-row` dọc | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest tests/unit/test_analysis_query_params.py -q
cd apps/api && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** BE `uv run python -m pytest -q` → **372 passed**, ruff check/format sạch (đã cập nhật snapshot `quality_contracts.json` cho OpenAPI + config hash do đổi cửa sổ/tham số). FE `pnpm build` PASS + `pnpm test` **362 / 0 fail**. `notes_index.py --check` OK. Không test nào bị xoá/skip.
- **Tinh chỉnh thêm:** ranking `span 5`, danh mục `span 7` (thêm 8 hàng), ô bảng 1 hàng + ellipsis + `title` hover.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
