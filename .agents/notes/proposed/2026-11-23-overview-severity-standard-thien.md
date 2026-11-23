<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md.
     QUY TẮC THẢ LỎNG §9: bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả tự duyệt) đều ký được Approved. -->

# Proposal: Chuẩn hóa Overview theo quy ước độ lớn / độ sâu / màu sắc của Danh mục động đất

## Metadata
- ID: 2026-11-23-overview-severity-standard-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: refactor
- Status: approved
- Priority: medium
- Area: `apps/web/src/features/overview/`, `apps/web/src/components/charts/OverviewSeverityChart.tsx`, `apps/web/tests/`
- Architecture Impact: none   <!-- FE-only; tái dùng hằng số/hàm thuần có sẵn, không đổi API/contract/docs -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-overview-dashboard-thien.md   <!-- - Overrides: đổi nhãn/màu nhóm cơ cấu độ lớn cho khớp earthquakes -->
  - .agents/notes/proposed/2026-11-23-overview-ranking-map-ux-thien.md
  - .agents/notes/proposed/2026-11-23-earthquakes-filter-header-controls-thien.md   <!-- nguồn quy ước dùng lại -->
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Trang `/earthquakes` đã có quy ước thống nhất trong `earthquake-insights.ts`: `MAGNITUDE_BANDS`
(5 mức: Rất nhẹ/Nhẹ/Trung bình/Mạnh/Rất mạnh), `DEPTH_BANDS` (3 mức: Nông/Trung bình/Sâu),
mỗi mức kèm `badgeClass` (`ds-badge-success|info|warning|error`), được render qua
`SeverityReferenceTable` với footnote "chỉ mang tính tham khảo".

### Vấn đề
Trang `/` (Overview) đang dùng quy ước **khác**: `severityLabel()` chỉ có 3 mức "Thấp/Trung bình/Cao"
(với tone `low|medium|high`), màu tự định nghĩa trong `OverviewPage.css`
(`.ov-severity--high → --destructive`, `--medium → --chart-4`, `--low → --chart-3`),
biểu đồ cơ cấu `OverviewSeverityChart` dùng 3 slice `minor/moderate/strong` với màu
`--primary/--chart-4/--destructive`, và **không hiển thị độ sâu** dù bảng có cột WGS84.

### Ảnh hưởng
Cùng một trận động đất có thể hiện "Cao" ở Overview nhưng "Mạnh"/"Rất mạnh" ở Danh mục,
màu sắc không đồng nhất → người dùng hiểu sai mức độ. Đây là lỗi FE/T7 thuần (I1).

---

