# Proposal: Điền nội dung cho `scripts/test.sh` (hiện là file rỗng)

## Metadata
- ID: 2026-11-22-empty-test-script-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: medium
- Area: `scripts/test.sh`, `scripts/tests/test_test_script.py`
- Architecture Impact: none
  <!-- Không đổi wire contract; chỉ làm cho lệnh smoke test trong docs có tác dụng thật. -->
- Related Docs:
  - docs/setup.md §5.3 (`bash scripts/test.sh`)
- Related Proposals:
  - .agents/notes/proposed/2026-11-22-docker-setup-env-doc-drift-thien.md (sửa §5.1/§5.3 docs)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`docs/setup.md` §5.3 hướng dẫn chạy `bash scripts/test.sh` để "xác nhận cấu hình thành công" với kỳ vọng coverage ≥ 70%.

### Vấn đề
`scripts/test.sh` là **file 0 byte** (`wc -c scripts/test.sh` → 0). Chạy lệnh trong docs không kiểm tra gì cả nhưng vẫn exit 0 → người dùng tưởng hệ thống đã xác nhận xong. Đây là false-positive nguy hiểm trong quy trình setup Docker.

### Ảnh hưởng
Smoke test vô nghĩu; lỗi kết nối FE↔BE hoặc regression có thể lọt qua mà không ai biết.

---

## 2. Hiện trạng
- `wc -c scripts/test.sh` = 0; file được track từ commit `8a93225`.
- `docs/setup.md:399-401` mô tả script này chạy full test + coverage.
- Bộ test thật: `cd apps/api && uv run pytest -q` (318), `cd apps/web && pnpm test` (228), `python3 scripts/notes_index.py --check`.

---

## 3. Mục tiêu
- **Mục tiêu:** biến `scripts/test.sh` thành runner smoke test tối thiểu: notes check + BE pytest + FE test (offline, không khởi động Docker); exit code phản ánh đúng kết quả; cập nhật docs §5.3 bỏ cam kết coverage không có thật.
- **Out of Scope:** không đo coverage, không chạy `pnpm build` trong script (để script nhanh), không đụng code ứng dụng.

---

## 4. Giải pháp đề xuất
- Viết `scripts/test.sh` với `set -euo pipefail`, `cd "$ROOT"`, lần lượt:
  1. `python3 scripts/notes_index.py --check`
  2. `(cd apps/api && uv run pytest -q)`
  3. `(cd apps/web && pnpm test)`
  Mỗi bước echo ngắn bằng tiếng Việt; script inheriti exit code của lệnh fail đầu tiên.
- Sửa `docs/setup.md` §5.3: mô tả đúng 3 bước trên, ghi rõ script **không** đo coverage (bỏ câu ≥70%).
- Test offline `scripts/tests/test_test_script.py`: assert file không rỗng, có `set -euo pipefail`, có 3 lệnh trên; (không thực thi script trong unit test để tránh chạy 546 test lồng nhau).

---

## 5. Phương án đã cân nhắc
### A. Chỉ sửa docs bỏ hướng dẫn chạy script
Ưu: nhỏ nhất. Nhược: mất công cụ smoke test hữu ích. **Không chọn.**
### B. Điền script + sửa docs + test
Ưu: lệnh trong docs có tác dụng thật, fail loud. Nhược: script chạy ~10s. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | ~15 dòng shell |
| Hiệu năng | ~10s mỗi lần chạy | Chấp nhận được cho smoke test |
| Bảo trì | Tốt | Một lệnh kiểm chứng duy nhất |
| Độ tin cậy | Tốt | Exit code đúng thay vì false-positive |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `uv`/`pnpm` chưa cài trên máy mới | Trung bình | Trung bình | docs §1.4 đã yêu cầu; script fail rõ ràng thay vì im lặng |
| Test unit đọc script nhưng không chạy | Thấp | Thấp | Chỉ assert nội dung; smoke test thật do người dùng chạy |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Testcase:** `.agents/notes/testcase/2026-11-22-empty-test-script-thien.md`
- **Test tự động:** `scripts/tests/test_test_script.py` (mới, offline)
- **Lệnh:** `python3 -m unittest scripts/tests/test_test_script.py -v`; `bash scripts/test.sh` (phải exit 0 với 318 + 228 test); `notes_index --check`

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Ủy quyền tự động của người dùng trong chat. Nằm trong phạm vi setup/validation, không đụng secret hay wire contract.
Scope of Rejection: -

---

## 10. Next Action
Sinh đồng thời implemented/testcase, implement + test, validation, tự động tiếp tục workflow.
