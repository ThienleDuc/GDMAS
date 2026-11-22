# Implementation Plan: DBSCAN thật cho T4

## Metadata
- ID: 2026-11-23-dbscan-clustering-thien
- Proposal: .agents/notes/proposed/2026-11-23-dbscan-clustering-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Status: in_progress

## 1. Mục tiêu
Có cụm địa chấn thật trong `clustering_results` để `/clusters` trả dữ liệu.

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/clustering/service.py` *(mới)*
- `apps/api/src/gdmas/services/clustering/runner.py` *(thêm --once)*
- `apps/api/tests/unit/test_clustering_service.py` *(mới)*
- `.agents/notes/testcase/2026-11-23-dbscan-clustering-thien.md`

### Out of Scope
- Migration/index, K-Means, mock seeder, contracts/, main.py.

## 3. Các bước
1. Hàm thuần `compute_dbscan` (sklearn, haversine, eps 150km, min_samples 5).
2. Tóm tắt cụm: center, radius_km, avg/max magnitude, dominant_place; đếm noise.
3. `run_cycle` ghi ServiceRun + ClusteringResult + mappings (bulk).
4. `--once` trong runner, giữ vòng lặp cũ.
5. Test offline + chạy thật + validate.

## 4. Thay đổi dữ liệu
- Ghi bảng `clustering_results`, `clustering_event_mapping`, `service_runs` — **không migration**.

## 5. Validation
- [x] testcase note
- [ ] `pytest` + ruff
- [ ] `runner --once` + curl `/clusters`

## 6. Rủi ro
Hiệu năng ball_tree; dominant_place thiếu → null.

## 7. Rollback
Revert PR; xoá bản ghi clustering_results do lần chạy tạo.

## 8. Ghi chú
I1 (runner riêng), I2 (giữ run()), I4 (không sửa migration), I5 (không mock).
