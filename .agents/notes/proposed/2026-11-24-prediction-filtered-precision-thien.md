<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Chuẩn hóa độ chính xác dự báo ở BE về 3 chữ số thập phân

## Metadata
- ID: 2026-11-24-prediction-filtered-precision-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/services/{analysis/filtered,prediction/service}.py`, `apps/api/tests/unit/`
- Architecture Impact: none   <!-- Không đổi contract/schema: vẫn cùng field, chỉ chuẩn hóa số chữ số thập phân -->
- Related Docs:
  - docs/api/API.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-23-chart-country-region-filter-thien.md   <!-- - Overrides: cách trả float thô của `build_filtered_forecast` (giữ nguyên cơ chế on-the-fly) -->
  - .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md
  - .agents/notes/proposed/2026-11-22-prediction-contract-aliases-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Đường snapshot (`services/prediction/service.py`) lưu `predicted_value`, `lower_bound`, `upper_bound` với
`round(..., 1)`. Đường on-the-fly (`services/analysis/filtered.py::build_filtered_forecast`, proposal
`2026-11-23-chart-country-region-filter-thien`) trả float thô nhiều chữ số (`299.5424...`). FE dùng
`formatDecimal3` nên hiển thị lúc `1`, lúc `3` chữ số — và nếu BE làm tròn về 1 thì thành `299.500`
(đệm `00` sau chữ số thập phân thứ nhất).

### Vấn đề
Người dùng muốn giữ **3 chữ số thập phân thật** (USA `299.542`, CI `179.705 – 316.753`;
Indonesia `6.086`, CI `4.554 – 8.766`), không muốn làm tròn về 1 chữ số rồi đệm `000`.

### Ảnh hưởng
Cùng một field có 2 độ chính xác giữa 2 đường BE → khó đối chiếu; FE không thể hiển thị thống nhất nếu không đệm số 0 giả.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `apps/api/src/gdmas/services/prediction/service.py:110-112` | `round(fc["predicted"|"lower"|"upper"], 1)` |
| `apps/api/src/gdmas/services/analysis/filtered.py:157-171` | Trả `forecast[...]` thô, không làm tròn |
| `apps/web/src/features/overview/overview-view.ts` | `formatDecimal3` — hiển thị đúng 3 chữ số nếu BE trả 3 chữ số thật |

---

## 3. Mục tiêu
- **Mục tiêu:** Chuẩn hóa **cả 2 đường BE** về **đúng 3 chữ số thập phân**:
  - Đường lọc: làm tròn `predicted`/`lower`/`upper` về 3 chữ số (giữ `299.542`, bỏ phần dư vô nghĩa sau đó).
  - Đường snapshot: đổi `round(..., 1)` → `round(..., 3)`.
  - Giữ nguyên payload/field/schema và cơ chế tính on-the-fly. FE không phải đệm `000`.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi mô hình/artifact ARIMA, quantile 95%, `min_observed`, hay `forecast_next`.
  - Không đổi contract/schema, response model, docs API, migration, worker, SSE, FE.
  - Không xoá test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: thêm hàm thuần, giữ chữ ký `build_filtered_forecast`. BE T5, không worker (I1), không payload mới (I3), không migration (I4), test offline (I7).

### 4.1. Đường lọc
- `filtered.py`: `rounded_forecast(forecast) -> dict` — bản sao với 3 field làm tròn `round(float(value), 3)`, giữ field khác.
- Gọi `rounded_forecast(inference.forecast_next(series))` trong `build_filtered_forecast`.

### 4.2. Đường snapshot
- `service.py`: `round(fc["predicted"|"lower"|"upper"], 3)` thay vì `1`.

### 4.3. Test
- `apps/api/tests/unit/test_prediction_filtered_precision.py` (mới, offline): thô → 3 chữ số; đã 3 chữ số giữ nguyên; field khác không đổi; input không bị mutate; source assertion snapshot dùng `, 3)`.
- Chạy `uv run python -m pytest ...` + `uv run ruff check . && uv run ruff format --check .`.

---

## 5. Phương án đã cân nhắc
### A: Làm tròn về 1 chữ số rồi FE đệm `000`
Ưu: ít đổi BE. Nhược: `299.500` — số 0 giả sau dấu thập phân, người dùng từ chối. **Không chọn.**

### B (chọn): Chuẩn hóa cả 2 đường về 3 chữ số thật
Ưu: giữ số liệu gốc có ý nghĩa, FE hiển thị đúng `299.542` không đệm, một chuẩn cho mọi consumer. Nhược: đổi 1 dòng ở snapshot + hàm thuần mới. **Chọn.**

### C: Giữ nguyên float thô ở 2 đường
Ưu: không đổi code. Nhược: độ dài thập phân không đoán trước, khó test/đối chiếu. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Rất thấp | 1 hàm thuần + 3 dòng snapshot + 1 test file |
| Hiệu năng | Không đổi | 3 phép `round` |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký, thêm hàm |
| Độ tin cậy | Tốt | Một độ chính xác, không số 0 giả |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| DB snapshot cũ lưu 1 chữ số | Thấp | Thấp | Chu kỳ T5 ghi đè mỗi ngày; không migration (không đổi schema) |
| Test cũ assert `, 1)` | Thấp | Thấp | Đã kiểm `test_prediction_service.py` — không assert độ chính xác |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-prediction-filtered-precision-thien.md`
- **Code test offline:** `apps/api/tests/unit/test_prediction_filtered_precision.py` (mới)
- **Cách kiểm chứng:** `uv run python -m pytest ...`; ruff; `notes_index.py --check`; sau deploy: USA `299.542`, Indonesia `6.086` trên FE.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận rõ trong chat 2026-11-24: "trả về chuẩn hóa lấy 3 số sau thập phân trước đó mà không phải làm tròn về 00 sau chữ số thập phân thứ nhất". Sửa quyết định ban đầu (1 chữ số) thành **3 chữ số thật ở cả 2 đường BE**; KHÔNG đệm `000`. `Overrides:` chỉ cho cách trả float thô của `build_filtered_forecast`, không override cơ chế on-the-fly. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
### Revision 2026-11-24
- Đổi mục tiêu từ "làm tròn về 1 chữ số" sang "chuẩn hóa 3 chữ số thật ở cả 2 đường"; cập nhật §4/§5/§7/§9.
- Đã implement: `filtered.py` (`rounded_forecast(..., 3)`), `service.py` (`round(..., 3)`), test 5 ca.
- Chờ CHECKPOINT 1 để commit/merge.

---

Chờ xác nhận CHECKPOINT 1.
