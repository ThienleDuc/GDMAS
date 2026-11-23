<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — vòng đời planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Catalog realtime qua SSE (diff-push)

## Metadata
- ID: 2026-11-24-header-catalog-realtime-thien
- Status: validation
- Started: 2026-11-24
- Last Updated: 2026-11-24
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 6 — CHECKPOINT 1

Completed:
- Proposal §9 Approved; notes sinh đồng thời; `notes_index.py --check` OK
- Nhánh `fix/2026-11-24-header-catalog-realtime-thien` từ develop sạch
- BE: `services/catalog.py` (country/region counts + hash), SSE `asyncio.to_thread` + `_last_catalog_hash` — khác mới đính `catalog`, `database_cleared` gửi rỗng & reset
- FE: `DashboardLayout` → `HeaderActions` → 2 filter nhận `catalog` optional; có field thì update, thiếu thì giữ nguyên
- Test: BE 377 pass + ruff sạch; FE 364 pass + build
- Vòng 2: catalog áp cửa sổ 30 ngày (BE service + FE fetch đầu); BE 378 pass, FE 364 pass
- Vòng 3: shell env vẫn export 365 override `.env` → SSE catalog dùng `CATALOG_WINDOW_DAYS = 30` cố định; comment `.env`/backfill cập nhật; BE 381 pass

In Progress:
- CHECKPOINT 1 — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | BE test mới + FE test bổ sung |
| BE pytest/ruff | PASS | 381 passed; ruff sạch |
| FE build/test | PASS | 364 tests / 0 fail; build OK |
| Notes check | PASS | OK |

---

## Known Issues
- none

---

## Deviations From Plan
- Nhánh rẽ từ develop sạch (không còn dirty tree như các task trước).

---

## Decisions Made During Implementation
- Không sửa route `/countries`/`/regions` trong task này — giảm rủi ro, SSE tự query qua service.
- Dùng hash sha256 trên `json.dumps(sort_keys=True)` để so sánh ổn định.

---

## Next Actions
- Step 2 → Step 5: implement, test, validation
- Step 6: `Status: validation`, dừng CHECKPOINT 1

---

## Last Update
2026-11-24 — Vòng 3: SSE catalog dùng `CATALOG_WINDOW_DAYS=30` cố định, không bị env 365 ghi đè; BE 381 / FE 364 pass; `Status: validation`; dừng CHECKPOINT 1.
