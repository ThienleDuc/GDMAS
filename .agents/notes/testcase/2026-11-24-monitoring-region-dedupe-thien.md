<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Loại bỏ khu vực trùng lặp (BE + FE)

## Metadata
- ID: 2026-11-24-monitoring-region-dedupe-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/api/src/gdmas/api/routes/earthquakes.py`, `apps/web/src/{layouts/header,features/monitoring,components/map}`
- Test File: `apps/api/tests/unit/test_earthquakes_routes.py`, `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/header-region-filter.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** hàm gộp region rows ở BE; dedupe casefold ở FE (header + monitoring panel).
- **Ràng buộc:** I2 (giữ chữ ký), I3 (payload shape), I5 (không mock), I7 (offline 100%).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- BE fixture: 3 event `region = "Honshu"`, `" honshu "`, `"HONSHU"` với magnitude 4.0/6.0/5.0, cùng country Japan.
- FE fixture: catalog `[{region:"Tokyo",count:2},{region:" tokyo ",count:3}]`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | BE gộp biến thể | Functional | 3 region biến thể | `/regions` trả **1** dòng `Honshu`, count=3, avg=5.0, max=6.0 | `PASSED` |
| `TC-02` | BE giữ lọc country | Functional | country=Japan | Chỉ trả khu vực Japan | `PASSED` |
| `TC-03` | FE header dedupe casefold | Functional | catalog 2 biến thể | 1 option `Tokyo` count=5 | `PASSED` |
| `TC-04` | FE monitoring/panel dedupe | Structural | Đọc `region-catalog-view`, `MapRegionPanel` | Dùng khoá `trim().casefold()`; không render trùng | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest tests/unit/test_earthquakes_routes.py -q
cd apps/api && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** BE `uv run python -m pytest tests/unit/test_earthquakes_routes.py -q` → **38 passed** + ruff sạch; FE `pnpm build` PASS + `pnpm test` **360 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
