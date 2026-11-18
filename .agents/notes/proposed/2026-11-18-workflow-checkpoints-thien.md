<!-- Copy cấu trúc từ .agents/notes/proposed/_TEMPLATE.md — không sửa template. -->

# Proposal: Thêm 2 checkpoint quyết định vào workflow (commit/push và merge)

## Metadata
- ID: 2026-11-18-workflow-checkpoints-thien
- Author: agent | thien
- Created: 2026-11-18
- Type: docs
- Status: approved
- Priority: high
- Area: `.agents/skills/{build-implementation,review-pr,write-testcase}/SKILL.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/notes/README.md`, `docs/{agent-workflow,git-workflow}.md`, `scripts/tests/test_workflow_checkpoints.py`
- Architecture Impact: `AGENTS.md`, `docs/agent-workflow.md`, `docs/git-workflow.md`, `.claude/notes/README.md`, `CLAUDE.md`, 3 file `SKILL.md`   <!-- sự thật thay đổi: luồng Spec-Driven/Fast-Track/test/<id> không còn tự động commit/push rồi merge; có 2 điểm dừng bắt buộc chờ người dùng, kèm cụm từ khởi động "tiếp tục workflow". Không đổi code runtime, contract hay route API. -->
- Related Docs:
  - docs/agent-workflow.md (§4 Luồng 1/2, §5 Cơ chế dừng cứng, §6 Agent Output Contract, §8 bảng 5 skill)
  - docs/git-workflow.md (§ Luồng tự động hóa dòng 16–39)
  - AGENTS.md (mục Quyền hạn, Git & Pull Request, 5 Skill cốt lõi)
  - CLAUDE.md, .claude/notes/README.md (nguyên tắc vận hành dùng chung giữa tool)
  - .agents/notes/implemented/2026-11-17-ui-component-styles-thien/plan.md (tiền lệ: task trước đã "dừng sau validation theo chỉ thị người dùng" — không mâu thuẫn, chỉ phổ quát hóa thành checkpoint)
- Related Proposals: none
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Luồng hiện tại trong `build-implementation` (bước 7) và `review-pr` (Phần B) là **tự động liền mạch**: validation xong → `scope` → `project-review` → commit → `update` → `push` → tạo PR → kiểm 0 conflict → merge vào `develop` → `sync`, chỉ dừng nếu người dùng chủ động bảo "giữ working tree". `AGENTS.md:96–99`, `docs/agent-workflow.md:107–109,124–127` và `docs/git-workflow.md:26–38` đều ghi nhận hành vi tự động này.

### Vấn đề
- Mỗi commit chỉ là **một thay đổi nhỏ**; người dùng chưa kịp quyết định công việc đã hoàn thành hay chưa, nhưng agent đã push và có thể đã merge PR vào `develop`.
- Không có điểm dừng trung gian để người dùng quyết định **có commit/push, có gửi yêu cầu merge hay không** — đặc biệt khi code vừa pass test nhưng thiết kế/chất lượng cần rà soát thêm.
- Khi người dùng đã bảo dừng ở một checkpoint, chưa có **cụm từ khởi động ngắn gọn** để tiếp tục đúng chỗ đang dang dở mà không phải giải thích lại từ đầu.

### Ảnh hưởng
Đụng trực tiếp đến cách 5 skill điều phối (I7: testcase + test offline; Anti-Interrupt: gom câu hỏi cuối phiên; Quyền hạn: agent tự commit/push nhưng không được tự ý khi người dùng chưa quyết). Không đụng I1–I6, không đổi runtime BE/FE hay `contracts/`.

---

