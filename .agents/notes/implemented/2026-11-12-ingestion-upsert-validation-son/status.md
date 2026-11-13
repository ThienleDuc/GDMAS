# Implementation Status: Upsert thực thụ, kiểm tra dữ liệu đầu vào và chịu lỗi cho Ingestion Service (T2)

## Metadata
- ID: 2026-11-12-ingestion-upsert-validation-son
- Status: validation
- Started: 2026-11-12
- Last Updated: 2026-11-13
- Owner: agent | son

---

## Tiến độ
Progress: 95%
Current Phase: Đã sửa finding và qua validation — hoàn tất PR, kiểm tra conflict và merge

Completed:
- Step 1 — `parser.py`: `parse_feature`, `parse_features`, kiểm tra WGS84 / magnitude / time, timestamp UTC
- Step 2 — `upsert.py`: `build_upsert_statement` (ON CONFLICT ON CONSTRAINT `uq_earthquake_source_event`, WHERE theo ERD §4, `RETURNING (xmax = 0)`), `deduplicate_rows`, `upsert_events`
- Step 3 — `service.py`: `FeedUnavailableError`, `_fetch_geojson_strict`, `_fetch_features`, `summarize_error`; `execute_cycle` ghi `FAILED` khi cả 2 URL lỗi; giữ nguyên chữ ký cũ
- Step 4 — 56 unit test offline pass
- Step 5 — Sửa BUG-son-001/002/003; bổ sung TC-17..TC-20, tổng 77 unit test offline pass; cập nhật SAD và 3 bug log từ template.
In Progress:
- review-pr Phần B: commit, merge-forward develop, push, kiểm tra conflict/checks và merge PR.
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-ingestion-upsert-validation-son.md` + 3 file `tests/unit/test_ingestion_*.py` |
| Test liên quan (`pytest`) | PASS | 2026-11-13: `.venv/Scripts/python.exe -X utf8 -m pytest tests/unit -q -p no:cacheprovider -o asyncio_default_fixture_loop_scope=function` → 77 passed; trước sửa hồi quy parser/service có 17 failed, 52 passed |
| Lint / Build (`ruff`) | PASS (trên file đã đụng) | Check/format cả 7 file code/test trong diff sạch. Toàn repo còn 174 lỗi trên 25 file và 29 file chưa format; không file nào có lỗi lint thuộc diff, không sửa ngoài scope |
| Notes check (`notes_index.py --check`) | PASS | |
| Tích hợp PostgreSQL thật (Docker T1) | PASS | `alembic upgrade head` có `uq_earthquake_source_event`; USGS `all_month` lần 1: +9847 (8.5s, 20 batch); sửa tay 3 dòng rồi nạp lại: `updated=2`, `unchanged=9844` — dòng `source_updated_at` cũ hơn và dòng NULL được khôi phục, dòng mới hơn giữ nguyên; 0 dòng trùng; cả 2 URL lỗi → run `FAILED`, thông báo ≤ 200 ký tự |
| Tài liệu cập nhật | PASS | SAD §4.2 và cây mã nguồn phản ánh parser/upsert, quy tắc ID/độ sâu/số tràn; không đổi API/schema |
| Project-review | PASS (local) | I1–I7, OCP/Churn, testcase, quyết định và scope sạch; 3 finding đã có test hồi quy. Kiểm tra conflict remote thực hiện trước merge |

---

## Known Issues
- none — đã kiểm tích hợp trên PostgreSQL 16 thật (xem bảng Validation).
- Gợi ý ngoài phạm vi: parser chỉ kiểm `magnitude` là số hữu hạn, chưa chặn giá trị phi lý (vd. > 10); có thể bổ sung ở proposal sau nếu nhóm cần.

---

## Deviations From Plan
- Dự kiến: chỉ tạo 3 file test. Thực tế: sửa thêm `apps/api/tests/conftest.py` (trước đó rỗng). Lý do: dự án src-layout không cài package nên pytest không import được `gdmas`. Quyết định: thêm `src/` vào `sys.path` trong conftest (chỉ ảnh hưởng test), đã bổ sung vào In Scope.
- `FeedUnavailableError` đặt trong `ingestion/service.py` thay vì `core/exceptions.py` để không chạm `core/**`.
- 2026-11-13: người dùng yêu cầu sửa 3 finding trước merge; bổ sung SAD và 3 bug log vào In Scope, giữ nguyên API/schema/runner. Test kỳ vọng cắt ID được cập nhật theo yêu cầu sửa BUG-son-001; không bỏ hay skip test cũ.

---

## Decisions Made During Implementation
- `__init__` nhận thêm keyword-only `session_factory`, `http_transport` (mặc định như cũ) để test offline không cần patch module.
- Nguồn chính trả 200 nhưng rỗng → thử fallback; fallback lỗi thì vẫn `SUCCESS` với 0 bản ghi (nguồn chính vẫn khả dụng).
- Bỏ feature thiếu `time` thay vì gán `now()` (tránh lệch chuỗi thời gian).
- `except Exception` trong `execute_cycle` giữ có chủ đích (`# noqa: BLE001`) để worker không crash.
- ID quá dài bị loại; độ sâu chỉ mặc định 0.0 khi không có phần tử thứ ba, giá trị đã cung cấp nhưng không hợp lệ bị loại.
- Số nguyên vượt miền float được xử lý tại hàm ép số; lỗi ở trường bắt buộc chỉ loại feature, trường updated tùy chọn giữ hành vi None.

---

## Next Actions
- review-pr Phần B: scope → project-review → commit → update → push → kiểm 0 conflict.

---

## Last Update
2026-11-13 — Đã sửa 3 finding, kiểm chứng 77 test offline, cập nhật SAD/testcase/bug logs; giữ `validation` chờ kiểm tra remote và merge.
