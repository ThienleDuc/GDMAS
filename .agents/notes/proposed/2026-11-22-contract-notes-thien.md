# Proposal: Ghi chú hợp đồng cho GAP-10 & GAP-11

## Metadata
- ID: 2026-11-22-contract-notes-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: docs
- Status: approved
- Priority: low
- Area: apps/web/src/contracts/, docs/api/
- Architecture Impact: docs/api/API.md
  <!-- Chỉ prose làm rõ shape rỗng của /patterns — KHÔNG đổi contracts/schemas/patterns.json.
       FE contract chỉ thêm comment mô tả field, không đổi type/shape. -->
- Related Docs: docs/task/fe-be-integration-gaps.md (GAP-10/11)
- Related Proposals: 2026-11-21-api-docs-contract-sync-thien, 2026-11-22-patterns-optional-fields-thien
- Related Bugs: none

---

## 1. Vấn đề
- GAP-10: `time_series_preview[].time` do BE trả dạng `"HH:MM"` (`statistics.py:52`), FE contract không nói rõ → dễ bị parse nhầm thành ISO. User chọn **sửa FE, không sửa BE**.
- GAP-11: prose `docs/api/API.md` đòi `data:null` cho `/patterns` empty, nhưng schema `patterns.json` không định nghĩa `data` và route trả `{success:false,total_patterns:0,patterns:[],message}`. User chọn **không sửa schema, chỉ prose**.

---

## 2/3. Hiện trạng & Mục tiêu
Chỉ làm rõ hợp đồng (comment/prose); không đổi runtime, type, route, schema.

---

## 4. Giải pháp
1. `apps/web/src/contracts/earthquake.ts` — comment `HourlyTimeSeriesPoint.time`: nhãn hiển thị `HH:MM`, không parse ISO (giữ mode UTC/UTC+7 ở tầng hiển thị).
2. `docs/api/API.md` §2 + §3.3 — ghi rõ `/patterns` empty có shape riêng, **không có khóa `data`**, khớp `patterns.json`.
3. Test source assertion nhẹ (I7).

---

## 5/6/7. Cân nhắc/Đánh đổi/Rủi ro
Không đổi code chạy → rủi ro thấp; tránh drift tài liệu cho phiên sau.

---

## 8. Cách kiểm chứng
`cd apps/web && pnpm test && pnpm build`; `python3 -m unittest scripts/tests/test_api_docs_contracts.py`; `notes_index --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: User cho phép chạy tự động task trong scope; GAP-10/11 đã có quyết định từ phiên audit (sửa FE comment, không sửa schema).
Scope of Rejection: -

---

## 10. Next Action
Sửa 2 file + test nhẹ → validation → commit/merge tự động → nhật ký.
