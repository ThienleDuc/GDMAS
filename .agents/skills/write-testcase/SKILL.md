---
name: write-testcase
description: >-
  Kỹ năng tạo đặc tả testcase trong .agents/notes/testcase/<id>.md (từ _TEMPLATE.md) và viết
  unit/integration test chạy offline cho 2 luồng:
  (1) Đồng thời sinh cùng implemented/<id>/ ngay khi Proposal được duyệt §9 Approved;
  (2) Workflow riêng kiểm thử 1 file cụ thể theo yêu cầu người dùng: checkout nhánh mới trước
  (./scripts/git-ship.sh start test/<id>) -> viết unit test -> chạy test -> nếu ra lỗi ghi
  vào .agents/notes/bugs/BUG-<handle>-NNN-<slug>.md -> đẩy PR qua review-pr.
---

# write-testcase

Khuôn mẫu chuẩn: [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md).
Nhật ký lỗi: [.agents/notes/bugs/README.md](../../../.agents/notes/bugs/README.md).
Quy trình: [docs/agent-workflow.md](../../../docs/agent-workflow.md).

## Quy tắc tương tác & An toàn (giảm bấm submit)

- **Tự động thêm/sửa không hỏi lặp lại:** Tự động tạo/cập nhật file testcase `.agents/notes/testcase/<id>.md`, file unit test và file bug log trong `.agents/notes/bugs/` mà không hỏi xác nhận từng file.
- **Không tự ý sửa/xóa mã nguồn gốc khi kiểm thử file lẻ:** Ở luồng kiểm thử 1 file cụ thể, chỉ đọc file mục tiêu và viết test + bug log (không sửa code gốc trừ khi người dùng yêu cầu sửa luôn; không xóa file/folder).
- **Offline 100% (I7):** Mọi unit test phải mock HTTP/USGS/DB ngoài, không gọi mạng thật.

---

## Luồng 1: Đồng thời khi Proposal được duyệt (`Mode: proposal-paired`)

Kích hoạt song song cùng `build-implementation` ngay khi `.agents/notes/proposed/<id>.md` đạt `Decision: Approved` tại §9:

1. **Sinh đồng thời `.agents/notes/testcase/<id>.md`:**
   - Copy [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md) sang `.agents/notes/testcase/<id>.md`.
   - Điền `ID: <id>`, `Mode: proposal-paired`, `Proposal: .agents/notes/proposed/<id>.md`, `Target`, `Test File`, `Status: ready`.
   - Thiết kế bảng `TC-01..TC-NN` phủ: Happy Path, Empty DB (Demo §4), Boundary (UTC & WGS84), Error/Failure.
2. **Viết mã nguồn test tự động (khi/sau khi code xong):**
   - Tạo `apps/api/tests/unit|integration/test_<slug>.py` (hoặc `scripts/tests/test_<slug>.py` / FE test).
3. **Chạy test & chốt kết quả:**
   - Chạy thật lệnh test (`uv run pytest ...` hoặc `python3 -m unittest ...`).
   - Cập nhật kết quả vào bảng Test Cases & Mục 4 trong `.agents/notes/testcase/<id>.md`:
     - Nếu tất cả pass → `Status: passed`.
     - Nếu phát hiện lỗi chưa khắc phục được → ghi bug vào `.agents/notes/bugs/` và đặt `Status: failed_with_bugs`.

---

## Luồng 2: Workflow kiểm thử riêng 1 file cụ thể (`Mode: single-file-test`)

Kích hoạt khi người dùng yêu cầu kiểm thử / viết unit test cho **một tệp cụ thể** (vd. *"kiểm thử file `apps/api/src/gdmas/services/analysis/runner.py`"*):

