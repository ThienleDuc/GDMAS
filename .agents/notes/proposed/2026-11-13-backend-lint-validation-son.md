<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md.
     QUY TẮC THẢ LỎNG §9: Bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả tự duyệt hoặc đồng đội)
     đều có thể điền Decision: Approved tại §9 — KHÔNG cần chờ ThienleDuc duyệt proposal.
     Agent chỉ điền §9 khi người dùng đang thao tác xác nhận rõ ràng trong chat (ghi chỉ thị vào Comments). -->

# Proposal: Hoàn tất lint/format toàn backend cho Task 4 của Sơn

## Metadata
- ID: 2026-11-13-backend-lint-validation-son
- Author: agent | son
- Created: 2026-11-13
- Type: refactor
- Status: approved
- Priority: medium
- Area: apps/api/ — lint/format, ranh giới lỗi API và worker
- Architecture Impact: docs/workflow.md, docs/task/son.md — quy ước lint/format và tiến độ Task 4; cấu hình Ruff cục bộ, không đổi API/schema hay kiến trúc 7 Terminals
  <!-- Nếu khác `none`: ghi rõ sự thật nào trong tài liệu đó sẽ thay đổi khi xong. Skill project-review dùng trường này để bắt drift. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/task/son.md (Task 4)
  - docs/workflow.md
  - docs/api/API.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md
- Related Bugs: BUG-son-006, BUG-son-007

---

## 1. Vấn đề
### Bối cảnh
Task 1–3 của `son` đã merge qua PR #4–#7. Toàn backend có 126 test offline pass (121 unit + 5 integration), nhưng Task 4 còn yêu cầu chạy xanh `ruff check .` và `ruff format --check .`.
### Vấn đề
Ruff 0.17.4 hiện báo 172 lỗi trên 24 tệp và 28 tệp cần format; hợp của hai danh sách là 31 tệp. Trong đó migration cũ `001_initial_gdmas_schema.py` có 5 lỗi lint và yêu cầu format, nhưng I4 cấm sửa lịch sử migration.
### Ảnh hưởng
Không thể ghi hoàn tất Task 4; lint toàn backend chưa làm cổng validation chung đáng tin cậy. Các tệp cần xử lý có cả API, model, config, DB và worker của thành viên khác nên cần duyệt phạm vi riêng.

---

## 2. Hiện trạng
- `apps/api/pyproject.toml` chưa khai báo cấu hình Ruff riêng; số liệu trên được quan sát bằng Ruff 0.17.4.
- Nhóm lỗi: import/type annotation/UTC alias và thứ tự exports; 5 B008 ở FastAPI Depends; 9 BLE001 và 4 S110 tại ranh giới lỗi; 4 F841 ở demo_seeder.
- Hai proposal đã duyệt trước chỉ giới hạn scope của PR Ingestion/Analysis, không bác bỏ xử lý lint trong đợt riêng. Không có quyết định Rejected/Scope of Rejection liên quan; không thay quyết định snapshot hay upsert, không cần Overrides.
- Các bug BUG-son-001..005 đều fixed. Chưa sửa mã nguồn/config cho proposal này; nhánh tài liệu `docs/2026-11-13-backend-lint-validation-son` chỉ chứa proposal Pending.

---

## 3. Mục tiêu
- **Mục tiêu:** hoàn tất tiêu chí lint/format của Task 4; toàn bộ test offline cũ và mới pass, `ruff check .` và `ruff format --check .` xanh theo cấu hình dự án có giải trình về migration bất biến.
- **Không nằm trong mục tiêu (Out of Scope):** thay API/payload, thêm worker/cron, sửa thuật toán 4 Patterns hay upsert, đổi schema/biến môi trường, thay dữ liệu demo, sửa frontend hoặc xử lý các lỗi nghiệp vụ ngoài lint.
- Không sửa `AGENTS.md`, `contracts/`, `docs/coding-rules.md`, `docs/quyuocchung.md` hay bất kỳ migration đã tồn tại. Không xóa tệp, bỏ test, dùng unsafe fixes hàng loạt hoặc làm xanh bằng ignore diện rộng.

---

