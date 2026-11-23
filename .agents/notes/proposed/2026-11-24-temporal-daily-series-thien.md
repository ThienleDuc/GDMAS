<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Biểu diễn thời gian luôn vẽ chuỗi theo ngày (nhiều phiên ngày)

## Metadata
- ID: 2026-11-24-temporal-daily-series-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: low
- Area: `apps/web/src/features/statistics/statistics-data.tsx`, `apps/web/tests/`
- Architecture Impact: none   <!-- Chỉ đổi tham số gửi lên /analysis/temporal, không đổi contract/payload -->
- Related Docs:
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-24-temporal-charts-window-thien.md   (*cùng page, bổ sung sau khi merge*)
  - .agents/notes/proposed/2026-11-23-statistics-subroute-load-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Chip Ngày/Tuần/Tháng trên `/statistics/bieu-dien-thoi-gian` hiện vừa đổi **cửa sổ**, vừa đổi **tần suất resample** của BE
(`intervalToParams(interval)` gửi `interval=day|week|month`). Line chart vì thế chỉ có ít điểm (1 ngày / 7 tuần / 1 tháng).

### Vấn đề
Người dùng muốn 3 chế độ đều hiển thị **nhiều phiên ngày** (chuỗi các mốc ngày) giống biểu xu hướng Overview:
chip chỉ quyết định **độ dài cửa sổ** (24h / 7 ngày / 30 ngày), còn BE luôn resample theo **ngày**.

### Ảnh hưởng
Biểu ngày/tháng hiện quá thưa, khó so sánh diễn biến theo từng ngày.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `statistics-data.tsx:92` | `window = intervalToParams(interval)` → `{interval, start_time, end_time}` |
| `statistics-data.tsx:108-116` | `getTemporalAnalysis({ interval, ...window, ...geo })` — gửi interval của chip xuống BE |
| `statistics-view.ts:76-82` | `intervalToParams` — day 24h / week 7 ngày / month 1 tháng (đã đúng cửa sổ) |

---

## 3. Mục tiêu
- **Mục tiêu:** Luôn gọi `/analysis/temporal?interval=day` với cửa sổ lấy từ chip; 3 biểu đồ (line/scatter/histogram) đều đến từ chuỗi ngày trong cửa sổ đó.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi component `TemporalPatternCharts`, CSS, BE `compute_temporal`, contract/payload.
  - Không đổi chip/tên nhãn, logic `intervalToParams` (vẫn trả cửa sổ theo preset).
  - Không xoá test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: giữ `interval` trong context (trạng thái chip), chỉ đổi tham số gửi cho API.

### 4.1. FE
- `statistics-data.tsx`: trong `getTemporalAnalysis` dùng
  `{ interval: "day", start_time: window.start_time, end_time: window.end_time, ...geo }`.
- Deps giữ nguyên `[interval, window, country, region]` → đổi chip vẫn refetch đúng cửa sổ.
- `TemporalPatternCharts` không đổi (vẫn nhận `interval` để highlight chip).

### 4.2. Test
- Bổ sung test statistics sub-route: assert source gửi `interval: "day"` cho temporal + `...window` từ `intervalToParams(interval)`; giữ test cũ.
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Đổi BE `_resample` theo yard stick mới
Ưu: một lần cho mọi caller. Nhược: ảnh hưởng caller khác, vượt phạm vi. **Không chọn.**

### B (chọn): FE luôn gửi `interval=day`, cửa sổ theo chip
Ưu: 1 dòng, không đụng BE/contract, đúng ý "nhiều phiên ngày". Nhược: với chip Ngày (24h) chỉ có 1–2 mốc ngày — đã được người dùng chọn. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Rất thấp | 1 dòng FE + test |
| Hiệu năng | Không đổi | Vẫn 1 request |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký/props, chip vẫn hoạt động |
| Độ tin cậy | Tốt | Dữ liệu ngày thật trong cửa sổ |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Chip Ngày chỉ 1–2 điểm | Cao | Thấp | Người dùng đã chọn "luôn vẽ chuỗi theo ngày" |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-temporal-daily-series-thien.md`
- **Code test offline:** bổ sung test statistics FE.
- **Cách kiểm chứng:** `pnpm build && pnpm test`; tay: đổi chip → 3 biểu đồ vẫn là chuỗi ngày, số mốc tăng theo cửa sổ.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" sau khi chọn rõ phương án "Luôn vẽ chuỗi theo ngày". Duyệt §4: FE gửi `interval=day` cho `/analysis/temporal`, cửa sổ vẫn lấy từ chip Ngày/Tuần/Tháng; giữ component/BE/contract. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
Chờ §9. Sau `Approved`: rẽ nhánh `fix/2026-11-24-temporal-daily-series-thien`, sinh notes, sửa FE + test, dừng **CHECKPOINT 1**.
