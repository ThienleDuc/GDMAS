<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục.
     Vòng đời: planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Fallback cụm thật từ `/patterns` khi `/clusters` 404 (RD-15)

## Metadata
- ID: 2026-11-22-patterns-cluster-fallback-thien
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-22
- Last Updated: 2026-11-22
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: CHECKPOINT 1 — chờ người dùng commit/push hay giữ nguyên

Completed:
- Rẽ nhánh `feat/2026-11-22-patterns-cluster-fallback-thien` từ `develop`
- Proposal §9 Approved + implemented plan/status + testcase (đồng thời)
- Step 1 — `cluster-fallback.ts`: `clustersFromPatterns()` map alias legacy → canonical, guard WGS84, không nội suy
- Step 2 — `getClustersOptional()` fallback chỉ khi 404; nuốt lỗi `/patterns`; giữ chữ ký
- Step 3b — sửa `isApiEnvelope()` chấp nhận aggregate envelope của `/patterns` (phát hiện khi implement)
- Step 3 — test offline: `cluster-fallback.test.ts` mới + bổ sung `services.test.ts` TC-12…TC-16
- Ghi nhật ký vào cuối `docs/task/fe-be-integration-ready.md` (yêu cầu người dùng)

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-22-patterns-cluster-fallback-thien.md` + 2 file test |
| FE test (`pnpm test`) | PASS | 183/183 |
| FE build (`pnpm build`) | PASS | tsc + vite build sạch |
| Notes check (`notes_index.py --check`) | PASS | OK |
| Scope (`git-ship.sh scope`) | PASS | 9 tệp trong phạm vi plan |
| Tài liệu cập nhật | DONE | mục 4 `docs/task/fe-be-integration-ready.md` |

---

## Known Issues
- `clustering_summary` legacy dùng `name` tiếng Việt → `countryFromPlace()` có thể trả nhãn cả chuỗi thay vì "Japan". Không bịa `dominant_place` (GAP-01 phía BE).

---

## Deviations From Plan
- Bổ sung `apps/web/src/contracts/common.ts` (sửa `isApiEnvelope`) ngoài kế hoạch ban đầu — phát hiện khi implement: guard cũ chặn `/patterns` aggregate. Đã cập nhật proposal §4, plan §2/Step 3b, testcase Target. Lý do: nếu không sửa, fallback không bao giờ chạy dù BE trả 200.

---

## Decisions Made During Implementation
- Fallback đặt ở tầng service để cả 2 consumer hưởng lợi mà không đổi UI.
- Chỉ fallback khi 404 HTTP; không fallback khi 200 + empty envelope (tránh đè Empty State hợp lệ).
- Nuốt mọi lỗi từ `/patterns` — không đổi Error State của consumer.

---

## Next Actions
- CHECKPOINT 1: chờ người dùng commit/push (`tiếp tục workflow`) hoặc giữ nguyên/sửa thêm.

---

## Last Update
2026-11-22 — Hoàn tất RD-15, validation xanh, dừng CHECKPOINT 1.
