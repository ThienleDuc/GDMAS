# Testcase: Guard envelope rỗng của `GET /api/v1/patterns`

## Metadata
- ID: 2026-11-22-patterns-empty-envelope-guard-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-patterns-empty-envelope-guard-thien.md
- Target: `apps/web/src/contracts/common.ts` (`isApiEmptyEnvelope`), `apps/web/src/lib/api-client.ts` (`fetchApi`), `apps/web/src/services/earthquake-api.ts` (`getPatterns`)
- Test File: `apps/web/tests/api-empty-envelope.test.ts`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Response rỗng HTTP 200 của `/patterns` phải được FE chấp nhận là Empty State, không ném `ApiError`.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1) — chỉ đụng T7, không đụng T6
  - [x] UTC/WGS84 (I3) — không đổi timestamp/tọa độ
  - [x] Không fallback mock khi DB rỗng (I5) — trả đúng payload rỗng từ BE
  - [x] Offline 100% (I7) — mock `globalThis.fetch`, không gọi mạng

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Node test chạy với TS stripping có sẵn; mock `fetch` trả `Response(JSON.stringify(payload), {status:200})`.
```json
{
  "patterns_empty": {
    "success": false,
    "total_patterns": 0,
    "patterns": [],
    "message": "CSDL TRỐNG: Chưa có dữ liệu 6 patterns."
  },
  "envelope_empty": { "success": false, "data": null, "message": "Chưa có kết quả Pattern 'trend'." },
  "error_envelope": { "success": false, "error": { "code": "DATABASE_ERROR", "message": "Lỗi CSDL." } }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Aggregate rỗng hợp lệ | Functional | `isApiEmptyEnvelope(patterns_empty)` | `true` | PASS |
| `TC-02` | Envelope rỗng cũ vẫn hợp lệ | Regression | `isApiEmptyEnvelope(envelope_empty)` | `true` | PASS |
| `TC-03` | Error envelope không bị nuốt | Negative | `isApiEmptyEnvelope(error_envelope)` | `false` | PASS |
| `TC-04` | Shape thiếu field | Negative | `{success:false,total_patterns:0,message}` (thiếu `patterns`) | `false` | PASS |
| `TC-05` | `getPatterns()` không throw | Functional | mock fetch trả `patterns_empty` | Trả object có `total_patterns:0`, `patterns:[]`, không reject | PASS |
| `TC-06` | Regression fallback cụm | Resilience | `/clusters` 404 + `/patterns` rỗng | `getClustersOptional()` → `unavailable:true`, `data:null` | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/api-empty-envelope.test.ts
cd apps/web && pnpm test && pnpm build
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 2026-11-22 — `node --test tests/api-empty-envelope.test.ts` → 6/6 pass; `pnpm test` → 228/228 pass (217 cũ + 11 mới); `pnpm build` OK; `uv run pytest -q` → 318 pass; `notes_index --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
