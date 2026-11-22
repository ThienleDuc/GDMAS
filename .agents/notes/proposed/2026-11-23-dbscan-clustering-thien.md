# Proposal: Triển khai DBSCAN thật cho Terminal 4 (cụm địa chấn)

## Metadata
- ID: 2026-11-23-dbscan-clustering-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/services/clustering/, apps/api/tests/unit/
- Architecture Impact: không đổi payload/contract/migration — chỉ ghi dữ liệu vào bảng `clustering_results`/`clustering_event_mapping` đã có; `GET /clusters` trả dữ liệu thật thay vì empty.
- Related Docs: docs/task/van.md (Task 1–4), docs/architecture/ERD.md §2.3, docs/api/API.md §3.4
- Related Proposals: 2026-11-22-cluster-contract-fields-thien (chỉ pass-through `_cluster()`); proposal này bổ sung nguồn dữ liệu thật, không đổi hợp đồng.
- Related Bugs: none

---

## 1. Vấn đề
`clustering_results` và `clustering_event_mapping` đều **0 dòng**; `runner.py` chỉ là placeholder `time.sleep(86400)`; không có hàm DBSCAN nào trong repo. Hệ quả: `/clusters` trả empty, bản đồ/ranking cụm không có dữ liệu (dù ranking Overview đã chuyển sang catalog sự kiện ở proposal trước).

## 2. Hiện trạng
- Model `ClusteringResult`/`ClusteringEventMapping` đã có sẵn (ERD).
- `contracts/schemas/clusters.json` định nghĩa shape canonical `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude/max_magnitude/radius_km/dominant_place`.
- `scikit-learn>=1.4.1` đã trong `pyproject.toml`.
- `docs/task/van.md` đã mô tả rõ thuật toán: Haversine, `eps_km=150`, `min_samples=5`, cửa sổ 30 ngày, `--once`.

## 3. Mục tiêu
- Tạo `services/clustering/service.py`: hàm thuần `compute_dbscan(events, eps_km, min_samples)` dùng sklearn DBSCAN metric `haversine` trên tọa độ radian WGS84; trả `parameters`, `total_clusters`, `noise_count`, `summary_clusters`, `mappings`.
- `run_cycle(db, now, ...)`: query sự kiện trong cửa sổ, gọi thuần, ghi `ServiceRun` + `ClusteringResult` + `bulk_save_objects` mappings; xử lý an toàn DB rỗng/ít hơn `min_samples` (không cụm giả, không crash).
- Nối `--once` vào `runner.py`, giữ nguyên vòng lặp 86400 giờ và chữ ký `run()` (I2/I1).

## 4. Phương án đã cân nhắc
- A: dùng seeder demo (`idx % 4`) → mock, vi phạm I5. **Không chọn.**
- B: tính DBSCAN trên client FE → sai bản chất, không lưu bền. **Không chọn.**
- C: DBSCAN thật ở BE, lưu bảng已有. **Chọn.**

## 5. Rủi ro
- Hiệu năng: 9.4k sự kiện → ball_tree haversine chạy vài giây (chấp nhận, chu kỳ 1 ngày).
- `dominant_place` suy từ `region, country`/place — fallback `null` nếu thiếu, không bịa.

## 6. Kiểm chứng & test
- `.agents/notes/testcase/2026-11-23-dbscan-clustering-thien.md`
- `apps/api/tests/unit/test_clustering_service.py` — fixture cụm Nhật/California + nhiễu, eps/min_samples, DB rỗng, ghi DB.
- `cd apps/api && .venv/bin/python -m pytest -q`; chạy `python -m gdmas.services.clustering.runner --once` trên DB dev; curl `/clusters`.

## 7. Đánh đổi
| Khía cạnh | Tác động |
|---|---|
| Độ phức tạp | Trung bình (1 module BE + runner + test) |
| Open-Closed | Giữ `run()`, thêm `--once`; không migration |
| Độ tin cậy | Không cụm giả; noise được đếm đúng |

## 8. Out of Scope
- Migration/index mới (Task 3), K-Means đối chiếu, lọc cụm theo quốc gia.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng chọn "Commit nhánh FE này, rồi làm T4 DBSCAN" — chấp thuận triển khai đúng Task 1–2 của `docs/task/van.md`, không mock.
Scope of Rejection: -

## 10. Next Action
build-implementation: tạo implemented/testcase, code, validation, CHECKPOINT 1.
