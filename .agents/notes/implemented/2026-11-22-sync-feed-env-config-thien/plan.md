# Implementation Plan: `/earthquakes/sync` dùng USGS_FEED_URL từ config

## Metadata
- ID: 2026-11-22-sync-feed-env-config-thien
- Proposal: .agents/notes/proposed/2026-11-22-sync-feed-env-config-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay hardcode USGS feed trong route sync bằng `settings.USGS_FEED_URL`, giữ alias cũ tương thích (I2), test offline chứng minh (I7).

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/earthquakes.py`
- `apps/api/tests/unit/test_sync_feed_config.py` *(mới)*
- `.agents/notes/testcase/2026-11-22-sync-feed-env-config-thien.md`
### Out of Scope
- worker Ingestion, payload/response, `contracts/`, gọi USGS thật

---

## 3. Các bước
1. Import `settings`; đổi `client.get(USGS_FEED_URL)` → `client.get(settings.USGS_FEED_URL)`; giữ hằng số alias kèm comment.
2. Tạo test offline monkeypatch settings + httpx, assert URL.
3. `uv run pytest` file mới + toàn bộ; `uv run ruff check/format --check`; `notes_index --check`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Architecture Impact: none.

---

## 5. Validation
- [x] Testcase sinh đồng thời
- [ ] Test offline `test_sync_feed_config.py` pass
- [ ] `uv run pytest -q` (318 cũ + mới)
- [ ] `uv run ruff check . && uv run ruff format --check .`
- [ ] `notes_index.py --check`

---

## 6. Rủi ro
Test cũ reference hằng số → giữ alias; settings đọc .env thật → monkeypatch.

---

## 7. Rollback
Revert 1 dòng route + xóa file test mới.

---

## 8. Ghi chú
Nhánh `chore/docker-fe-be-connection-thien`.
