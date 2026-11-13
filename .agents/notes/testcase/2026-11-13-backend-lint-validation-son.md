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
- Test File: apps/api/tests/unit/test_quality_boundaries.py, apps/api/tests/unit/test_worker_error_boundaries.py
- Author: agent | son
- Created: 2026-11-13
- Status: ready
- Related Bugs: none

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
| TC-04 | 126 test hiện có | Cả hai | Full pytest offline | Không mất/skip test cũ | PASS (đợt 1) |
| TC-05 | Worker retry/dừng | Đợt 2 | Lỗi chu kỳ + ngắt chờ | Tiếp tục đúng chu kỳ, ngắt sạch | NOT_RUN |
| TC-06 | API lỗi/logging | Đợt 2 | Query lỗi, credential giả trong exception | Giữ response, log an toàn, không nuốt lỗi im lặng | NOT_RUN |
| TC-07 | Quality gates | Cả hai | Ruff/format, AST nhánh except đợt 1, notes/scope/conflict | Không lẫn hai đợt; cuối đợt 2 full lint xanh | NOT_RUN |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

- Ngày chạy cuối: 2026-11-13, đợt 1.
- Đợt 1 trước sửa: 5 test bảo vệ mới pass; sau sửa toàn backend 131 passed in 5.16s, chạy offline với `-W error::FutureWarning`.
- Format toàn backend sạch (52 tệp), lint I/UP/F401/RUF022 sạch; full lint còn đúng 19 lỗi để đợt 2 (BLE001=9, S110=4, F841=4, F541=1, PIE790=1).
- AST ngoại lệ trước/sau không đổi sau chuẩn hóa alias UTC; snapshot OpenAPI/ORM/exports, hash config/migration đều pass. Testcase vẫn ready vì TC-05/06 của đợt 2 chưa chạy.
- Baseline: 126 test offline pass ở PR #6; 172 lỗi lint, 28 tệp cần format trước đợt 1.
- Windows có thể dùng `.venv/Scripts/python.exe -X utf8 -m pytest`/`-m ruff`; ghi đúng lệnh và kết quả mỗi đợt.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none; nếu phát hiện bug mới, tạo bug log theo template và cập nhật tại đây.

---
