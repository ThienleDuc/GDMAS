<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Biểu đồ Statistics nhận chế độ UTC/UTC+7 từ header

## Metadata
- ID: 2026-11-24-statistics-timezone-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/web/src/features/statistics/`, `apps/web/src/components/charts/`, `apps/web/tests/`
- Architecture Impact: none   <!-- Chỉ đổi cách hiển thị nhãn thời gian, không đổi payload/UTC lưu trữ -->
- Related Docs:
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-23-global-timezone-context-thien.md   (*đã merge — tái dùng `useTimezone`, không override*)
  - .agents/notes/proposed/2026-11-24-temporal-daily-series-thien.md
  - .agents/notes/proposed/2026-11-24-statistics-geo-filter-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Shell có `TimezoneProvider`; Overview / Danh mục / Bản đồ đã dùng `useTimezone()` để hiển thị thời gian theo lựa chọn
UTC / UTC+7 trên header. Statistics chưa đọc context này.

### Vấn đề
Các biểu đồ phân tích hiển thị mốc thời gian thô từ BE (`YYYY-MM-DD` / `target_date`) mà không theo chế độ đã chọn ở header:
- `TemporalPatternCharts`: trục X `point.date` (nhãn ngày do BE resample).
- `ForecastPatternPage` / `ForecastClassificationPatternPage`: `target_date`.
- `ai-insights.ts`: chuỗi "Ngày dự báo …" / "Dự báo cho …".

### Ảnh hưởng
Cùng một mốc dữ liệu, người dùng thấy định dạng thời gian khác nhau giữa trang Tổng quan và trang Thống kê.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `statistics-data.tsx` | `StatisticsDataProvider` không gọi `useTimezone()`; context không có `timezone` |
| `TemporalPatternCharts.tsx:48-54` | `date: point.date` → `<XAxis dataKey="date">` (thô) |
| `ForecastPatternPage.tsx:22` | `prediction?.target_date` hiển thị trực tiếp |
| `ai-insights.ts:272,324` | `target_date` nội suy thô vào câu insight |
| `utils/timezone.ts` | `formatEventTime(value, mode)` đã có (I2) |

---

## 3. Mục tiêu
- **Mục tiêu:** Đưa `timezone` từ `useTimezone()` vào `StatisticsData` context; truyền xuống các component hiển thị mốc thời gian và format qua helper thuần dùng `formatEventTime`.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi dữ liệu lưu trữ: mọi timestamp trong DB/API vẫn UTC ISO `Z` (I3).
  - Không đổi BE, contract, payload, logic resample/cửa sổ, Dark Mode.
  - Không đổi component biểu đồ ngoài Statistics (Overview dùng sẵn context).
  - Không xoá test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm field/props optional, giữ chữ ký cũ. FE T7, UTC (I3), test offline (I7).

### 4.1. Context
- `statistics-data.tsx`: `const { timezone } = useTimezone()`; thêm `timezone: TimezoneMode` vào `StatisticsData` & `value`.

### 4.2. Helper thuần
- `statistics-view.ts`: `formatStatDate(label: string | null | undefined, mode: TimezoneMode): string`
  - `YYYY-MM-DD` / `YYYY-MM` → parse thành UTC ISO rồi `formatEventTime(iso, mode)`.
  - chuỗi khác / thiếu → `"—"` hoặc giữ nguyên (không bịa).
  - Test offline theo `NOW` cố định cho 2 mode.

### 4.3. Tiêu thụ
- `TemporalPatternPage`: lấy `timezone` từ context → truyền `timezone` vào `TemporalPatternCharts` (prop optional, caller cũ vẫn chạy).
- `TemporalPatternCharts`: map `date: formatStatDate(point.date, timezone)` trước khi đưa vào line chart & Brush.
- `ForecastPatternPage`: format `target_date` qua `formatStatDate(..., timezone)`.
- `ai-insights.ts`: nhận `timezone` optional trong builder của forecast, format chuỗi ngày (giữ chữ ký cũ với default UTC).

### 4.4. Test (đồng thời khi §9 Approved — I7)
- FE: test `formatStatDate` 2 mode; test structural `statistics-data.tsx` có `useTimezone()` + field `timezone`; `TemporalPatternCharts` có prop `timezone`.
- Lệnh: `pnpm build && pnpm test`; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Format ngay trong BE theo header
Ưu: một nguồn. Nhược: BE không biết mode của từng user, vi phạm I3 (lưu UTC). **Không chọn.**

### B (chọn): FE nhận mode từ context + helper thuần
Ưu: đúng luồng đã có ở các trang khác, không đổi contract, test offline dễ. Nhược: sửa vài component FE. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 helper + 3 component + test |
| Hiệu năng | Không đổi | Chỉ format nhãn |
| Bảo trì / Open-Closed | Tốt | Props optional, giữ chữ ký cũ |
| Độ tin cậy | Tốt | UTC trong API, chỉ đổi hiển thị |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Nhãn ngày bị lệch 1 ngày khi đổi UTC+7 | Trung bình | Trung bình | Parse UTC rồi format — không cộng ngày thủ công |
| Dirty tree 2 task trước | Cao | Trung bình | Stage patch riêng, giữ working tree |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-statistics-timezone-thien.md`
- **Code test offline:** bổ sung `apps/web/tests/statistics-view.test.ts`.
- **Cách kiểm chứng:** FE build + test; tay: đổi mode UTC↔UTC+7 ở header → nhãn ngày trên biểu Statistics đổi theo.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" trong chat 2026-11-24. Duyệt §4: StatisticsData lấy timezone từ useTimezone (header), helper formatStatDate parse UTC rồi format, truyền xuống TemporalPatternCharts/ForecastPage/ai-insights; dữ liệu API vẫn UTC. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
Chờ §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-statistics-timezone-thien`, sinh notes, implement FE, test, dừng **CHECKPOINT 1**.