## 4. Giải pháp đề xuất
### 4.1. Phạm vi nguồn cụ thể
30 tệp được phép xử lý lint/format sau khi proposal được duyệt:
- `apps/api/alembic/env.py`
- `apps/api/src/gdmas/api/dependencies.py`
- `apps/api/src/gdmas/api/router.py`
- `apps/api/src/gdmas/api/routes/earthquakes.py`
- `apps/api/src/gdmas/api/routes/patterns.py`
- `apps/api/src/gdmas/api/routes/statistics.py`
- `apps/api/src/gdmas/api/routes/stream.py`
- `apps/api/src/gdmas/core/config.py`
- `apps/api/src/gdmas/db/base.py`
- `apps/api/src/gdmas/db/connection.py`
- `apps/api/src/gdmas/main.py`
- `apps/api/src/gdmas/models/__init__.py`
- `apps/api/src/gdmas/models/analysis.py`
- `apps/api/src/gdmas/models/clustering.py`
- `apps/api/src/gdmas/models/earthquake.py`
- `apps/api/src/gdmas/models/prediction.py`
- `apps/api/src/gdmas/models/service_run.py`
- `apps/api/src/gdmas/schemas/__init__.py`
- `apps/api/src/gdmas/schemas/earthquake.py`
- `apps/api/src/gdmas/services/__init__.py`
- `apps/api/src/gdmas/services/analysis/__init__.py`
- `apps/api/src/gdmas/services/clustering/__init__.py`
- `apps/api/src/gdmas/services/clustering/runner.py`
- `apps/api/src/gdmas/services/demo_seeder.py`
- `apps/api/src/gdmas/services/ingestion/__init__.py`
- `apps/api/src/gdmas/services/ingestion/runner.py`
- `apps/api/src/gdmas/services/prediction/__init__.py`
- `apps/api/src/gdmas/services/prediction/runner.py`
- `apps/api/tests/integration/__init__.py`
- `apps/api/tests/unit/__init__.py`

Tệp cấu hình, test và tài liệu bổ sung:
- `apps/api/pyproject.toml`
- `apps/api/tests/fixtures/quality_contracts.json` (mới — snapshot hợp đồng API/ORM và hash bảo vệ)
- `apps/api/tests/unit/test_quality_boundaries.py` (mới — kiểm metadata/schema, chữ ký route và ranh giới lỗi bị sửa)
- `apps/api/tests/unit/test_worker_error_boundaries.py` (mới — worker tiếp tục sau lỗi và dừng sạch khi ngắt)
- `apps/api/tests/unit/test_api_error_boundaries.py` (mới — test lỗi DB/HTTP/SSE tách riêng khỏi kiểm hợp đồng)
- `docs/workflow.md`, `docs/task/son.md`
- `.agents/notes/proposed/2026-11-13-backend-lint-validation-son.md`
- `.agents/notes/implemented/2026-11-13-backend-lint-validation-son/{plan.md,status.md}`
- `.agents/notes/testcase/2026-11-13-backend-lint-validation-son.md`
- Bug log mới nếu test phát hiện lỗi, theo template và số ID tiếp theo.

### 4.2. Hai đợt đã được duyệt
- **Đợt 1 — refactor/2026-11-13-backend-lint-validation-son:** format/import/typing, cấu hình ngoại lệ đúng migration bất biến và FastAPI Depends. Chụp hợp đồng OpenAPI/ORM/default config và kiểm trước/sau; không sửa nhánh except/logging hay bỏ biến có side effect. PR đợt 1 được phép còn đúng nhóm lỗi đã phân loại để đợt 2; không ignore các nhóm lỗi đó.
- **Đợt 2 — fix/2026-11-13-backend-lint-validation-son:** sau khi PR đợt 1 merge, sửa ngoại lệ/logging, biến thừa và các lint còn lại; thêm test lỗi API và vòng worker. Full pytest, Ruff check/format phải xanh trước merge.
- Chỉ ghi completed khi cả hai đợt đã merge; cập nhật tiến độ theo từng PR. Tệp lõi chỉ thay bảo trì tương thích; migration cũ nguyên vẹn.