## 2. Hiện trạng
- `.agents/skills/build-implementation/SKILL.md:7–9,68–71`: đặt `Status: validation` rồi **TỰ ĐỘNG** chuyển giao `review-pr` Phần B.
- `.agents/skills/review-pr/SKILL.md:26–31`: "tự động thực hiện liền mạch toàn bộ sửa/thêm file, commit, push PR mà không hỏi xác nhận lặp lại"; chỉ dừng nếu người dùng chủ động bảo giữ working tree. Bước 10–11 merge ngay khi 0 conflict.
- `.agents/skills/write-testcase/SKILL.md` Luồng 2 bước 5: xong test là chuyển thẳng `review-pr` Phần B.
- `AGENTS.md:90` ghi quyền "Tự chạy review-pr: start, commit, update, push, tạo PR và merge..."; `:96–99` mô tả Phần A/B tự động.
- `docs/agent-workflow.md:99–110` (Pha 1→5) và sơ đồ Mermaid `:113–128` mô tả luồng thẳng; `:156–173` Agent Output Contract; `:186–190` bảng 5 skill.
- `docs/git-workflow.md:16–39` sơ đồ 3 luồng có nhánh "Ngay khi hoàn tất validation → review-pr Phần B" rồi merge.
- `CLAUDE.md:4` và `.claude/notes/README.md:17–21` mới chỉ có quy tắc Anti-Interrupt/gom câu hỏi, chưa có checkpoint.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Thêm **CHECKPOINT 1** ngay sau khi validation xanh (`Status: validation`, testcase `passed`): agent **dừng**, xuất Implementation Report, hỏi người dùng 3 lựa chọn — (a) commit + push + tạo PR, (b) dừng giữ working tree, (c) sửa thêm rồi chạy lại validation. Chưa được commit/push khi chưa có xác nhận.
  2. Thêm **CHECKPOINT 2** sau khi đã push nhánh, tạo PR và `merge --dry-run` = 0 conflict: agent **dừng**, báo link PR + trạng thái checks, hỏi người dùng — (a) gửi yêu cầu merge / merge PR vào `develop` + `sync`, (b) giữ PR mở, chưa merge. Lý do: mỗi commit là mỗi thay đổi nhỏ, chưa quyết định hoàn thành.
  3. Định nghĩa **cụm từ khởi động (resume trigger)**: `tiếp tục workflow` (chấp nhận `continue workflow`). Khi người dùng nhập cụm này, agent tiếp tục **từ checkpoint gần nhất đang dừng**, không hỏi lại các lựa chọn đã xác nhận. Mỗi lần dừng, agent phải in rõ tên checkpoint + cụm khởi động trong câu trả lời.
  4. Cập nhật 5 skill/docs để mô tả luồng mới: `build-implementation`, `review-pr`, `write-testcase`, `AGENTS.md`, `CLAUDE.md`, `.claude/notes/README.md`, `docs/agent-workflow.md`, `docs/git-workflow.md`.
  5. Thêm unit test offline kiểm tra sự hiện diện của 2 checkpoint + cụm khởi động trong các file định nghĩa workflow (chống drift tài liệu).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi runtime `apps/api/**`, `apps/web/src/**`, `contracts/**`, migration, route API, `.env`.
  - Không đổi cú pháp lệnh `git-ship.sh`, hook `.githooks/`, hay điều kiện Conflict-Free Gate (vẫn cấm merge khi còn `CONFLICT`).
  - Không bỏ §9 Proposal Review — checkpoint chỉ nằm sau khi proposal đã `Approved`.
  - Không xóa/sửa test cũ đang pass; không nhân bản skill sang thư mục riêng của tool.

---

## 4. Giải pháp đề xuất
### 4.1. Luồng mới (Spec-Driven)
```text
Pha 1–3: write-proposal → §9 Approved (giữ nguyên)
Pha 4:   review-pr Phần A (start) → SINH ĐỒNG THỜI implemented/ + testcase/
         → code + test offline → validation xanh → Status: validation
         ▼
CHECKPOINT 1 ── "commit + push + tạo PR?" / "dừng giữ working tree?" / "sửa thêm?"
   ├─ dừng → giữ working tree, in cụm "tiếp tục workflow" để resume
   └─ tiếp tục → scope → project-review → commit tiếng Việt → update → push → PR → merge --dry-run (0 conflict)
         ▼
CHECKPOINT 2 ── "gửi yêu cầu merge / merge PR vào develop?" / "giữ PR mở?"
   ├─ dừng → giữ PR, in cụm "tiếp tục workflow"
   └─ tiếp tục → merge → sync → status.md completed (qua nhánh chore nếu cần ghi SHA)
```
Áp dụng tương tự cho **Fast-Track** (≤ 1 file) và **single-file-test** (`test/<id>`): checkpoint 1 sau test/build pass, checkpoint 2 sau push/PR.