1. **BƯỚC 1 (Bắt buộc trước tiên) — Checkout sang nhánh mới từ `develop`:**
   - Lấy `<handle>` từ `./scripts/git-ship.sh me` (hỏi 1 lần theo `.agents/team.md` nếu chưa đặt).
   - Chuẩn hóa `<file-slug>` bằng Slug Engine (tên file không đuôi, chữ thường, nối bằng `-`).
   - Đặt `<id>` = `yyyy-mm-dd-test-<file-slug>-<handle>`.
   - Chạy `./scripts/git-ship.sh start test/<id>` để tách nhánh mới từ `origin/develop`.
   - **Tuyệt đối không viết test hay commit trực tiếp trên `develop` hay `main`.**

2. **BƯỚC 2 — Đọc file mục tiêu & tạo `.agents/notes/testcase/<id>.md`:**
   - Đọc kỹ file mục tiêu, kiểu dữ liệu đầu vào/đầu ra, ngoại lệ, và đối chiếu 7 Bất biến I1–I7 ([docs/coding-rules.md](../../../docs/coding-rules.md)).
   - Copy [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md) sang `.agents/notes/testcase/<id>.md`:
     - `Mode: single-file-test`, `Proposal: none`, `Target: <đường_dẫn_file_mục_tiêu>`, `Status: ready`.

3. **BƯỚC 3 — Viết Unit Test tự động cho file mục tiêu:**
   - Tạo file test tương ứng (vd. `apps/api/tests/unit/test_<tên_module>.py` hoặc `scripts/tests/test_<tên_module>.py`), mock toàn bộ mạng/DB/service ngoài.
   - Viết đủ các nhóm test case: Happy Path, Empty/Null/NaN input (Demo §4), Boundary (UTC ISO 8601 `Z`, WGS84 lat/lon), Error/Exception cases.

4. **BƯỚC 4 — Chạy Unit Test & Ghi lỗi vào `.agents/notes/bugs/` nếu phát hiện lỗi:**
   - Thực thi lệnh chạy test thực tế (vd. `cd apps/api && uv run pytest tests/unit/test_<tên_module>.py -v`, hoặc `python3 -m unittest ...`).
   - **Nếu mọi test PASS:** cập nhật bảng kết quả + Mục 4 trong `.agents/notes/testcase/<id>.md` và đặt `Status: passed`.
   - **Nếu test phát hiện lỗi (bug trong mã nguồn của file mục tiêu):**
     1. Xem số thứ tự tiếp theo của `<handle>` qua `python3 scripts/notes_index.py --bugs`.
     2. Tạo file **`.agents/notes/bugs/BUG-<handle>-NNN-<slug>.md`** từ [.agents/notes/bugs/_TEMPLATE.md](../../../.agents/notes/bugs/_TEMPLATE.md) (`Status: open`, ghi rõ `Severity`, `Area: <file_mục_tiêu>`, `Triệu chứng`, `Tái hiện` bằng chính lệnh unit test vừa viết, `Nguyên nhân gốc: <file:dòng>`).
     3. Nếu phát hiện lỗi mức **`critical`**: dòng đầu báo cáo phải là `CRITICAL BUG: BUG-<handle>-NNN — <tiêu đề>`.
     4. Cập nhật `.agents/notes/testcase/<id>.md`: đặt `Status: failed_with_bugs`, `Related Bugs: BUG-<handle>-NNN`, ghi rõ log fail ở Mục 4 & Mục 5.
     *(Không tự ý sửa code gốc đang kiểm thử trừ khi người dùng yêu cầu sửa luôn; giữ nguyên unit test tái hiện lỗi.)*

5. **BƯỚC 5 — Kiểm tra nhất quán & Đẩy PR (`review-pr` Phần B):**
   - Chạy `python3 scripts/notes_index.py --check`.
   - Chuyển giao sang `review-pr` Phần B (`project-review`, commit `test(<scope>): bổ sung unit test cho <file> (<id>)`, `update`, `push` nhánh `test/<id>` & kiểm tra không xung đột trước khi merge PR).

## Skill này không làm

Không tự sửa code sản phẩm ngoài phạm vi khi đang ở chế độ kiểm thử 1 file lẻ; không merge khi còn xung đột (`CONFLICT`).