## 2. Hiện trạng
| Tệp | Quy ước hiện tại |
|---|---|
| `apps/web/src/features/earthquakes/earthquake-insights.ts` | `MAGNITUDE_BANDS`, `DEPTH_BANDS`, `SEVERITY_NOTES`, `SEVERITY_FOOTNOTE` — nguồn chuẩn. |
| `apps/web/src/features/overview/overview-view.ts` | `severityLabel()` 3 mức; `buildSeverityMix()` 3 slice (`minor` <5.0, `moderate` 5.0–5.9, `strong` ≥6.0) từ `statistics.data`. |
| `apps/web/src/features/overview/OverviewPage.tsx` | Bảng "Sự kiện gần đây" dùng `<span className={`ov-severity ov-severity--${tone}`}>`; không có cột độ sâu. Bảng xếp hạng cũng dùng `severityLabel(row.maxMagnitude)`. |
| `apps/web/src/features/overview/OverviewPage.css` | `.ov-severity--high/medium/low` dùng `--destructive`, `--chart-4`, `--chart-3`. |
| `apps/web/src/components/charts/OverviewSeverityChart.tsx` | `SLICE_COLORS` = `--primary`, `--chart-4`, `--destructive`. |
| `apps/web/tests/overview-view.test.ts`, `overview-page.test.ts` | Assert 3 nhãn "Cao/Trung bình/Thấp" và class `ov-severity--${tone}` — cần cập nhật assertion (không xoá test). |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Overview **tái dùng trực tiếp** `MAGNITUDE_BANDS`/`DEPTH_BANDS`/`SEVERITY_FOOTNOTE` từ earthquakes làm nguồn sự thật duy nhất — không nhân bản bảng màu/hằng số.
  2. Nhãn mức độ ở bảng "Sự kiện gần đây" và bảng xếp hạng dùng đúng 5 mức và badge class của earthquakes; thêm cột **Độ sâu** với 3 mức Nông/Trung bình/Sâu.
  3. Màu biểu đồ cơ cấu độ lớn được ánh xạ từ token của earthquakes (success/info/warning/error), không dùng `--primary` cho nhóm yếu.
  4. Hiển thị cùng footnote "tham khảo, không phải cảnh báo chính thức" trên Overview.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi BE, API, contract, schema, migration, SSE, worker (I1/I3/I4).
  - Không đổi `earthquakes/` — chỉ **import** hằng số/hàm hiện có (I2/RULE-03).
  - Không đổi 6 Patterns, logic xếp hạng/khu vực, bản đồ, header/aside.
  - Không xoá/skip test đang pass; không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: giữ chữ ký `severityLabel`, `buildSeverityMix`, `OverviewSeverityChart` và mọi props; chỉ thêm hàm/prop optional và đổi nội dung render. FE thuần (I1) · không payload (I3) · token CSS, Dark Mode nguyên vẹn (I5) · test offline (I7).

### 4.1. Nguồn quy ước chung (không nhân bản)
- `apps/web/src/features/overview/overview-view.ts`:
  - import `MAGNITUDE_BANDS`, `DEPTH_BANDS` từ `../earthquakes/earthquake-insights.ts`.
  - `severityLabel(magnitude)` vẫn trả `{label, tone}` (giữ chữ ký) nhưng `label` lấy từ band tương ứng của `MAGNITUDE_BANDS` (`Rất nhẹ/Nhẹ/Trung bình/Mạnh/Rất mạnh`), `tone` mở rộng thành `"very_low"|"low"|"medium"|"high"|"very_high"` và kèm `badgeClass` lấy từ band. Giữ alias tone cũ (`low|medium|high`) cho caller/test cũ nếu cần (I2).
  - hàm mới `depthLabel(depthKm): { label; tone; badgeClass }` dùng `DEPTH_BANDS` (Dưới 70 km / 70–300 km / Trên 300 km), không bịa số khi `depthKm` không hợp lệ → `"—"`, `badgeClass: "ds-badge-neutral"`.
  - `buildSeverityMix()` giữ 3 slice API-driven (statistics chỉ có 3 field — không tự chia 5 nhóm giả), nhưng đổi `label` thành nhãn earthquakes tương ứng và đính kèm `badgeClass`: `minor → success`, `moderate → warning`, `strong → error`. `partial` giữ nguyên.

### 4.2. Render
- `OverviewPage.tsx`: thay `<span className="ov-severity ...">` bằng `<span className={`ds-badge ${severity.badgeClass}`}>` ở cả 2 bảng; thêm cột "Độ sâu" với `depthLabel(event.depth_km)` trong bảng sự kiện gần đây; thêm `<p className="ov-severity-footnote">{SEVERITY_FOOTNOTE}</p>` dưới bảng. Giữ `ov-severity` class làm alias tương thích (I2) nếu CSS/test cũ còn dùng.
- `OverviewPage.css`: `.ov-severity--*` đổi sang token `var(--success-dark)`, `var(--info-dark)`, `var(--warning-dark)`, `var(--error-dark)` theo thứ tự 5 mức; `.ov-severity-footnote` dùng `--muted-foreground`, `font-size: var(--text-xs)`.
- `OverviewSeverityChart.tsx`: `SLICE_COLORS` ánh xạ `minor → var(--chart-3)` (xanh lá, khớp `ds-badge-success`), `moderate → var(--chart-4)` (vàng, khớp warning), `strong → var(--destructive)` (đỏ, khớp error). Giữ `key` `minor|moderate|strong` để không vỡ tooltip/test.

