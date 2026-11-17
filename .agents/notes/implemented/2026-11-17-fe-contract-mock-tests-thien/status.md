# Implementation Status: Bộ test mock Frontend theo contracts

## Metadata
- ID: 2026-11-17-fe-contract-mock-tests-thien
- Status: in_progress
- Started: 2026-11-17
- Last Updated: 2026-11-18
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Validation — FE tests, build, Corepack pin và Vite dev mock smoke test đều pass; giữ working tree

Completed:
- Proposal §9 `Approved` (Reviewer: thien); phần mở rộng ngày 2026-11-18 được xác nhận trong chat.
- Nhánh `feat/2026-11-17-fe-contract-mock-tests-thien` đang giữ các thay đổi hiện có.
- Contract/sample earthquake và fixture SSE; README contracts cập nhật.
- Helpers fixture/fetch/EventSource và 6 test offline; trước phần mở rộng: test FE 45/45, build pass.
- Mở rộng `plan.md` và testcase để bao phủ packageManager, env names và dev-only API mock.
- Ghim `packageManager: pnpm@10.20.0` + `engines` (§1.4) thay cho pin 11 vốn yêu cầu Node ≥22.13; rebuild `node_modules` khớp pin; `corepack pnpm -v` → 10.20.0; đồng bộ `.env.example`.
- Thêm Vite dev-only middleware mock và resolver thuần `dev-mock.ts`, dùng fixtures `contracts/examples/`; khi flag bật, FE API base trỏ về Vite origin.
- Thêm 4 offline tests mới; suite tổng tăng 45 → 49 và pass.
- Build pass; smoke test API health/SSE với mock bật pass, flag tắt middleware không chặn frontend.

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | PASS | Testcase paired, `contract-mocks.test.ts` + `dev-mock.test.ts` |
| FE tests | PASS | `corepack pnpm test` — 49/49 |
| Frontend build | PASS | `corepack pnpm build` — tsc + Vite; còn warning chunk >500 kB |
| Corepack pin | PASS | `corepack pnpm -v` — 10.20.0 |
| Dev server smoke test | PASS | Flag enabled trả health fixture + SSE fixture; flag tắt không mock |
| Notes check | PASS | `python3 scripts/notes_index.py --check` |
| Diff whitespace | PASS | `git diff --check` |

---

## Known Issues
- Trước phần mở rộng, Vite báo chunk JS >500 kB; warning không làm build fail.

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Mở rộng scope theo xác nhận rõ của người dùng ngày 2026-11-18.
- Mock runtime chỉ chạy ở Vite development server middleware; không import test mocks/fixtures vào client bundle và không tồn tại trong production preview/build.
- Không commit/push/merge; giữ working tree theo chỉ thị trong plan ban đầu.

---

## Next Actions
- Giữ ở working tree cho người dùng rà soát; không commit/push/merge.

---

## Last Update
2026-11-18 — Hoàn tất cấu hình chạy riêng FE, dev-only mock và pin pnpm 10.20.0 tương thích Node ≥18.18 (§1.4); 49 test, build, Corepack và smoke validation pass. Giữ working tree theo yêu cầu.
