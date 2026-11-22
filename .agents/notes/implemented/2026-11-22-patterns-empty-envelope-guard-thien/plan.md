# Implementation Plan: Sửa guard envelope cho response rỗng của `/patterns`

## Metadata
- ID: 2026-11-22-patterns-empty-envelope-guard-thien
- Proposal: .agents/notes/proposed/2026-11-22-patterns-empty-envelope-guard-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Mở rộng `isApiEmptyEnvelope()` để chấp nhận shape rỗng của `GET /api/v1/patterns` (`{success:false, total_patterns:0, patterns:[], message}` — HTTP 200, không có `data`) đã được API.md §2 xác nhận, giúp `getPatterns()` trả Empty State thay vì ném `ApiError`.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/contracts/common.ts` — mở rộng additive `isApiEmptyEnvelope()`, giữ nhánh `data === null` cũ
- `apps/web/src/lib/api-client.ts` — chỉ bổ sung comment giải thích ngoại lệ API.md §2 (không đổi logic)
- `apps/web/tests/api-empty-envelope.test.ts` — file test offline mới (mock fetch)
- `apps/web/tests/services.test.ts` — bổ sung assert đường đi TC-14 nếu cần
- `.agents/notes/testcase/2026-11-22-patterns-empty-envelope-guard-thien.md` *(đặc tả sinh đồng thời)*
### Out of Scope
- `apps/api/**` (không đổi BE), `contracts/**` root (I2/I4), `docs/api/API.md` (đã đúng), file test cũ đang pass (I7)

---

## 3. Các bước
### Step 1 — Guard
Thêm nhánh OR thứ hai vào `isApiEmptyEnvelope()`: `success === false`, `message` là string, `total_patterns` là number, `patterns` là array, không có `error`, không có `data`. Giữ nguyên chữ ký.
### Step 2 — Comment
Ghi chú trong `lib/api-client.ts` tại đoạn kiểm tra envelope rằng aggregate rỗng `/patterns` là hợp lệ theo API.md §2.
### Step 3 — Test offline
Tạo `apps/web/tests/api-empty-envelope.test.ts`: assert guard đúng/sai theo ma trận, `getPatterns()` không throw với response rỗng, regression TC-14 vẫn `unavailable:true`.
### Step 4 — Validation
Chạy `pnpm test`, `pnpm build`, `uv run pytest`, `notes_index --check`; cập nhật testcase/status.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không đổi wire contract, không migration, không biến môi trường.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-patterns-empty-envelope-guard-thien.md`
- [ ] **Đã tạo và chạy pass file unit test offline** `apps/web/tests/api-empty-envelope.test.ts`
- [ ] Frontend: `cd apps/web && pnpm test` (≥217 pass) && `pnpm build`
- [ ] Backend: `cd apps/api && uv run pytest -q` (318 test — hồi quy)
- [ ] Notes: `python3 scripts/notes_index.py --check`
- [ ] Tài liệu: Architecture Impact = none → không cần cập nhật
- [ ] Kiểm chứng chức năng: `getPatterns()` trả payload rỗng, không ném lỗi HTTP 200 giả

---

## 6. Rủi ro khi làm
Guard quá rộng nuốt payload lỗi → điều kiện OR chặt (có `total_patterns` + `patterns` + `message`, không có `error`/`data`) và test negative.

---

## 7. Rollback
Revert các thay đổi trong `common.ts`/`api-client.ts` và xóa file test mới (tệp do chính agent tạo trong lượt này); không chạm file cũ khác.

---

## 8. Ghi chú
Triển khai trên nhánh `chore/fe-be-api-linkage-audit` theo yêu cầu người dùng gom cả audit + 3 fix trên một nhánh mới.
