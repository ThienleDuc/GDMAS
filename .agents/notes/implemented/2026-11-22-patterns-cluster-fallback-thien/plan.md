<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9.
     Tầng thực thi, không chép lại lý lẽ của proposal. Luật: docs/agent-workflow.md. -->

# Implementation Plan: Fallback cụm thật từ `/patterns` khi `/clusters` 404 (RD-15)

## Metadata
- ID: 2026-11-22-patterns-cluster-fallback-thien
- Proposal: .agents/notes/proposed/2026-11-22-patterns-cluster-fallback-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Đóng drift RD-15: `getClustersOptional()` fallback sang `clustering_summary` của `/patterns` (dữ liệu thật) khi `/clusters` 404, giữ nguyên chữ ký và không đổi consumer.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/lib/transforms/cluster-fallback.ts` *(mới — hàm thuần `clustersFromPatterns()`)*
- `apps/web/src/services/earthquake-api.ts` *(sửa bên trong `getClustersOptional()`)*
- `apps/web/src/contracts/common.ts` *(sửa `isApiEnvelope()` — phát hiện khi implement: guard cũ bắt buộc `data`, trong khi `/patterns` aggregate không có `data` → `getPatterns()` ném ApiError dù BE trả 200; sửa để khớp `patterns.json`)*
- `apps/web/tests/cluster-fallback.test.ts` *(mới)*
- `apps/web/tests/services.test.ts` *(bổ sung case fallback 404)*
- `docs/task/fe-be-integration-ready.md` *(ghi kết quả đã giải quyết vào cuối file — yêu cầu người dùng)*
- `.agents/notes/testcase/2026-11-22-patterns-cluster-fallback-thien.md` *(đặc tả testcase sinh đồng thời từ `_TEMPLATE.md`)*

### Out of Scope
- `apps/api/**` (BE), `contracts/**`, `docs/api/API.md`, migration Alembic (I4)
- `hooks/useEarthquakeInsights.ts`, `layouts/header/GlobalCountryFilter.tsx` (giữ nguyên — tự hưởng lợi)
- `features/monitoring/mock-region-clusters.ts` (GAP-05 — task riêng)
- SSE, `/patterns` payload, adapter `normalizeClusters()` (I2)

---

## 3. Các bước
### Step 1 — Adapter thuần
Tạo `cluster-fallback.ts`: `clustersFromPatterns(payload)` map `clustering_summary.clusters[]` legacy → `ClustersResponse` canonical; trả `null` khi rỗng/thiếu; không nội suy, không mock.

### Step 2 — Service fallback
Sửa `getClustersOptional()`: nếu `unavailable` → `getPatterns(signal)` → `clustersFromPatterns()`; 404/rỗng → giữ `unavailable: true`; lỗi khác → ném tiếp. Giữ nguyên chữ ký.

### Step 3 — Test offline
`cluster-fallback.test.ts` (map alias, rỗng, giữ `name`, không nội suy) + bổ sung `services.test.ts` (fetch mock 200→không gọi /patterns, 404→fallback, 404+rỗng→unavailable, 404+500→không throw, `/patterns` aggregate→getPatterns OK).

### Step 3b — Sửa guard envelope (phát hiện khi implement)
`isApiEnvelope()` chấp nhận thêm shape aggregate `{success:true,total_patterns,patterns}` của `/patterns`; nếu không, `getPatterns()` ném ApiError và fallback không bao giờ chạy dù BE trả 200.

### Step 4 — Ghi tiến độ & validation
Ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md`; chạy `pnpm test && pnpm build`, `notes_index --check`, `scope`; cập nhật status → `validation`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có migration, không đổi schema `contracts/`, không đổi endpoint hay payload BE, không biến môi trường. Chỉ bổ sung 1 file FE + 1 nhánh fallback trong service.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-patterns-cluster-fallback-thien.md`
- [ ] **Đã tạo và chạy pass file unit/integration test offline** — `cluster-fallback.test.ts` + `services.test.ts`
- [ ] Frontend typecheck & build: `cd apps/web && pnpm test && pnpm build`
- [ ] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [ ] Tài liệu bị ảnh hưởng (`Architecture Impact: none`) — không cần cập nhật
- [ ] Kiểm tra chức năng: `/clusters` 404 + `/patterns` có cụm → header hiện quốc gia, hook có `clusters`; cả 2 rỗng → vẫn Empty State, không mock

---

## 6. Rủi ro khi làm
Test cũ `services.test.ts` TC-01 giả fetch 200 mọi URL → đường nhanh không gọi `/patterns`, không ảnh hưởng. `/patterns` empty-state trả shape không có `data` → adapter trả `null`.

---

## 7. Rollback
Revert 4 file FE + 1 file docs/task; giữ notes làm bằng chứng. Không có migration.

---

## 8. Ghi chú
Chủ vùng: `thien` (T7/FE). Không tự merge khi còn xung đột; dừng CHECKPOINT 1 sau validation.
