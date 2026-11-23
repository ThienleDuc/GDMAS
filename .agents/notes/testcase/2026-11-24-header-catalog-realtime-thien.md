<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Combobox header tải catalog realtime (chỉ đẩy khi đổi)

## Metadata
- ID: 2026-11-24-header-catalog-realtime-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-24-header-catalog-realtime-thien.md
- Target: `apps/api/src/gdmas/services/catalog.py`, `apps/api/src/gdmas/realtime/sse.py`, `apps/web/src/layouts/header/`
- Test File: `apps/api/tests/unit/test_catalog_sse.py`, `apps/web/tests/header-region-filter.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** service catalog, SSE diff-push (chỉ gửi `catalog` khi hash khác), FE tiêu thụ có điều kiện.
- **Ràng buộc:** I1 (BE/SSE chuẩn), I2 (giữ props/hàm cũ), I3 (UTC), I5 (không mock ở view), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- SQLite fixture: 2 quốc gia, 3 biến thể `Honshu`/` honshu `/`HONSHU` → dedupe thành 1 dòng count 3.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | `country_counts`/`region_counts` | Functional | fixture 3 biến thể | 1 dòng Honshu count 3; country sort đúng | `PASSED` |
| `TC-02` | Hash ổn định | Functional | cùng payload 2 lần | Cùng hash; đổi count → hash khác | `PASSED` |
| `TC-03` | SSE lần đầu / không đổi / đổi | Functional | snapshot lặp | Lần 1 có `catalog`; lần 2 không có field; đổi data → có lại | `PASSED` |
| `TC-04` | database_cleared | Functional | event clear | `catalog` rỗng + hash reset | `PASSED` |
| `TC-05` | FE consume có điều kiện | Structural | Đọc 2 filter + DashboardLayout | Có prop `catalog`, chỉ update khi field tồn tại; thiếu → giữ nguyên | `PASSED` |
| `TC-08` | Catalog dùng cửa sổ 30 ngày | Functional | 1 event 5 ngày + 1 event 200 ngày | Chỉ đếm 1 (không lấy dữ liệu 1 năm); FE fetch đầu truyền `resolveWindow("month")` | `PASSED` |
| `TC-09` | SSE catalog bỏ qua env 365 cũ | Regression | monkeypatch `ANALYSIS_WINDOW_DAYS=365` | `catalog_payload` vẫn chỉ đếm event trong 30 ngày | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest -q && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** BE `uv run python -m pytest -q` → **381 passed**, ruff sạch; FE `pnpm build` PASS + `pnpm test` **364 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.
- **Vòng 2 (sửa lỗi dữ liệu 1 năm):** `services/catalog.py` áp cửa sổ `ANALYSIS_WINDOW_DAYS` (mặc định 30); FE fetch lần đầu truyền `resolveWindow("month")`. Phát hiện shell đang export `*_WINDOW_DAYS=365` override `.env` → cần `unset`/sửa env và recreate container để thấy dữ liệu 30 ngày.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
