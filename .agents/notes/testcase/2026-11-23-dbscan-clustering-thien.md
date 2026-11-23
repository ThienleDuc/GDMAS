# Testcase: DBSCAN thật cho T4

## Metadata
- ID: 2026-11-23-dbscan-clustering-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/services/clustering/{service,runner}.py
- Test File: apps/api/tests/unit/test_clustering_service.py
- Author: agent | thien
- Created: 2026-11-23
- Status: draft
- Related Bugs: none

## 1. Ràng buộc
I1 (worker riêng), I2 (giữ run()), I4 (không migration), I5 (không mock), I7 (offline).

| TC | Đầu vào | Kết quả | Kết quả |
|---|---|---|---|
| 01 | 2 cụm Nhật/California + nhiễu | 2 cluster, noise≥1 | `PASS` |
| 02 | eps/min_samples | parameters đúng (150km, 5, haversine) | `PASS` |
| 03 | summary cluster | center/radius/avg/max/dominant_place | `PASS` |
| 04 | DB rỗng/<min_samples | 0 cụm, không crash, không cụm giả | `PASS` |
| 05 | run_cycle | ghi ServiceRun + result + mappings | `PASS` |

## 2. Lệnh & Kết quả
```bash
cd apps/api && .venv/bin/python -m pytest -q
```
- Ngày chạy: 2026-11-23
- Kết quả: `.venv/bin/python -m pytest -q` **356/356 PASS** (gồm 4 test DBSCAN mới); `ruff check`/`format` sạch.
- Runtime: `python -m gdmas.services.clustering.runner --once` → ghi `clustering_results`: `algorithm=DBSCAN`, `parameters={eps_km:150, min_samples:5, metric:haversine}`, `total_clusters=54`, `noise_count=359`, 9.440 mapping; `GET /api/v1/clusters` trả `success:true`, cụm đầu (Alaska 3.167 sự kiện, `dominant_place="Pedro Bay, USA"`, `radius_km=1916.87`).

## 3. Lỗi & Bug Logs
- none
