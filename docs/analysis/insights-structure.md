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

`buildExpertReport()` vẫn sinh đủ 5 phần làm dữ liệu cho prompt/AI, nhưng bảng nổi trên UI
chỉ còn **1 hộp Tổng quan** chứa nội dung AI sinh ra (trống trước khi trích xuất).
Các phần Triển vọng / Khuyến nghị / Lưu ý phương pháp không còn hiển thị riêng trên UI
(đã gộp vào câu trả lời AI). Cấu trúc dữ liệu 5 phần như sau:

### 3.1 Tổng quan
- Hộp tổng quan trên UI **để trống** cho đến khi người dùng bấm "Trích xuất nhận xét AI";
  khi có kết quả, hộp này chứa nội dung do AI sinh ra (kèm ghi chú nguồn/thời hạn lưu).
- `headline` / `summary` vẫn được tính trong `buildExpertReport()` nhưng chỉ dùng làm dữ liệu
  đầu vào cho prompt, không hiển thị trực tiếp trong bảng.
- Ngay dưới hộp này là khối **"Khuyến nghị an toàn (ngoài phân tích AI)"** — xem §5.9.

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
5. **Nguồn sự thật duy nhất**: báo cáo được sinh bằng quy tắc trong FE. Từ 2026-11-24,
   nút "Trích xuất nhận xét AI" gọi **Gemini qua BE** để **diễn đạt lại** báo cáo này;
   mô hình không được thêm/sửa số liệu. Không có key → luôn dùng báo cáo quy tắc (offline).
6. **Lưu tạm 24h**: câu trả lời và API key chỉ nằm trong localStorage/session của trình
   duyệt trong 24 giờ, không lưu database (web mở, không có auth). Hết hạn tự xoá.
7. **Trích xuất lại**: nút luôn sẵn; khi đã có kết quả, nút đổi thành "Trích xuất lại" và
   hiện xác nhận ghi đè trước khi chạy. Kết quả mới thay thế kết quả cũ theo cùng phạm vi.
8. **Đúng phạm vi đang xem**: dữ liệu đưa cho AI lấy từ 6 endpoint với cùng tham số với
   biểu đồ đang hiển thị — lọc quốc gia/khu vực (`geoQuery`) cho cả 6 nhóm và cửa sổ
   Ngày/Tuần/Tháng (`intervalToParams`) cho chuỗi thời gian. Đổi bộ lọc → khoá cache đổi,
   phải trích xuất lại.
9. **Khuyến nghị an toàn tách biệt**: sau câu trả lời AI, hệ thống thêm một khối cố định
   "Khuyến nghị an toàn (ngoài phân tích AI)" do `earthquake-safety.ts` sinh từ quy tắc trên
   độ lớn quan sát (Pattern 1) và nhóm phân loại (Pattern 6). Khối này KHÔNG nằm trong prompt
   gửi mô hình, không chứa số liệu và kèm nguồn tham khảo (USGS, Earthquake Country Alliance,
   FEMA/ready.gov, American Red Cross, NOAA/tsunami.gov) và disclaimer không phải cảnh báo
   chính thức. Mức `alert` khi độ lớn từ ngưỡng mạnh hoặc nhóm cao, `watch` khi độ lớn trung
   bình, `info` khi thấp/chưa có.

## 6. Ánh xạ mã nguồn

| Thành phần | Vai trò |
|---|---|
| `features/statistics/ai-insights.ts` | `buildExpertReport()` — sinh báo cáo từ 6 nguồn |
| `features/statistics/insight-structure.ts` | Tên 5 phần báo cáo (khớp mục 3 ở trên) |
| `features/statistics/ExpertInsightsPanel.tsx` | Render bảng nổi, nút mở/thu trên header |
| `tests/ai-insights.test.ts` | Kiểm chứng quy tắc, mức độ và không bịa số |
| `tests/insight-structure.test.ts` | Kiểm chứng tên phần trong code khớp tài liệu này |
| `features/statistics/ai-config.ts` | Đọc `VITE_AI_MODEL`, cache key browser 24h, chỉ nhận `gemini-*` |
| `features/statistics/ai-storage.ts` | Cache localStorage/session 24h (key + câu trả lời) |
| `features/statistics/ai-extract.ts` | Bộ câu trả lời chuẩn, prompt, gọi BE `/ai/generate`, chặn số liệu bịa |
| `layouts/header/AiKeyButton.tsx`, `AiKeyDialog.tsx` | Nút SVG khoá + dialog nhập model/key Gemini |
| `api/routes/ai_settings.py` | Validate key với Gemini → ghi `.env` → sinh nội dung |
| `tests/ai-extract.test.ts`, `tests/ai-key-dialog.test.ts` | Kiểm chứng offline: không bịa số, fallback, cache 24h, ẩn nút |
