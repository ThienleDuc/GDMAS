<!-- Template cho .agents/notes/testcase/2026-11-13-backend-lint-validation-son.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md & .agents/skills/write-testcase/SKILL.md.
     Dùng cho cả 2 luồng:
       (1) Mode: proposal-paired — sinh đồng thời với implemented/<id>/ khi Proposal §9 Approved.
       (2) Mode: single-file-test — kiểm thử riêng 1 file cụ thể (checkout nhánh test/<id> -> viết unit test -> lỗi đưa vào .agents/notes/bugs/). -->

# Testcase: Bảo vệ hợp đồng và ranh giới lỗi backend

## Metadata
- ID: 2026-11-13-backend-lint-validation-son
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-13-backend-lint-validation-son.md
- Target: apps/api/
- Test File: apps/api/tests/unit/test_quality_boundaries.py, apps/api/tests/unit/test_worker_error_boundaries.py, apps/api/tests/unit/test_api_error_boundaries.py
- Author: agent | son
- Created: 2026-11-13
- Status: passed
- Related Bugs: BUG-son-006, BUG-son-007

---

## 1. Mục tiêu & Ràng buộc kiểm thử
Bảo vệ OpenAPI, metadata ORM, mặc định config, import đăng ký model và migration khi bảo trì; kiểm offline việc worker phục hồi/dừng và API xử lý lỗi/logging ở đợt 2. Tuân thủ I1–I7, không gọi USGS/DB ngoài, không bỏ test cũ.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- `quality_contracts.json` chụp trước khi sửa code: hợp đồng OpenAPI/ORM/exports, hash mặc định config và migration (chuẩn hóa LF).
- Không lưu credential/default config nguyên văn; fixture chỉ chứa digest cho phần config.
- Mock DB/HTTP/time.sleep; không gọi mạng thật. Đợt 2 thêm trường hợp lỗi an toàn và KeyboardInterrupt.

---

## 3. Ma trận Kịch bản Test Cases
| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| TC-01 | OpenAPI trước/sau | Đợt 1 | Sinh schema không gọi DB | Hợp đồng endpoint giữ nguyên | PASS |
| TC-02 | ORM/exports | Đợt 1 | Import model, biên dịch metadata PostgreSQL | Bảng/cột/index/FK và exports không đổi | PASS |
| TC-03 | Config/migration | Đợt 1 | So hash mặc định và migration LF | Nguyên vẹn, không lưu secret vào fixture | PASS |
| TC-04 | 126 test hiện có | Cả hai | Full pytest offline | Không mất/skip test cũ | PASS |
| TC-05 | Worker retry/dừng | Đợt 2 | Lỗi chu kỳ + ngắt chờ, worker tai/van ngắt như cũ | Tiếp tục đúng chu kỳ, ngắt sạch, không in credential giả | PASS |
| TC-06 | API lỗi/logging | Đợt 2 | Query/HTTP lỗi, payload hỏng, queue đầy/lỗi lập trình | Giữ response lỗi dự kiến, log an toàn; lỗi ngoài dự kiến không bị nuốt | PASS |
| TC-07 | Quality gates | Cả hai | Ruff/format, AST nhánh except đợt 1, notes/scope/conflict | Không lẫn hai đợt; cuối đợt 2 full lint xanh | PASS (local; remote trước merge) |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

- Ngày chạy cuối: 2026-11-13, đợt 2.
- Toàn backend: **149 passed, 1 warning in 5.00s**, giữ 126 test ban đầu. Cảnh báo Starlette TestClient/httpx là deprecation, không sửa dependency ngoài scope.
- Trước sửa đợt 2: test mới có 10 failed, 3 passed; sau sửa 13 test đó pass. Bổ sung 5 trường hợp payload hỏng/lỗi ngoài dự kiến, tổng 18 test ranh giới lỗi mới.
- Ruff check toàn backend: All checks passed; format: 54 files already formatted. OpenAPI/ORM/exports/config/migration tiếp tục giữ nguyên, toàn bộ test offline.
- Đợt 1 trước sửa: 5 test bảo vệ mới pass; sau sửa toàn backend 131 passed in 5.16s, chạy offline với `-W error::FutureWarning`.
- Format toàn backend sạch (52 tệp), lint I/UP/F401/RUF022 sạch; full lint còn đúng 19 lỗi để đợt 2 (BLE001=9, S110=4, F841=4, F541=1, PIE790=1).
- Cuối đợt 1, AST ngoại lệ không đổi sau chuẩn hóa alias UTC; snapshot OpenAPI/ORM/exports và hash config/migration pass. Khi đó testcase vẫn ready vì TC-05/06 chưa chạy; hiện các ca này đã pass ở đợt 2.
- Baseline: 126 test offline pass ở PR #6; 172 lỗi lint, 28 tệp cần format trước đợt 1.
- Windows có thể dùng `.venv/Scripts/python.exe -X utf8 -m pytest`/`-m ruff`; ghi đúng lệnh và kết quả mỗi đợt.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- BUG-son-006 — ngắt trong lúc chờ retry không dừng sạch; fixed, có test KeyboardInterrupt/SystemExit.
- BUG-son-007 — log ngoại lệ nguồn có thể giữ URL/credential; fixed, kiểm bằng credential giả và mock, không dùng credential thật.

---
