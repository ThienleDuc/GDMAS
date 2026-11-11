# `.agents/notes/`: Bộ nhớ quyết định & nhật ký GDMAS

Bộ nhớ bền của dự án **GDMAS**: mọi thay đổi không-tầm-thường (> 1 file) bắt đầu bằng một proposal tại đây,
kế hoạch thực thi (`plan.md`) và trạng thái sống (`status.md`) nằm ngay cạnh.
Đọc file này trước khi viết, review hay triển khai bất kỳ thay đổi không-tầm-thường nào.
Quy trình đầy đủ: [docs/agent-workflow.md](../../docs/agent-workflow.md). Đội ngũ: [.agents/team.md](../team.md).

## Cấu trúc

```text
.agents/notes/
├── README.md                              # file này
├── proposed/                              # MỌI proposal, bất kể kết quả. Không di chuyển.
│   ├── README.md
│   ├── _TEMPLATE.md
│   └── yyyy-mm-dd-<slug>-<handle>.md      # quyết định ghi ở "## 9. Human Review"
├── implemented/                           # Tạo đồng thời khi proposal Approved (build-implementation)
│   ├── README.md
│   ├── _TEMPLATE/{plan.md,status.md}
│   └── yyyy-mm-dd-<slug>-<handle>/{plan.md,status.md}
├── testcase/                              # Tạo đồng thời khi proposal Approved HOẶC khi kiểm thử 1 file (write-testcase)
│   ├── README.md
│   ├── _TEMPLATE.md
│   └── yyyy-mm-dd-<slug>-<handle>.md
└── bugs/                                  # Nhật ký bug ngoài vòng đời proposal (bugs/README.md)
    ├── README.md
    ├── INDEX.md
    ├── _TEMPLATE.md
    └── BUG-<handle>-NNN-<slug>.md
```

## Vòng đời Proposal (tiêu chí thả lỏng — không cần `ThienleDuc` duyệt)

| `Decision:` | Metadata `Status:` | Ý nghĩa | Bước tiếp |
|---|---|---|---|
| `Pending` | `proposed` | Chờ xác nhận của thành viên thực hiện / đồng đội | Chờ thành viên xác nhận (§9) |
| `Changes Requested` | `changes_requested` | Có góp ý trong `Comments:` | Sửa ngay trên file đó, thêm `### Revision` |
| `Approved` | `approved` | Được làm (**bất kỳ thành viên nào trong `.agents/team.md`, kể cả tác giả, đều duyệt được — không cần `ThienleDuc`**) | `build-implementation` tạo `implemented/<id>/` **đồng thời** `write-testcase` tạo `testcase/<id>.md` |
| `Rejected` | `rejected` | Không làm, kèm `Scope of Rejection:` | Ở lại `proposed/` làm negative knowledge |

> **Phân quyền:** Duyệt **proposal (§9)** được thả lỏng cho mọi thành viên (`thien`, `son`, `van`, `tai`).
> Khi **Merge PR** vào `develop`: **không bắt buộc riêng `ThienleDuc`** — chỉ cần kiểm tra **không có xung đột (conflict-free)** và đạt checks là được phép merge (`./scripts/git-ship.sh merge` hoặc GitHub PR).

Quyết định mới thay quyết định cũ thì ghi `- Overrides: <id>` trong `Related Proposals` của chính nó;
bảng index sinh tự động sẽ đánh dấu cái cũ `superseded`. Không sửa file cũ.

## Công thức tra cứu

```bash
# Tổng quan mọi proposal (ID, Tiêu đề, Area, Decision, Implementation, superseded)
python3 scripts/notes_index.py

# Tổng quan mọi testcase
python3 scripts/notes_index.py --testcases

# Tổng quan mọi bug
python3 scripts/notes_index.py --bugs

# Kiểm tra tính nhất quán toàn bộ notes (exit 1 nếu lỗi; pre-push hook tự chạy)
python3 scripts/notes_index.py --check

# Đã quyết gì về <chủ đề>? (đọc nội dung, không chỉ tiêu đề)
grep -ril "<từ khóa>" .agents/notes/proposed/ .agents/notes/implemented/

# Negative knowledge: cái gì bị bác, trong phạm vi nào?
grep -l "^Decision: Rejected" .agents/notes/proposed/*.md
grep -A1 "^Scope of Rejection" .agents/notes/proposed/<file>.md

# Proposal đang chờ xác nhận
grep -l "^Decision: \(Pending\|Changes Requested\)" .agents/notes/proposed/*.md

# Implementation chưa xong
grep -L "Status: completed" .agents/notes/implemented/*/status.md

# Bug đã biết cho triệu chứng này? Bug critical đang mở?
grep -ril "<triệu chứng>" .agents/notes/bugs/
grep -l "Severity:\*\* critical" .agents/notes/bugs/BUG-*.md
```

Một kết quả `Rejected` không tự động là conflict: dòng `Scope of Rejection:` nói rõ bối cảnh nào bị bác.

## Bảng index tự động

Bảng index **không ghi tay** và không nằm trong file này: `scripts/notes_index.py` sinh bảng trực tiếp từ các file note
nên nhiều nhánh chạy song song không bao giờ gây git conflict ở file index.

Nguồn dữ liệu: `ID`, tiêu đề, `Area` ở Metadata của `proposed/<id>.md`; `Decision` ở §9; `Implementation` = `Status:`
trong `implemented/<id>/status.md`; `superseded` suy ra từ `Overrides: <id>`. Vì vậy chỉ cần sửa đúng file gốc.
