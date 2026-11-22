# Implementation Status: DBSCAN thật cho T4

## Metadata
- ID: 2026-11-23-dbscan-clustering-thien
- Status: completed
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

## Tiến độ
Progress: 100%
Current Phase: completed — PR #96 đã merge vào develop (merge SHA `0ef2d54`)

Completed:
- Proposal §9 Approved; plan/status/testcase sinh đồng thời
- Step 1: `clustering/service.py` — `haversine_km`, `compute_dbscan` (sklearn, haversine, eps 150km, min_samples 5), tóm tắt cụm (center/radius/avg/max/dominant_place), noise
- Step 2: `run_cycle` ghi ServiceRun + ClusteringResult + bulk mappings; DB rỗng/<min_samples → 0 cụm, không cụm giả
- Step 3: `runner.py` thêm `--once`, giữ `run()`/vòng lặp 86400 (I2/I1)
- Step 4: test offline + chạy thật + validate

In Progress: none
Blocked: none

## Validation
| Kiểm tra | Kết quả |
|---|---|
| Testcase & test | DONE — `testcase/<id>.md` + `test_clustering_service.py` (4 test) |
| pytest/ruff | PASS — 356/356, ruff sạch |
| Runtime | PASS — 54 cụm / 359 noise / 9440 mapping; `GET /clusters` trả dữ liệu thật |

## Known Issues
- DBSCAN `eps=150km` với chuỗi địa chấn tạo cụm dài (Alaska 3.167 sự kiện, radius ~1917km) — đúng bản chất chaining của DBSCAN; có thể tinh chỉnh eps ở proposal sau.

## Deviations From Plan
- `runner.run()` thêm `argv` optional và dùng `parse_args(argv or [])` để không đọc `sys.argv` của pytest (giữ chữ ký cũ).
- Job `--once` lần đầu treo do container DB bị dừng ngoài phiên; đã khởi động lại stack và chạy thành công.

## Decisions
- sklearn DBSCAN metric=haversine, eps=150km, min_samples=5, window 30 ngày; không migration, không seeder/mock.

## Next Actions
- none — đã merge PR #96 vào develop, đồng bộ xong.

## Last Update
2026-11-23 — PR #96 merged vào develop (`0ef2d54`); status → completed.
