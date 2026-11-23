<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Biểu Statistics temporal bucket theo UTC/UTC+7 từ header

## Metadata
- ID: 2026-11-24-temporal-timezone-buckets-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: high
- Area: `apps/api/src/gdmas/services/analysis/{patterns,filtered}.py`, `apps/api/src/gdmas/api/routes/analysis.py`, `apps/web/src/services/`, `apps/web/src/features/statistics/`
- Architecture Impact: none   <!-- Thêm query param optional `timezone`; payload shape giữ nguyên; timestamp lưu UTC -->
- Related Docs:
  - docs/api/API.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-24-statistics-timezone-thien.md   (*FE format nhãn — bổ sung BE bucket*)
  - .agents/notes/proposed/2026-11-24-temporal-charts-window-thien.md
  - .agents/notes/proposed/2026-11-24-temporal-daily-series-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
FE đã gửi `timezone` từ header và `formatStatDate` hiển thị nhãn, nhưng BE `compute_temporal` resample **`event_time` theo UTC**:
`_resample(df, "day")` group theo ngày UTC rồi `_period_label` in `YYYY-MM-DD` UTC.

### Vấn đề
Người dùng xác nhận: **UTC+7 đã sang ngày 24 nhưng UTC vẫn ngày 23**. Một sự kiện `2026-11-23T20:00:00Z` thuộc
ngày 24 theo UTC+7 nhưng bị gán vào bucket "2026-11-23" → biểu temporal hiện sai ngày dù FE đã format đúng chế độ.
Chỉ đổi cách format ở FE không đủ vì FE không có timestamp gốc trong `line_chart` (chỉ có nhãn bucket).

### Ảnh hưởng
Toàn bộ 3 biểu đồ temporal (line/scatter/histogram) lệch ngày so với đồng hồ header khi chọn UTC+7.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `patterns.py:141-147` | `_resample` group theo index `event_time` (UTC); `_period_label` in ngày UTC |
| `patterns.py:213-253` | `compute_temporal(df, interval, scatter_limit)` — không có tham số timezone |
| `filtered.py:96-120` | `compute_filtered_metrics(... interval, start, end)` → gọi `compute_temporal` |
| `analysis.py:110-171` | `/analysis/temporal` nhận interval/start/end/country/region — chưa có timezone |
| `statistics-data.tsx` | Có `timezone` từ context nhưng chỉ dùng để format nhãn, chưa gửi API |

---

## 3. Mục tiêu
- **Mục tiêu:** Khi FE gửi `timezone=UTC+7`, BE **đổi `event_time` sang Asia/Ho_Chi_Minh trước khi resample** → nhãn bucket là ngày địa phương (24), đúng đồng hồ header. `timezone=UTC` giữ hành vi cũ.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi dữ liệu lưu trữ: DB/API timestamp vẫn UTC ISO `Z` (I3).
  - Không đổi payload shape (`line_chart`, `scatter_plot`, `histogram`, `stats`), contract field.
  - Không đổi logic sort/lọc quốc gia-khu vực/cửa sổ đã sửa ở task trước.
  - Không xoá test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm tham số optional, giữ default UTC cho caller cũ (T3 snapshot/worker).

### 4.1. BE
- `patterns.py`: hằng `TZ_BY_MODE = {"UTC": "UTC", "UTC+7": "Asia/Ho_Chi_Minh"}`.
  `compute_temporal(df, interval="day", scatter_limit=..., tz: str = "UTC")`:
  - `local = df.copy(); local["event_time"] = local["event_time"].dt.tz_convert(tz)` khi `tz != "UTC"`.
  - `_resample(local, interval)` + `_period_label(ts, interval)` → nhãn ngày LOCAL.
  - `scatter_plot[].timestamp` vẫn `format_utc(...)` (UTC) để FE tự format theo mode.
- `filtered.py::compute_filtered_metrics`: thêm `timezone: str | None = None`, map mode→tz, truyền `tz=` vào `compute_temporal`.
- `analysis.py::get_temporal`: thêm `timezone: str | None = Query(None, pattern="^(UTC|UTC\\+7)$")`; parse mode→tz; truyền vào cả 2 đường (filtered & `_respond` nếu có metrics). Giữ default `UTC` khi thiếu.

### 4.2. FE
- `earthquake-api.ts::getTemporalAnalysis`: thêm `timezone?: TimezoneMode` vào params, đưa vào `buildQuery`.
- `statistics-data.tsx`: truyền `timezone` (đã có từ context) vào `getTemporalAnalysis`, thêm `timezone` vào deps `usePanel` → đổi mode refetch.
- `formatStatDate` giữ nguyên (nhãn BE đã là ngày local; parse như UTC rồi format lại cho cùng ngày — không lệch).

### 4.3. Test (đồng thời khi §9 Approved — I7)
- BE: fixture sự kiện `2026-11-23T20:00:00Z`:
  - `timezone=UTC` → nhãn `2026-11-23`.
  - `timezone=UTC%2B7` → nhãn `2026-11-24`.
  - scatter `timestamp` vẫn ISO UTC `Z`.
- FE: assertion `getTemporalAnalysis` gửi `timezone` + deps có `timezone`.
- Lệnh: BE pytest + ruff; FE build + test; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: FE tự gộp lại từ scatter_plot
Ưu: không đụng BE. Nhược: scatter giới hạn 200 sự kiện, count không đúng; sai bản chất. **Không chọn.**

### B (chọn): BE resample theo timezone được yêu cầu
Ưu: đúng bucket, mọi consumer ăn cùng nhãn, payload shape không đổi. Nhược: thêm 1 query param + logic convert nhỏ. **Chọn.**

### C: Mặc định mọi bucket theo UTC+7 cứng
Ưu: đơn giản. Nhược: sai khi user chọn UTC. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 param BE + 1 param FE + test |
| Hiệu năng | Không đổi | Một `tz_convert` trên tập nhỏ |
| Bảo trì / Open-Closed | Tốt | Default UTC, caller cũ không vỡ |
| Độ tin cậy | Tốt | Ngày bucket khớp đồng hồ header |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Contract guard OpenAPI đổi | Cao | Thấp | Thêm Query param optional — cập nhật snapshot có chủ đích nếu guard fail |
| Double shift ở FE | Trung bình | Trung bình | FE chỉ format nhãn local, không cộng thêm ngày |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-temporal-timezone-buckets-thien.md`
- **Code test offline:** BE `apps/api/tests/unit/test_analysis_temporal_window.py` bổ sung + FE test statistics.
- **Cách kiểm chứng:** BE pytest + ruff; FE build + test; tay: event 23/11 20:00Z → chọn UTC+7 biểu hiện ngày 24, chọn UTC hiện ngày 23.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" trong chat 2026-11-24 sau khi chọn đúng vị trí sai (biểu Statistics temporal). Duyệt §4: BE thêm timezone query, convert event_time sang Asia/Ho_Chi_Minh trước resample; FE gửi timezone từ header context; payload shape & DB UTC giữ nguyên. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
Chờ §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-temporal-timezone-buckets-thien`, sinh notes, implement BE+FE, test, dừng **CHECKPOINT 1**.
