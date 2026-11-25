<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Chuẩn hóa Overview theo quy ước earthquakes

## Metadata
- ID: 2026-11-23-overview-severity-standard-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/overview/`, `apps/web/src/components/charts/OverviewSeverityChart.tsx`
- Test File: `apps/web/tests/severity-standard.test.ts` (mới), cập nhật `overview-view.test.ts`, `overview-page.test.ts`
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `severityLabel` 5 mức + `badgeClass`, `depthLabel`, `buildSeverityMix` badgeClass, màu chart khớp token earthquakes.
- **Ràng buộc:** I1 (FE/T7), I2 (giữ chữ ký), I3 (không đổi payload), I5 (không bịa 5 nhóm từ 3 field), I7 (offline, không xoá test).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- `node:test` + `readFileSync`, không gọi mạng. Fixture: magnitude `2.9/3.2/5.4/6.3/7.1`, depth `0/69.9/70/300/300.1/NaN`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | 5 mức độ lớn | Functional | `severityLabel(2.9), (3.2), (5.4), (6.3), (7.1)` | Rất nhẹ / Nhẹ / Trung bình / Mạnh / Rất mạnh + badgeClass success/info/warning/error/error | `PASSED` |
| `TC-02` | 3 mức độ sâu | Boundary | `depthLabel(0), (69.9), (70), (300), (300.1), (NaN)` | Nông / Nông / Trung bình / Trung bình / Sâu / `—` + badgeClass tương ứng | `PASSED` |
| `TC-03` | Nguồn quy ước duy nhất | Structural | Đọc `overview-view.ts` | Import `MAGNITUDE_BANDS`, `DEPTH_BANDS`, `SEVERITY_FOOTNOTE`; không định nghĩa lại mảng | `PASSED` |
| `TC-04` | buildSeverityMix giữ 3 slice thật | Functional | statistics 3 field | Vẫn 3 slice + mỗi slice có `badgeClass`; `partial` đúng | `PASSED` |
| `TC-05` | Màu chart khớp badge | Structural | Đọc `OverviewSeverityChart.tsx` + CSS | `minor→chart-3`, `moderate→chart-4`, `strong→destructive`; CSS dùng token success/info/warning/error | `PASSED` |
| `TC-06` | Render badge + cột độ sâu | Structural | Đọc `OverviewPage.tsx` | `ds-badge ${...badgeClass}`, có "Độ sâu", có `SEVERITY_FOOTNOTE` | `PASSED` |
| `TC-07` | Chu kỳ + rủi ro + title card (vòng 2) | Structural | Đọc chart/page + gọi `riskBadgeClass` | Chu kỳ Mạnh/Trung bình/Nhẹ + màu error/warning/success; rủi ro badge palette earthquakes | `PASSED` |
| `TC-08` | Một kiểu label card duy nhất (vòng 4) | Structural | Đọc page + CSS | 4 label đều `ov-card__label`; CSS font `--font-sans`, size `--text-base`, weight `--font-bold`, màu `--foreground`; không còn `card-title`/`ov-card__title` | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-23`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **351 tests / 0 fail** (baseline 343 → vòng 1 349 → vòng 2 351); `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
