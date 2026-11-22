# Implementation Plan: Sửa docs/setup.md theo cấu hình Docker thật

## Metadata
- ID: 2026-11-22-docker-setup-env-doc-drift-thien
- Proposal: .agents/notes/proposed/2026-11-22-docker-setup-env-doc-drift-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Sửa 6 điểm drift trong `docs/setup.md` (tên biến FE, cú pháp `printf`, envelope health, tên bảng, `USGS_FEED_URL`, tắt mock) và thêm test offline chặn tái diễn.

---

## 2. Phạm vi
### In Scope
- `docs/setup.md` (§1.5, §2.1, §2.2, §3.5, §5.1, §5.3)
- `apps/web/.env.example` — mặc định `VITE_API_MOCKING=disabled` (mẫu, không phải secret)
- `scripts/tests/test_setup_docs.py` *(mới)*
- `.agents/notes/testcase/2026-11-22-docker-setup-env-doc-drift-thien.md`
### Out of Scope
- code BE/FE, `docker-compose.yml`, `.env` thật (gitignored), `contracts/`

---

## 3. Các bước
1. Sửa 6 đoạn docs theo §4 proposal.
2. Tạo `scripts/tests/test_setup_docs.py` assert token đúng/sai.
3. Chạy `python3 -m unittest scripts/tests/test_setup_docs.py -v`, `docker compose config --quiet`, `notes_index --check`.
4. Cập nhật testcase/status.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có (docs-only). Architecture Impact: docs/setup.md.

---

## 5. Validation
- [x] Đặc tả testcase sinh đồng thời
- [ ] Test offline `scripts/tests/test_setup_docs.py` pass
- [ ] `python3 scripts/notes_index.py --check` OK
- [ ] `docker compose config --quiet` OK
- [ ] Tài liệu `docs/setup.md` cập nhật đúng 6 điểm

---

## 6. Rủi ro
Token cũ còn ở chỗ khác → grep toàn file; test quá cứng → assert theo token.

---

## 7. Rollback
Revert docs + xóa file test mới (do agent tạo trong lượt này).

---

## 8. Ghi chú
Nhánh `chore/docker-fe-be-connection-thien` (một nhánh cho audit + fix theo yêu cầu người dùng).
