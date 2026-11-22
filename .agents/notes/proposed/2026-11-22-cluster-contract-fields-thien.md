# Proposal: `/clusters` trả đủ `dominant_place` & `radius_km` (GAP-01)

## Metadata
- ID: 2026-11-22-cluster-contract-fields-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/api/routes/, apps/api/tests/unit/
- Architecture Impact: none
  <!-- Các field đã có trong contracts/schemas/clusters.json:61-67 (optional). Route BE chưa trả.
       Không đổi schema, không đổi docs/api/API.md (prose đã mô tả), không migration. -->
- Related Docs:
  - docs/api/API.md §3.4
  - contracts/README.md §3.4 (bảng alias canonical ← legacy)
  - docs/task/fe-be-integration-gaps.md (GAP-01)
- Related Proposals:
  - 2026-11-21-monitoring-leaflet-map-markers-thien (B2 — `/clusters` thiếu `dominant_place`, FE fallback "Khác")
  - 2026-11-21-overview-dashboard-thien (xếp hạng quốc gia gộp "Khác" do thiếu field)
  - 2026-11-21-api-docs-contract-sync-thien (docs đã đồng bộ, chờ BE)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`contracts/schemas/clusters.json:61-67` định nghĩa `radius_km`, `name`, `dominant_place` là field optional của mỗi cụm. FE `map-data.ts:110-151` và `country-clusters.ts:64` đã đọc chúng; `docs/api/API.md` §3.4 cũng có.

### Vấn đề
`_cluster()` (`routes/clusters.py:19-29`) chỉ trả 6 field cơ bản + `name` có điều kiện — **không trả `dominant_place` / `radius_km`**, `max_magnitude` cũng thường thiếu với payload legacy. Hệ quả:
- `groupClustersByCountry()` rơi `"Khác"` dù cụm có địa danh thật; header lọc quốc gia suy yếu.
- Popup bản đồ mất bán kính/địa danh; FE fallback `eps_km`.

### Ảnh hưởng
GAP-01 mức Cao, là tiền điều kiện để dứt điểm GAP-05 (bỏ mock region clusters trên `/monitoring`).

---

## 2. Hiện trạng
- `routes/clusters.py:19-29` `_cluster(c: dict) -> dict` — map alias `id/lat/lon/events_count/avg_mag` → canonical; gọi ở `:56`.
- `models/clustering.py:19-21` `summary_clusters` là JSONB → **có chỗ chứa** field mới, không cần migration (I4).
- `services/clustering/runner.py` hiện placeholder; nguồn dữ liệu thật là `demo_seeder.py:294-336` (legacy) hoặc T4 sau này.
- Test cũ: `test_system_prediction_routes.py:262-290` chỉ assert 4 field cơ bản → không bắt gap.

---

## 3. Mục tiêu
- **Mục tiêu:** `_cluster()` pass-through thêm `max_magnitude`, `radius_km`, `name`, `dominant_place` (canonical + alias legacy), trả `None` khi thiếu — additive, không đổi chữ ký.
- **Không nằm trong mục tiêu:** đổi schema/contracts/docs, migration, worker T4, FE mock (GAP-05), route khác.

---

## 4. Giải pháp đề xuất
1. Sửa `_cluster()` trong `apps/api/src/gdmas/api/routes/clusters.py`: thêm
   - `max_magnitude: c.get("max_magnitude", c.get("max_mag"))`
   - `radius_km: c.get("radius_km", c.get("radius"))`
   - `name: c.get("name")` (luôn hiện, `None` khi thiếu)
   - `dominant_place: c.get("dominant_place", c.get("place"))`
2. Giữ nguyên 6 key cũ và chữ ký hàm (RULE-03/I2). Không fallback số giả: field thiếu → `None`.
3. Test offline mới `apps/api/tests/unit/test_cluster_contract_fields.py`: canonical đủ field; legacy alias; missing → `None`; empty envelope vẫn `{success:false,data:null,message}`.

---

## 5. Phương án đã cân nhắc
### A: Pass-through ở route (chọn)
Ưu: 1 hàm, không đụng DB/schema, không breaking. Nhược: route phụ thuộc nguồn ghi field (T4/demo) — nhưng JSONB đã sẵn sàng.
### B: Sửa worker T4/demo_seeder ghi field
Ưu: đúng nguồn. Nhược: T4 đang placeholder, vượt scope, chậm hơn; route vẫn cần pass-through.
### C: FE tự suy địa danh từ `name`
Ưu: không đụng BE. Nhược: bịa dữ liệu (I5/I3), sai yêu cầu "thay đổi phía BE để đồng bộ FE".

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 4 dòng mapping |
| Hiệu năng | Không đổi | Pass-through JSONB |
| Bảo trì / Open-Closed | Tốt | Không xóa/đổi key cũ |
| Độ tin cậy | Tăng | FE hiển thị địa danh/bán kính thật |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Nguồn `summary_clusters` chưa có field → vẫn `None` | Cao | Thấp | FE đã fallback `eps_km`; không bịa số |
| Schema `additionalProperties:false` | — | — | Field đã định nghĩa ở `clusters.json:61-67` → an toàn |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Testcase:** `.agents/notes/testcase/2026-11-22-cluster-contract-fields-thien.md`
- **Code test:** `apps/api/tests/unit/test_cluster_contract_fields.py` (mới)
- **Lệnh:** `cd apps/api && uv run pytest <file> && uv run pytest`, `uv run ruff check . && uv run ruff format --check .`; `cd apps/web && pnpm test && pnpm build` (không đổi FE nhưng kiểm tra drift); `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) xác nhận "được" để tiếp tục xử lý các gap trong `docs/task/fe-be-integration-gaps.md`, bắt đầu GAP-01. Giới hạn §3; field đã có trong schema, không migration.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code route + test offline → validation → dừng CHECKPOINT 1 → ghi kết quả cuối `docs/task/fe-be-integration-gaps.md`.
