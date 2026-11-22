<!-- Proposal sinh tự động từ audit đối chiếu FE↔BE API Service ngày 2026-11-22 (nhánh chore/fe-be-api-linkage-audit). -->

# Proposal: Đồng bộ `API.md` với payload/query thật: enum trạng thái service và tham số `search`

## Metadata
- ID: 2026-11-22-api-md-params-status-drift-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: docs
- Status: approved
- Priority: low
- Area: `docs/api/API.md`, `scripts/tests/test_api_docs_contracts.py`
- Architecture Impact: docs/api/API.md
  <!-- Sự thật thay đổi trong docs/api/API.md: §3.1 bổ sung giá trị `running` vào enum trạng thái service; §3.2 bổ sung tham số `search` của GET /earthquakes. Không đổi BE/FE. -->
- Related Docs:
  - docs/api/API.md §2, §3.1, §3.2
  - contracts/README.md §3.8
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-api-docs-contract-sync-thien.md (đồng bộ API.md lần trước — proposal này là phần bổ sung, không thay thế)
  - .agents/notes/proposed/2026-11-22-system-status-fields-thien.md (GAP-12)
  - .agents/notes/proposed/2026-11-20-earthquakes-catalog-filter-thien.md (nguồn param `search`)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Audit FE↔BE ngày 2026-11-22 đối chiếu 19 endpoint T6, 14 service T7 và `docs/api/API.md`. Path và field chính khớp nhau; còn 2 điểm tài liệu lệch với implementation mà cả BE lẫn FE đang dùng.

### Vấn đề
1. **Enum trạng thái service thiếu `running`.** `docs/api/API.md` §3.1 (dòng 139) ghi: "`status` của mỗi service nhận một trong các giá trị: `active`, `idle`, `error`, `unknown`". Thực tế BE `system.py:86` trả `postgres: {"status": "running"}`; FE `contracts/system-status.ts:7-13` khai báo `running` (và `stopped`) trong `ServiceHealth`, và `apps/web/tests/terminal-status.test.ts` TC-02/TC-05 assert `"running"` là giá trị hợp lệ. Tài liệu là bên sai.
2. **Thiếu tham số `search` của `GET /api/v1/earthquakes`.** Bảng query params §3.2 không liệt kê `search`, nhưng BE `earthquakes.py:63` hỗ trợ (ilike trên `place`/`source_event_id`) và FE `QueryEarthquakeParams.search` + `getEarthquakes()` gửi param này (dù các page hiện chưa dùng).

### Ảnh hưởng
- Client mới chỉ đọc API.md sẽ không biết có `search` và sẽ hiểu sai `running` là trạng thái không hợp lệ → có thể reject payload đúng.
- `scripts/tests/test_api_docs_contracts.py` hiện kiểm tra key của API.md nhưng chưa chặn 2 drift này, nên lặp lại lỗi ở các lần sync sau.

---

## 2. Hiện trạng
- `docs/api/API.md:139` — enum 4 giá trị, thiếu `running`.
- `apps/api/src/gdmas/api/routes/system.py:86` — `services = {"postgres": {"status": "running"}}`.
- `apps/web/src/contracts/system-status.ts:7-13` — `ServiceHealth` gồm `running`, `active`, `idle`, `stopped`, `error`, `unknown`.
- `docs/api/API.md:149-163` — bảng param `/earthquakes` không có `search`.
- `apps/api/src/gdmas/api/routes/earthquakes.py:63` — `search: str | None = Query(None, ...)`.
- `apps/web/src/contracts/earthquake.ts:98` và `earthquake-api.ts:92` — FE có `search`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. `docs/api/API.md` §3.1 liệt kê `running` (kèm ghi chú `stopped` là alias FE chấp nhận) đúng với BE/FE.
  2. `docs/api/API.md` §3.2 bổ sung dòng `search` với kiểu `string`, không bắt buộc, mô tả lỗi theo `place`/`source_event_id`.
  3. `scripts/tests/test_api_docs_contracts.py` có test chặn 2 drift trên (đọc file docs, offline).
- **Không nằm trong mục tiêu (Out of Scope):** không đổi code BE/FE, không đổi enum runtime, không đổi schema `contracts/`, không viết lại toàn bộ API.md.

---

## 4. Giải pháp đề xuất
- Sửa 2 đoạn trong `docs/api/API.md` (giữ nguyên cấu trúc, ngôn ngữ tiếng Việt): dòng enum ở §3.1 và 1 dòng mới trong bảng §3.2 sau `max_depth`.
- Bổ sung 2 test vào `scripts/tests/test_api_docs_contracts.py` (đã tồn tại): assert API.md chứa `"running"` trong mô tả enum service và chứa `| \`search\` |` trong bảng param earthquakes.
- Không tạo file mới; không đụng wire contract.

---

## 5. Phương án đã cân nhắc
### Phương án A: Đổi BE `postgres.status` thành `"active"` cho khớp docs
Ưu: docs giữ nguyên. Nhược: phá test `terminal-status.test.ts` TC-02/05, đổi nhãn UI từ "Đang chạy" sang "Hoạt động", đụng vùng BE/T6 (chủ vùng `tai`) mà không có lỗi chức năng. **Không chọn.**
### Phương án B: Cập nhật docs theo implementation thật
Ưu: docs là nguồn mô tả duy nhất cần sửa; BE/FE đã đồng nhất với nhau; rủi ro thấp nhất. Nhược: phải nhớ sync test docs. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Rất thấp | 2 dòng docs + 2 assert |
| Hiệu năng | Không đổi | Chỉ đọc file lúc test |
| Bảo trì / Open-Closed | Tốt | Không sửa code, chỉ bổ sung tài liệu |
| Độ tin cậy | Tốt | Test docs bắt drift ngay lần sau |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| API.md có chỗ khác cũng nhắc enum cũ | Thấp | Thấp | grep `active.*idle.*error.*unknown` trước khi sửa, cập nhật cùng chỗ |
| Test docs quá cứng gây fail khi đổi wording | Thấp | Thấp | Assert theo token (`running`, `` `search` ``) không assert cả câu |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-api-md-params-status-drift-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `scripts/tests/test_api_docs_contracts.py` *(mở rộng — đọc `docs/api/API.md`, không gọi mạng)*.
- **Cách kiểm chứng:** `python3 -m pytest scripts/tests/test_api_docs_contracts.py -q`; `python3 scripts/notes_index.py --check`; `cd apps/web && pnpm test && pnpm build`; `cd apps/api && uv run pytest -q` (đảm bảo không hồi quy).

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận rõ "Duyệt cả 3 (Recommended)" trong chat sau báo cáo audit FE↔BE 2026-11-22. Duyệt phạm vi §4 — chỉ cập nhật docs/api/API.md + test docs, không đổi code BE/FE. Triển khai trên nhánh chore/fe-be-api-linkage-audit theo yêu cầu "checkout từ develop ra nhánh mới" của người dùng.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 (bất kỳ handle trong `.agents/team.md`) rồi `build-implementation`; sinh đồng thời `implemented/<id>/{plan.md,status.md}` và `testcase/<id>.md`.
