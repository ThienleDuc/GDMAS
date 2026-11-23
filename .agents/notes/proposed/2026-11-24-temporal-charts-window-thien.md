<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: 3 biểu đồ Biểu diễn thời gian lọc đúng Ngày/Tuần/Tháng

## Metadata
- ID: 2026-11-24-temporal-charts-window-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/api/routes/analysis.py`, `apps/web/src/features/statistics/`, `apps/web/tests/`
- Architecture Impact: none   <!-- Không đổi schema/payload; chỉ đổi nguồn tính metrics khi có cửa sổ -->
- Related Docs:
  - docs/api/API.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md   <!-- - Overrides: đường temporal đọc snapshot → tính on-the-fly khi có cửa sổ -->
  - .agents/notes/proposed/2026-11-22-analysis-unsupported-query-params-thien.md
  - .agents/notes/proposed/2026-11-23-statistics-subroute-load-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Trang `/statistics/bieu-dien-thoi-gian` có 3 biểu đồ: line (số trận + độ lớn theo thời gian),
scatter (độ lớn/độ sâu), histogram (phân bố khoảng độ lớn). FE (`statistics-data.tsx`) đã gửi
`interval` + `start_time`/`end_time` từ `intervalToParams()` và đổi chip Ngày/Tuần/Tháng → refetch.

### Vấn đề
BE `/analysis/temporal` chỉ dùng `compute_filtered_metrics` khi có `country`/`region`. Khi **không chọn quốc gia/khu vực**,
đi qua `_respond()` → đọc **snapshot `analysis_results`** khớp interval (chỉ kiểm tra chồng lấp `period_start/end`),
**không lọc dữ liệu theo cửa sổ Ngày/Tuần/Tháng**. Hệ quả: 3 biểu đồ cùng hiển thị dữ liệu cũ (thường 1 năm) dù đã đổi chu kỳ.

### Ảnh hưởng
Chip Ngày/Tuần/Tháng gần như vô nghĩa trên page này; số trận/độ lớn không khớp khung đang xem.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `statistics-data.tsx:108-116` | `getTemporalAnalysis({ interval, start_time, end_time, ...geo })` — đúng, đã gửi cửa sổ |
| `statistics-view.ts:76-82` | `intervalToParams` — day 24h / week 7 ngày / month 1 tháng UTC |
| `analysis.py:166-171` | `if country or region` → on-the-fly; else `_respond()` snapshot |
| `analysis.py:59-85` | `_latest()` chỉ lọc `period_end >= start` & `period_start <= end` trên bảng snapshot |

---

## 3. Mục tiêu
- **Mục tiêu:** Khi có `start_time`/`end_time` ( FE luôn gửi ), `/analysis/temporal` **tính on-the-fly** từ sự kiện trong cửa sổ bằng `compute_filtered_metrics(db, "temporal", country, region, interval, start, end)` — áp dụng cho cả 3 biểu đồ (line/scatter/histogram). Giữ đường snapshot chỉ khi không có cửa sổ và không có filter (tương thích caller cũ).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi contract/response shape (`line_chart`, `scatter_plot`, `histogram.magnitude_bins`, `stats`).
  - Không đổi logic `compute_temporal` (resample, scatter limit, histogram bins), không migration/worker/SSE.
  - Không đổi FE component/chip/toolbar (I2); không xoá test đang pass.
  - Không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: giữ chữ ký route & `build()`, chỉ đổi điều kiện chọn nguồn. BE T6 (I1), UTC (I3), không mock (I5), test offline (I7).

### 4.1. BE
- `analysis.py::get_temporal`: đổi điều kiện
  ```python
  if country or region or start is not None or end is not None:
      metrics = compute_filtered_metrics(db, "temporal", country, region, interval=interval, start=start, end=end)
      return {"success": True, "data": build(metrics)}
  return _respond(db, "temporal", build, interval=interval)
  ```
- `compute_filtered_metrics` đã có `start`/`end` → `load_filtered_events_df` lọc `event_time` trong cửa sổ; `compute_temporal` trả 3 mảng đã lọc.
- Khi BE trả empty (`InsufficientDataError`) → route trả envelope rỗng như hiện tại, FE giữ Empty state.

### 4.2. FE
- Không bắt buộc đổi code: `statistics-data.tsx` đã refetch theo `interval`; `TemporalPatternCharts` vẽ từ `data`.
- Bổ sung test đảm bảo FE gửi `start_time/end_time` cho temporal + deps `[interval, window, country, region]`.

### 4.3. Test (đồng thời khi §9 Approved — I7)
- BE: `apps/api/tests/unit/test_analysis_query_params.py` (bổ sung) — 3 request `interval=day|week|month` với `start_time/end_time` cố định → `data_points`/`line_chart` chỉ chứa sự kiện trong cửa sổ; scatter & histogram cùng nguồn đã lọc.
- FE: bổ sung assertion trong test statistics sub-route (không xoá test cũ).
- Lệnh: BE `uv run python -m pytest -q` + ruff; FE `pnpm build && pnpm test`; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: FE tự lọc lại 3 mảng theo interval
Ưu: không đụng BE. Nhược: FE chỉ có dữ liệu snapshot thô, không đủ events thật cho scatter/histogram → sai bản chất. **Không chọn.**

### B (chọn): BE tính on-the-fly khi có cửa sổ
Ưu: đúng dữ liệu, tái dùng helper có sẵn, payload không đổi. Nhược: bỏ 1 request snapshot (hơn hết). **Chọn.**

### C: Tạo snapshot riêng cho day/week/month trong T3
Ưu: nhanh. Nhược: migration/worker ghi 3 bản, vượt phạm vi. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Rất thấp | 1 điều kiện trong route |
| Hiệu năng | Tốt hơn | Bỏ request snapshot, query trực tiếp cửa sổ 30 ngày |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký/build(), path cũ vẫn có khi không có window |
| Độ tin cậy | Tốt | 3 biểu đồ cùng một nguồn đã lọc |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Guard OpenAPI/contract thay đổi | Thấp | Thấp | Không đổi tham số/response — chỉ logic; snapshot nếu fail thì cập nhật có chủ đích |
| Cửa sổ "month" thực chất 30 ngày | Trung bình | Thấp | Đúng cấu hình `ANALYSIS_WINDOW_DAYS` mới (30) — ghi rõ trong UI nếu cần |
| Test cũ mong snapshot | Thấp | Thấp | Chỉ test path có start/end; path không filter vẫn giữ |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-temporal-charts-window-thien.md`
- **Code test offline:** `apps/api/tests/unit/test_analysis_query_params.py` (bổ sung) + FE test statistics.
- **Cách kiểm chứng:** BE pytest + ruff; FE build + test; tay: đổi chip Ngày/Tuần/Tháng → 3 biểu đồ đổi số liệu tương ứng.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" trong chat 2026-11-24. Duyệt §4: `/analysis/temporal` tính on-the-fly khi có cửa sổ start/end (mọi trường hợp), giữ snapshot khi không có cửa sổ & không filter; payload/schema không đổi. `Overrides:` đường đọc snapshot của `2026-11-12-analysis-four-patterns-son` chỉ cho trường hợp có cửa sổ. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
Chờ §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-temporal-charts-window-thien`, sinh đồng thời notes + testcase, implement BE, test, dừng **CHECKPOINT 1**.
