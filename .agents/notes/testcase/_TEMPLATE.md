<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md & .agents/skills/write-testcase/SKILL.md.
     Dùng cho cả 2 luồng:
       (1) Mode: proposal-paired — sinh đồng thời với implemented/<id>/ khi Proposal §9 Approved.
       (2) Mode: single-file-test — kiểm thử riêng 1 file cụ thể (checkout nhánh test/<id> -> viết unit test -> lỗi đưa vào .agents/notes/bugs/). -->

# Testcase: <Tên bộ kiểm thử / Tên file mục tiêu>

## Metadata
- ID: yyyy-mm-dd-<slug>-<handle>
- Mode: proposal-paired   <!-- proposal-paired | single-file-test -->
- Proposal: .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md   <!-- hoặc `none` khi Mode: single-file-test -->
- Target: <file hoặc module được kiểm thử, vd. apps/api/src/gdmas/services/analysis/runner.py>
- Test File: <apps/api/tests/unit/test_<module>.py | scripts/tests/test_<module>.py | FE test>
- Author: agent | <handle>
- Created: yyyy-mm-dd
- Status: draft   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none   <!-- hoặc danh sách BUG-<handle>-NNN trong .agents/notes/bugs/ nếu test phát hiện lỗi -->

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Mô tả ngắn gọn hàm, class, endpoint hoặc luồng cần kiểm tra trong `Target`.
- **Ràng buộc GDMAS liên quan:**
  - [ ] Tách biệt 7 Terminals (I1 — không nhúng worker vào `main.py`).
  - [ ] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [ ] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [ ] Unit test chạy **offline 100%** (mock HTTP/USGS/DB ngoài — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `<mô tả fixture giả lập, dữ liệu UTC & WGS84>`
```json
{
  "sample_event": {
    "source_event_id": "us_test_001",
    "event_time": "2026-11-11T00:00:00Z",
    "latitude": 38.29,
    "longitude": 142.38,
    "depth_km": 24.5,
    "magnitude": 5.8
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Happy Path | Functional | Dữ liệu chuẩn hợp lệ | Trả kết quả đúng công thức / schema / `200 OK` | `NOT_RUN` |
| `TC-02` | Empty / Missing Data (Demo §4) | Resilience | Tập đầu vào rỗng / 0 bản ghi | Không crash / không raise lỗi 500; trả trạng thái rỗng hợp lệ | `NOT_RUN` |
| `TC-03` | Boundary / UTC & WGS84 | Boundary | Giá trị biên ($\pm 180^\circ$, `NaN`, múi giờ UTC) | Xử lý an toàn, đúng chuẩn UTC & WGS84 | `NOT_RUN` |
| `TC-04` | Error / Exception Handling | Negative | Mất mạng USGS / payload dị biệt | Bắt ngoại lệ rõ ràng, không làm chết tiến trình | `NOT_RUN` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
# Ví dụ Backend
cd apps/api && uv run pytest tests/unit/test_<module>.py -v
# Hoặc Scripts / Python stdlib
python3 -m unittest scripts/tests/test_<module>.py -v
```

- **Ngày chạy cuối:** `yyyy-mm-dd`
- **Kết quả quan sát thật:** `<số pass / fail, hoặc trích log lỗi>`

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(nếu phát hiện lỗi khi chạy unit test, tạo `BUG-<handle>-NNN-<slug>.md` trong `.agents/notes/bugs/` và liệt kê ID + tóm tắt tại đây).*