### 4.3. Test (đồng thời khi §9 Approved — I7)
- `apps/web/tests/overview-view.test.ts`: cập nhật assert 5 mức mới + thêm `depthLabel` (biên 0/69.9/70/300/300.1/NaN/null) + `buildSeverityMix` giữ `badgeClass`.
- `apps/web/tests/overview-page.test.ts`: cập nhật assert render `ds-badge ${...badgeClass}` và cột "Độ sâu" + footnote; giữ assertion cũ còn hợp lệ.
- `apps/web/tests/severity-standard.test.ts` (mới): thuần — kiểm `MAGNITUDE_BANDS`/`DEPTH_BANDS` là nguồn duy nhất (`overview-view.ts` import, không định nghĩa lại mảng), map màu chart khớp token badge.
- Lệnh: `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### Phương án A: Nhân bản bảng màu/bands sang overview
Ưu: diff nhỏ, không đụng overview-view. Nhược: 2 nguồn sự thật, drift khi đổi earthquakes — chính là lỗi hiện tại. **Không chọn.**

### Phương án B (chọn): Import `MAGNITUDE_BANDS`/`DEPTH_BANDS` từ earthquakes, chỉ đổi render + token
Ưu: một nguồn quy ước, giữ chữ ký hàm/props, test offline được, không đụng BE/contract. Nhược: phải sửa vài assertion test cũ. **Chọn.**

### Phương án C: Đưa bands vào `contracts/` dùng chung cả BE
Ưu: chuẩn hóa tuyệt đối. Nhược: đụng contract/docs/BE, vượt phạm vi bug FE — proposal riêng. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp–trung bình | 4 tệp FE + 3 test, không logic API |
| Hiệu năng | Không đổi | Chỉ import hằng số tĩnh |
| Bảo trì / Open-Closed | Tốt | Một nguồn bands; giữ chữ ký/props cũ |
| Độ tin cậy | Tốt | Không bịa số; statistics vẫn 3 nhóm thật |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Test cũ assert "Cao/Trung bình/Thấp" fail | Cao | Thấp | Cập nhật assertion theo band mới, không xoá test |
| Biểu đồ 3 slice không khớp 5 band labels | Trung bình | Thấp | Ghi rõ statistics chỉ có 3 field; không tự chia 5 nhóm giả (I5) |
| Working tree timezone + local `sync` đang bị chặn | Cao | Trung bình | Cần xử lý trước khi rẽ nhánh mới; không commit lẫn code timezone |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-23-overview-severity-standard-thien.md` *(từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):** `apps/web/tests/severity-standard.test.ts` *(mới)* + cập nhật `overview-view.test.ts`, `overview-page.test.ts`
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`; so sánh tay nhãn/màu badge giữa `/` và `/earthquakes`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng đang thao tác xác nhận rõ trong chat 2026-11-23: "Approved" cho proposal chuẩn hóa Overview theo quy ước độ lớn/độ sâu/màu của earthquakes. Duyệt toàn bộ §4: import MAGNITUDE_BANDS/DEPTH_BANDS làm nguồn duy nhất, severityLabel 5 mức + badgeClass, depthLabel, badge render + cột độ sâu + footnote, chart ánh xạ token success/warning/error; statistics giữ 3 slice thật. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9. Sau `Approved`: cần xử lý working tree timezone đang dở (đang chặn `git-ship.sh sync`/`start`) rồi rẽ nhánh `refactor/2026-11-23-overview-severity-standard-thien`; sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`; code, test, validation rồi dừng **CHECKPOINT 1**.
