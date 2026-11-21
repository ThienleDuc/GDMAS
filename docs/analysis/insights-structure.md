# Cấu trúc báo cáo phân tích chuyên gia

> Tài liệu này là nguồn mô tả cho bảng "Phân tích chuyên gia" trên trang **6 nhóm phân tích**
> (`/statistics`). Mọi thay đổi cấu trúc bảng phải cập nhật cả `apps/web/src/features/statistics/ai-insights.ts`,
> `insight-structure.ts` và `ExpertInsightsPanel.tsx` để đồng bộ.

## 1. Mục đích

Tổng hợp dữ liệu của 6 nhóm phân tích chuỗi thời gian thành một nhận xét ngắn gọn cho người giám sát
thiên tai: tình trạng hiện tại, diễn biến đáng chú ý và triển vọng ngày kế tiếp. Báo cáo **không phải
cảnh báo chính thức** và không thay thế quyết định của chuyên gia con người.

## 2. Nguồn dữ liệu

Bảng chỉ dùng 6 nguồn đã hiển thị trên sublayout (T3/T5 qua T6):

| Nhóm | Endpoint | Trường dùng để nhận xét |
|---|---|---|
| 1. Biểu diễn theo thời gian | `/analysis/temporal` | `line_chart[]`: số sự kiện, độ lớn lớn nhất |
| 2. Phân tích xu hướng | `/analysis/trend` | `trend_direction`, `slope`, `r_squared`, `series[]` |
| 3. Phân tích chu kỳ | `/analysis/seasonality` | `components.seasonal_line[]`, `seasonality_strength`, `interpretation` |
| 4. Tương quan | `/analysis/correlation` | `variables[]`, `matrix[][]`, `note` |
| 5. Hồi quy & Dự báo | `/predictions` | `target_date`, `predicted_value`, `confidence_interval` (hoặc `lower_bound`/`upper_bound`) |
| 6. Phân loại | `/classifications` | `predicted_label`, `probabilities` |

## 3. Cấu trúc báo cáo

Báo cáo gồm 5 phần, hiển thị theo thứ tự sau trong bảng nổi:

### 3.1 Tổng quan
- `headline`: kết luận ngắn (ổn định / đáng theo dõi / cần chú ý) dựa trên mức cao nhất trong 6 nhận xét.
- `summary`: 2–3 câu tóm tắt diễn biến chính, trích dẫn số liệu đã có.

### 3.2 Nhận xét theo 6 nhóm
Mỗi nhận xét gồm:
- `pattern`: số 1–6;
- `title`: tên nhóm phân tích;
- `level`: mức độ (`info` / `watch` / `alert`);
- `comment`: nhận xét bằng tiếng Việt, bám vào số liệu;
- `evidence`: các mốc dữ liệu đã dùng (ví dụ "30 sự kiện", "R² = 0.72").

### 3.3 Triển vọng ngày kế tiếp
- `outlook`: ghép nhận xét dự báo định lượng (Pattern 5) và phân loại (Pattern 6).
- Mốc thời gian là **ngày kế tiếp (t+1)** theo UTC.

### 3.4 Khuyến nghị
- `recommendations`: danh sách hành động nên theo dõi, suy ra từ các mức `watch`/`alert`.
- Không đưa ra khuyến nghị y tế/khẩn cấp — chỉ là gợi ý kiểm chứng thêm.

### 3.5 Lưu ý phương pháp
- `caveats`: giới hạn của dữ liệu và phương pháp (không suy diễn nhân quả, không bịa số, t+1 là ước lượng).
- `dataSourceNote`: nguồn dữ liệu và disclaimer "không phải cảnh báo chính thức".

## 4. Quy tắc mức độ

| Mức | Ý nghĩa | Ví dụ kích hoạt |
|---|---|---|
| `info` — Thông tin | Dữ liệu bình thường hoặc chưa đủ để kết luận | Xu hướng ổn định; chu kỳ yếu; thiếu dữ liệu |
| `watch` — Theo dõi | Có tín hiệu đáng chú ý, cần quan sát thêm | Xuất hiện độ lớn ≥ 6; xu hướng tăng; CI dự báo vượt quan sát gần nhất |
| `alert` — Chú ý | Mức cao nhất trong thang đánh giá | Phân loại dự báo `HIGH` hoặc `CRITICAL` |

## 5. Nguyên tắc dữ liệu

1. **Không bịa số**: thiếu dữ liệu thì ghi "Chưa có …" và mức `info`.
2. **Không suy diễn nhân quả**: ma trận tương quan chỉ mô tả mối liên hệ.
3. **UTC & WGS84**: mọi mốc thời gian trong báo cáo theo UTC ISO 8601 `Z`; tọa độ (nếu trích dẫn) theo WGS84.
4. **Tách biệt dữ liệu thật và dự báo**: Pattern 5/6 luôn gắn nhãn "ngày kế tiếp".
5. **Offline**: báo cáo được sinh bằng quy tắc trong FE, không gọi mô hình AI hay dịch vụ ngoài.

## 6. Ánh xạ mã nguồn

| Thành phần | Vai trò |
|---|---|
| `features/statistics/ai-insights.ts` | `buildExpertReport()` — sinh báo cáo từ 6 nguồn |
| `features/statistics/insight-structure.ts` | Tên 5 phần báo cáo (khớp mục 3 ở trên) |
| `features/statistics/ExpertInsightsPanel.tsx` | Render bảng nổi, nút mở/thu trên header |
| `tests/ai-insights.test.ts` | Kiểm chứng quy tắc, mức độ và không bịa số |
| `tests/insight-structure.test.ts` | Kiểm chứng tên phần trong code khớp tài liệu này |
