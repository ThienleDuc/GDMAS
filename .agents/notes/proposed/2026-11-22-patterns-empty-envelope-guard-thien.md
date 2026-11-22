<!-- Proposal sinh tự động từ audit đối chiếu FE↔BE API Service ngày 2026-11-22 (nhánh chore/fe-be-api-linkage-audit). -->

# Proposal: Sửa guard envelope để `getPatterns()` chấp nhận response rỗng của `/patterns`

## Metadata
- ID: 2026-11-22-patterns-empty-envelope-guard-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: high
- Area: `apps/web/src/contracts/common.ts`, `apps/web/src/lib/api-client.ts`, `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ mở rộng runtime guard FE theo shape ĐÃ được ghi nhận trong API.md §2 và contracts/schemas/patterns.json; không đổi wire contract, không đụng contracts/ root. -->
- Related Docs:
  - docs/api/API.md §2 (ngoại lệ empty `/patterns`), §3.3
  - contracts/schemas/patterns.json (không định nghĩa khóa `data` ở root)
  - contracts/README.md §3.8 (404/DB rỗng → Empty State, không mock)
- Related Proposals:
  - .agents/notes/proposed/2026-11-22-contract-notes-thien.md (GAP-10/11 — ghi chú shape rỗng)
  - .agents/notes/proposed/2026-11-22-patterns-cluster-fallback-thien.md (RD-15 — fallback cụm từ `/patterns`)
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Audit FE↔BE ngày 2026-11-22 đối chiếu 19 endpoint T6 với 14 endpoint REST + 1 SSE mà T7 gọi. Mọi path đều khớp; phát hiện lệch ở tầng **parse envelope** của response rỗng.

### Vấn đề
BE `GET /api/v1/patterns` khi CSDL rỗng trả HTTP 200 với shape **không có khóa `data`**:
`{ "success": false, "total_patterns": 0, "patterns": [], "message": "CSDL TRỐNG: ..." }`
(`apps/api/src/gdmas/api/routes/patterns.py:40-46`). Shape này được `docs/api/API.md` §2 (ngoại lệ GAP-11) và `contracts/schemas/patterns.json` xác nhận là hợp lệ.

FE `isApiEmptyEnvelope()` (`apps/web/src/contracts/common.ts:104-113`) chỉ chấp nhận `{success:false, data:null, message}` — **yêu cầu `data === null`**. Với payload rỗng của `/patterns`: `data` là `undefined` → guard trả `false`; `isApiEnvelope()` cũng trả `false` (vì `success !== true`). Hệ quả `fetchApi()` (`lib/api-client.ts:98-106`) ném
`ApiError("Envelope phản hồi API không hợp lệ.", 200)` dù BE trả 200 đúng hợp đồng.

### Ảnh hưởng
- `getPatterns()` — hàm được export công khai và được API.md §3.3 gọi là "hợp đồng chính cho FE" — **ném lỗi thay vì trả Empty State** trên CSDL rỗng (đúng kịch bản Demo Bước 2–3).
- Bug bị che giấu: test `apps/web/tests/services.test.ts` TC-14 (`/clusters` 404 + `/patterns` rỗng) vẫn pass chỉ vì `getClustersOptional()` có `catch {}` nuốt `ApiError` — tức test pass sai lý do. Bất kỳ consumer mới nào gọi trực tiếp `getPatterns()` cũng gặp lỗi HTTP 200 giả.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/api/routes/patterns.py:40-46` — trả rỗng không có `data`.
- `apps/web/src/contracts/common.ts:90-98` — `isApiEnvelope()` chỉ nhận `success === true` + (`data` | `total_patterns`+`patterns` | `synced_count`+`timestamp`).
- `apps/web/src/contracts/common.ts:104-113` — `isApiEmptyEnvelope()` chỉ nhận `success === false && data === null && message`.
- `apps/web/src/lib/api-client.ts:98-106` — nếu payload có `success` nhưng sai 2 guard trên → ném `ApiError`.
- Kiểm chứng offline bằng Node: `isApiEmptyEnvelope({success:false,total_patterns:0,patterns:[],message:'...'}) === false`, `isApiEnvelope(...) === false`.
- Baseline hiện tại: BE `318 passed`, FE `217 passed` — bug không bị test nào bắt đúng.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. `isApiEmptyEnvelope()` chấp nhận **cả hai** shape rỗng đã documented: envelope thường `{success:false, data:null, message}` và aggregate `/patterns` `{success:false, total_patterns:0, patterns:[], message}`.
  2. `fetchApi()` không ném `ApiError` cho response rỗng hợp lệ của `/patterns`.
  3. `getPatterns()` trả nguyên payload rỗng để UI vào Empty State; test chứng minh không throw.
  4. Giữ nguyên chữ ký `isApiEmptyEnvelope`, `fetchApi`, `getPatterns` (RULE-03).