### 4.2. Quy ước checkpoint (đưa vào cả 5 skill/docs)
- Mỗi checkpoint là một **câu hỏi duy nhất, đánh số**, nêu rõ: trạng thái hiện tại, 2–3 lựa chọn, và cụm khởi động. Không hỏi từng thao tác nhỏ (giữ Anti-Interrupt).
- Cụm khởi động mặc định: **`tiếp tục workflow`**; chấp nhận `continue workflow`. Agent chỉ resume đúng task đang dừng (không áp dụng cho task khác).
- Nếu người dùng chọn "sửa thêm", agent quay lại bước implement/test rồi **lặp lại CHECKPOINT 1** sau khi validation xanh again.
- Checkpoint **không** overrides dừng cứng: `SCOPE MISMATCH`, `CRITICAL BUG`, thiếu testcase/file test, `CONFLICT DETECTED` vẫn dừng ngay và gom hỏi cuối phiên theo `AGENTS.md`.
- Quyền hạn trong `AGENTS.md:90` được siết lại: agent có quyền commit/push/**merge sau khi đã qua checkpoint tương ứng**; chưa qua checkpoint thì chỉ chuẩn bị.

### 4.3. Tệp dự kiến sửa
| Tệp | Thay đổi chính |
|---|---|
| `.agents/skills/build-implementation/SKILL.md` | Bước 7: thay "TỰ ĐỘNG chuyển giao" bằng "dừng CHECKPOINT 1 · cụm `tiếp tục workflow`"; mô tả 3 lựa chọn. |
| `.agents/skills/review-pr/SKILL.md` | Phần B tách thành B1 (đến push+PR+dry-run) → CHECKPOINT 2 → B2 (merge+sync+completed); cập nhật mục "Khi nào chạy" và bước 10–11. |
| `.agents/skills/write-testcase/SKILL.md` | Luồng 2 bước 5: thêm "dừng CHECKPOINT 1 trước review-pr". |
| `AGENTS.md` | Bảng quyền hạn dòng 90; mục Git & PR `:96–99`; mô tả 2 skill `:107,110`. |
| `CLAUDE.md`, `.claude/notes/README.md` | Thêm nguyên tắc 2 checkpoint + cụm khởi động vào quy tắc tương tác/vận hành. |
| `docs/agent-workflow.md` | Pha 4 `:99–110`, Mermaid `:113–128`, §5 `:145–154`, Output Contract `:156–173`, bảng skill `:186–190`. |
| `docs/git-workflow.md` | Sơ đồ `:16–39` thêm 2 nhánh checkpoint. |
| `scripts/tests/test_workflow_checkpoints.py` | MỚI — offline unittest đọc các file trên, khẳng định chứa `CHECKPOINT 1`, `CHECKPOINT 2`, `tiếp tục workflow` và không còn cụm "TỰ ĐỘNG chuyển giao" ở build-implementation. |

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ thêm checkpoint trước merge (CHECKPOINT 2), giữ tự động commit/push
Ưu: ít thay đổi nhất. Nhược: vẫn commit/push ngay sau validation — không giải quyết được lý do "mỗi commit là mỗi thay đổi nhỏ, chưa quyết định xong". **Không chọn.**

### Phương án B: 2 checkpoint (sau validation + sau PR) + cụm khởi động `tiếp tục workflow`
Ưu: người dùng kiểm soát từng quyết định; vẫn giữ Anti-Interrupt (mỗi checkpoint chỉ 1 câu hỏi gom lựa chọn); có cụm resume ngắn để tiếp tục đúng chỗ. Nhược: thêm tối đa 2 lần chờ xác nhận mỗi task. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | Sửa 8 file định nghĩa quy trình + 1 file test; không đổi code runtime |
| Hiệu năng | Không đổi | Chỉ thêm điểm dừng trong luồng agent |
| Bảo trì / Open-Closed | Tốt | Không xóa skill/luật cũ; mở rộng bằng checkpoint + test chống drift |
| Độ tin cậy | Cao | Test offline khẳng định tài liệu và skill luôn khớp luồng mới |
| Tương thích | An toàn | Conflict-Free Gate, §9, Anti-Interrupt, I1–I7 giữ nguyên |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Agent quên dừng ở checkpoint (vẫn auto push/merge) | Trung bình | Cao | Sửa rõ bước 7 build-implementation + bước 10–11 review-pr; test offline soi cụm từ; Output Contract bắt buộc in checkpoint |
| Người dùng gõ sai cụm khởi động | Trung bình | Thấp | Chấp nhận `tiếp tục workflow` / `continue workflow`; mỗi lần dừng in sẵn cụm để copy |
| Checkpoint làm chậm Fast-Track | Thấp | Trung bình | Giữ 1 câu hỏi gom lựa chọn, không hỏi từng lệnh; người dùng có thể trả lời gộp "tiếp tục workflow" |
| Drift giữa skill và docs | Trung bình | Trung bình | 1 file test offline kiểm tra toàn bộ tệp định nghĩa workflow |
| Sửa `AGENTS.md` ngoài scope đã xác nhận | Thấp | Cao | Đây là nội dung proposal được duyệt §9; chỉ đổi đúng các dòng mô tả luồng, không đụng luật khác |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-18-workflow-checkpoints-thien.md` *(copy từ `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):** `scripts/tests/test_workflow_checkpoints.py` *(unittest đọc file markdown, không gọi mạng)*
- **Cách kiểm chứng:** `python3 -m unittest discover -s scripts/tests -v`, `python3 scripts/notes_index.py --check`, `git diff --check`. Kiểm tra func: 2 checkpoint + cụm khởi động xuất hiện trong đủ 8 tệp; build-implementation không còn cụm "TỰ ĐỘNG chuyển giao"; sơ đồ Mermaid/git-workflow có nhánh dừng; Conflict-Free Gate và §9 vẫn nguyên vẹn.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-18
Comments: Người dùng xác nhận rõ trong chat: "duyệt" cho proposal 2026-11-18-workflow-checkpoints-thien. Triển khai đúng 9 tệp trong §4.3, validation xong thì DỪNG ở CHECKPOINT 1 chờ người dùng quyết định commit/push (cụm khởi động "tiếp tục workflow").
Scope of Rejection: -

---

## 10. Next Action
Đã hoàn tất: §9 Approved → build-implementation + write-testcase → validation → CHECKPOINT 1 xác nhận (`tiếp tục workflow`) → commit `08435b3` + push + PR #23 → CHECKPOINT 2 xác nhận (`tiếp tục workflow`) → merge vào develop (`174e9fa`) + sync. status.md `completed`. Quy trình 2 checkpoint đã tự chạy đúng ngay trên chính task này.
