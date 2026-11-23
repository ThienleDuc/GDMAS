# Testcase: Query param của 3 endpoint analysis theo API.md §3.3

## Metadata
- ID: 2026-11-22-analysis-unsupported-query-params-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/services/earthquake-api.ts`, `apps/web/src/features/overview/useOverviewData.ts`
- Test File: `apps/web/tests/analysis-query-params.test.ts`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** URL do FE tạo ra chỉ chứa query param được BE/API.md hỗ trợ cho `/analysis/trend`, `/analysis/seasonality`, `/analysis/correlation`.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1) — chỉ đụng T7
  - [x] UTC/WGS84 (I3) — API.md là nguồn sự thật; không gửi timestamp bị BE bỏ qua
  - [x] Không mock thay API thật (I5)
  - [x] Offline 100% (I7) — mock `fetch`, capture URL

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** mock `globalThis.fetch` trả `{success:true, data:{...}}` tối thiểu; capture `String(input)` để assert query.
```json
{
  "trend_ok": { "success": true, "data": { "series": [], "status": "computed" } },
  "seasonality_ok": { "success": true, "data": { "components": { "seasonal_line": [] } } },
  "correlation_ok": { "success": true, "data": { "variables": [], "matrix": [] } }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Trend đúng param | Functional | `getTrendAnalysis({resample_freq:"D"})` | URL có `resample_freq=D`; không có `start_time`/`end_time` | PASS |
| `TC-02` | Param deprecated không bị forward | Regression | `getTrendAnalysis({resample_freq:"D", start_time:"...Z", end_time:"...Z"})` | URL vẫn không có `start_time`/`end_time` | PASS |
| `TC-03` | Seasonality không query | Functional | `getSeasonalityAnalysis({resample_freq:"D", start_time:"...Z"})` | URL không có `?` | PASS |
| `TC-04` | Correlation không query | Functional | `getCorrelationAnalysis({start_time:"...Z"})` | URL không có `?` | PASS |
| `TC-05` | Overview bỏ cửa sổ giả | Source assertion | Đọc `useOverviewData.ts` | Không còn `toUtcIso`/`const window`; có `getTrendAnalysis({ resample_freq: "D" }` | PASS |
| `TC-06` | Hồi quy 217 test cũ | Resilience | `pnpm test` | Không giảm số test, 0 fail | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/analysis-query-params.test.ts
cd apps/web && pnpm test && pnpm build
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 2026-11-22 — `node --test tests/analysis-query-params.test.ts` → 5/5 pass; `pnpm test` → 228/228 pass; `pnpm build` OK; `uv run pytest -q` → 318 pass; `notes_index --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