### 4.3. Cách xử lý
1. Sửa import, annotation hiện đại và alias UTC; format có chọn lọc theo danh sách trên. Giữ nguyên hàm, tham số bắt buộc, response và cột ORM. Import có side effect đăng ký model trong Alembic phải được giữ và đánh dấu chủ đích cục bộ khi cần.
2. Với FastAPI Depends, cấu hình `flake8-bugbear.extend-immutable-calls` cho đúng lời gọi dependency an toàn; không đổi chữ ký endpoint chỉ để né B008, không tắt B008 toàn dự án.
3. Rà soát từng BLE001/S110: dùng ngoại lệ cụ thể khi hợp lệ, hoặc ghi log an toàn và giải trình catch-all tại ranh giới worker/API. Không log credential, raw connection string hay dữ liệu nhạy cảm; giữ hành vi phục hồi hiện có. Không thêm noqa hàng loạt.
4. Bỏ biến không dùng nhưng giữ lời gọi có side effect (ví dụ vẫn chạy ingestion.execute_cycle dù không cần gán kết quả). Giữ hàm/caller và dữ liệu demo hiện hữu.
5. I4: thêm ngoại lệ lint/format **chỉ cho đường dẫn chính xác** `alembic/versions/001_initial_gdmas_schema.py` trong Ruff cục bộ; không dùng glob bỏ toàn bộ migrations, không sửa migration cũ. Migration mới vẫn chịu lint/format. Kiểm diff/hash chuẩn hóa LF trước/sau để xác nhận tệp cũ nguyên vẹn và ghi lý do vào workflow.
6. `main.py`, `db/base.py`, `db/connection.py`, `core/config.py` chỉ được sửa import/typing/format trong scope này; không đổi lifecycle, SessionLocal/get_db hay giá trị cấu hình. Việc duyệt proposal bao gồm đúng phạm vi bảo trì này. Model chỉ đổi biểu diễn type/import, không đổi metadata DB.
7. I1–I7 vẫn áp dụng: tách Terminals, không breaking caller, UTC/WGS84, migration cũ nguyên vẹn, không thay API bằng mock, không secrets, không mất test.

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ kiểm lint trên diff như hai PR trước
Ưu: phạm vi nhỏ. Nhược: không hoàn tất tiêu chí toàn backend của Task 4; lỗi nền vẫn che lỗi mới. Không chọn cho đợt này.
### Phương án B: Bảo trì có kiểm soát và ngoại lệ đúng migration bất biến (chọn)
Ưu: đạt gate toàn backend mà giữ I4; có scope/test cho phần xử lý lỗi và tệp lõi. Nhược: diff khoảng 30 tệp, cần review kỹ import side effect và behavior.
### Phương án C: Sửa/format migration cũ hoặc ignore hàng loạt rule
Không chọn: sửa migration vi phạm I4; ignore diện rộng làm mất ý nghĩa validation. Chỉ miễn đúng migration đã tồn tại, có guard xác nhận không đổi.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Bảo trì khoảng 30 tệp + cấu hình/test/docs | Phạm vi cụ thể thay vì sửa lan ngoài PR |
| Hiệu năng | Không đổi | Không thay thuật toán, truy vấn hay lifecycle |
| Bảo trì / Open-Closed | Giữ caller, route và metadata ORM | Chủ yếu import/typing/format; ranh giới lỗi có test hồi quy |
| Độ tin cậy | Gate lint/format toàn backend xanh | Ngoại lệ duy nhất cho migration bất biến được giải trình và kiểm nguyên vẹn |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Bỏ import có side effect đăng ký model | Trung bình | Cao | Rà soát Alembic/models; test metadata; không unsafe-fix |
| Annotation làm đổi FastAPI schema/chữ ký | Thấp | Cao | Giữ tham số/default; kiểm OpenAPI và endpoint với dependency giả lập |
| Catch/log làm đổi phục hồi hoặc lộ credential | Trung bình | Cao | Test ranh giới lỗi, nội dung log và worker retry; thông báo đã làm sạch |
| Autoformat chạm migration cũ | Trung bình | Cao | Ngoại lệ chính xác một tệp, kiểm diff/hash trước/sau; không chỉnh migration |
| Đụng mã vùng tai/van hoặc tệp lõi | Cao | Trung bình | Chỉ phạm vi đã liệt kê và bảo trì tương thích; báo vùng liên quan trong PR; scope/conflict gate |
| Ruff mới đổi mặc định so với 0.17.4 | Trung bình | Trung bình | Ghi phiên bản thực chạy, kiểm cấu hình hiệu lực và kết quả đầy đủ; không mở rộng dependencies ngoài scope |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-13-backend-lint-validation-son.md` (copy từ template), cùng `implemented/2026-11-13-backend-lint-validation-son/{plan.md,status.md}`.
- **Code test tự động offline:** `apps/api/tests/unit/test_quality_boundaries.py` và `apps/api/tests/unit/test_worker_error_boundaries.py`.
- Kiểm metadata DB và API không đổi sau bảo trì typing/import; lỗi query được xử lý/log an toàn, worker tiếp tục sau lỗi và dừng sạch khi ngắt; mock toàn bộ mạng/USGS/DB ngoài.
- Giữ nguyên toàn bộ 126 test cũ và chạy full `cd apps/api && uv run pytest`; không xóa/skip hay giảm assertion.
- Chạy `uv run ruff check .` và `uv run ruff format --check .` toàn backend, cùng notes_index --check, git-ship scope và project-review.
- Xác nhận `git diff -- apps/api/alembic/versions/` rỗng; đối chiếu hash chuẩn hóa LF của migration cũ trước/sau. Không đổi model metadata, route/payload hay cấu hình runtime.
- Môi trường hiện tại dùng được `.venv/Scripts/python.exe -m pytest` và `-m ruff` nếu lệnh uv chưa có trong PATH; ghi đúng lệnh/phiên bản và kết quả thực tế.

---

## 9. Human Review
Decision: Approved
Reviewer: son
Review Date: 2026-11-13
Comments: son xác nhận trong chat "oke tôi chấp nhận đề xuât chia thành hai đợt này"; duyệt phạm vi proposal với đợt 1 format/import/typing và đợt 2 ngoại lệ/logging có test riêng, mỗi đợt một PR.
Scope of Rejection: -

---

## 10. Next Action
Proposal đã Approved theo xác nhận son trong chat. Tạo đồng thời implemented/testcase từ template, triển khai đợt 1 trên nhánh refactor/2026-11-13-backend-lint-validation-son; sau review và merge mới bắt đầu đợt 2.

### Revision 2026-11-13
- Ghi nhận duyệt theo phương án hai đợt; giữ nguyên phạm vi nguồn đã trình bày.
- Bổ sung snapshot hợp đồng và kiểm tra trước/sau để giảm rủi ro tệp lõi/import có side effect.

---