- **Không nằm trong mục tiêu (Out of Scope):** không đổi BE, không đổi `contracts/` root, không đổi API.md, không thêm mock/dữ liệu giả, không đụng logic fallback của `getClustersOptional()`.

---

## 4. Giải pháp đề xuất
- Trong `apps/web/src/contracts/common.ts`: mở rộng **additive** `isApiEmptyEnvelope()` bằng một nhánh OR thứ hai, điều kiện chặt để không nuốt payload lạ:
  `success === false && !("error" in value) && typeof message === "string" && typeof total_patterns === "number" && Array.isArray(patterns) && !("data" in value)`.
  Giữ nguyên nhánh `data === null` cũ. Không đổi type guard khác.
- `apps/web/src/lib/api-client.ts`: **không sửa logic** — chỉ bổ sung comment dẫn API.md §2 để người sau hiểu vì sao aggregate rỗng hợp lệ.
- Test offline mới `apps/web/tests/api-empty-envelope.test.ts` (mock `globalThis.fetch`, không gọi mạng):
  - `isApiEmptyEnvelope()` đúng cho cả 2 shape; sai cho `{success:false, error:{...}}` và `{success:false, total_patterns:0}` thiếu `patterns`.
  - `getPatterns()` với response rỗng trả `{success:false, total_patterns:0, patterns:[]}` instead of throw.
  - Regression: TC-14 của `services.test.ts` vẫn pass và lần này đi đường `converted === null` thay vì đường `catch`.

---

## 5. Phương án đã cân nhắc
### Phương án A: Sửa BE thêm `"data": null` vào response rỗng
Ưu: FE không đổi. Nhược: phá `contracts/schemas/patterns.json` (không định nghĩa `data` ở root — `additionalProperties: false`), mâu thuẫn API.md §2 đã chốt GAP-11, đụng vùng BE. **Không chọn.**
### Phương án B: Mở rộng runtime guard phía FE
Ưu: đúng tài liệu, diff nhỏ, thuần additive (I2), test offline dễ. Nhược: phải viết điều kiện chặt để tránh chấp nhận payload lạ. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +1 nhánh OR, ~1 file test | Chỉ mở rộng guard hiện có |
| Hiệu năng | Không đáng kể | Guard chạy O(1) trước khi trả payload |
| Bảo trì / Open-Closed | Tốt | Không xóa condition cũ, không đổi chữ ký |
| Độ tin cậy | Tốt | HTTP 200 rỗng không còn bị nhầm thành lỗi envelope |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Guard quá rộng chấp nhận payload lỗi | Thấp | Trung bình | Yêu cầu đồng thời `success:false` + `total_patterns:number` + `patterns:array` + có `message` + KHÔNG có `error`/`data` |
| Test cũ TC-14 thay đổi đường đi | Trung bình | Thấp | Chạy lại toàn bộ 217 test FE; assert kết quả cuối vẫn `unavailable:true` |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-patterns-empty-envelope-guard-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/web/tests/api-empty-envelope.test.ts` *(mới — mock fetch, 100% offline)*; mở rộng `apps/web/tests/services.test.ts` nếu cần assert đường đi TC-14.
- **Cách kiểm chứng:** `cd apps/web && pnpm test` (không được giảm 217 test hiện hữu) && `pnpm build`; `cd apps/api && uv run pytest -q` (318 test); `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng xác nhận rõ "Duyệt cả 3 (Recommended)" trong chat sau báo cáo audit FE↔BE 2026-11-22. Duyệt toàn bộ phạm vi §4 — chỉ mở rộng runtime guard FE, không đổi wire contract. Triển khai trên nhánh chore/fe-be-api-linkage-audit theo yêu cầu "checkout từ develop ra nhánh mới" của người dùng.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 (bất kỳ handle nào trong `.agents/team.md` đều được, không cần `ThienleDuc`) rồi mới chuyển sang `build-implementation`; sinh đồng thời `implemented/<id>/{plan.md,status.md}` và `testcase/<id>.md`.
