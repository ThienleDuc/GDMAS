# Testcase: Trang Tổng quan — Bento Dashboard có biểu đồ so sánh

## Metadata
- ID: 2026-11-21-overview-dashboard-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-21-overview-dashboard-thien.md
- Target: `apps/web/src/features/overview/`, `apps/web/src/components/charts/Overview*.tsx`, `apps/web/src/app/App.tsx`
- Test File: `apps/web/tests/overview-view.test.ts`, `apps/web/tests/overview-page.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** view model thuần (KPI, severity mix, ranking country/region, trend comparison, seasonality bars, latest events, prediction), hook 404-tolerant, 4 chart component có câu hỏi/insight, page có 7 widget + grid/Dark Mode.
- **Ràng buộc:** I1 T7 shell · I2 không đổi contract/hàm cũ · I3 UTC `Z` + WGS84, không payload mới · I4 không migration · I5 chart mới trong `charts/`, không mock, Dark Mode token · I6 không secret · I7 offline 100%.

---

## 2. Fixtures
```json
{
  "statistics": { "data": { "total_events": 120, "recent_24h_count": 7, "max_magnitude": 6.4, "minor_events_count": 90, "moderate_events_count": 25, "strong_events_count": 5 } },
  "trend": { "data": { "resample_freq": "D", "metric": "event_count", "trend_direction": "increasing", "r_squared": 0.72, "series": [
    { "period": "2026-11-20", "actual_value": 8, "trend_value": 6.1, "is_complete": true },
    { "period": "2026-11-21", "actual_value": 3, "trend_value": 6.4, "is_complete": false }
  ] } },
  "seasonality": { "data": { "components": { "seasonal_line": [
    { "cycle_index": 2, "period_label": "02:00", "seasonal_factor": 1.4 },
    { "cycle_index": 9, "period_label": "09:00", "seasonal_factor": 0.8 }
  ] } } },
  "clusters": { "data": { "clusters": [
    { "cluster_id": 1, "center_latitude": 38.2, "center_longitude": 142.4, "event_count": 12, "avg_magnitude": 5.1, "max_magnitude": 6.4, "dominant_place": "Honshu, Japan" },
    { "cluster_id": 2, "center_latitude": -6.2, "center_longitude": 106.8, "event_count": 7, "avg_magnitude": 4.8, "max_magnitude": 5.2, "dominant_place": "Java, Indonesia" }
  ] } }
}
```

---

## 3. Ma trận Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | KPI từ statistics/clusters | Happy Path | fixture statistics + clusters | 4 KPI đúng giá trị; thiếu field → `null`, không 0 giả | `PASS` |
| `TC-02` | Cơ cấu độ lớn | Functional | minor/moderate/strong | tổng = 90/25/5; thiếu minor → phần biết rõ + cờ `partial` | `PASS` |
| `TC-03` | Xếp hạng theo quốc gia | Functional | clusters fixture | sort giảm eventCount; `Japan` trước `Indonesia`; có avg/max | `PASS` |
| `TC-04` | Xếp hạng theo khu vực | Functional | country = "Japan", clusters có `dominant_place` | `regionFromPlace` → khu vực; sort giảm; country khác bị loại | `PASS` |
| `TC-05` | Thiếu `dominant_place` | Resilience | cluster chỉ có `name` tiếng Việt | gộp "Khác" + chú thích, không tạo quốc gia giả | `PASS` |
| `TC-06` | So sánh trend | Boundary | trend fixture | 2 series actual/trend; `is_complete=false` → cờ `projected`; `trend_value=null` giữ null | `PASS` |
| `TC-07` | Seasonality baseline | Boundary | seasonality fixture | factor 1.4 → above, 0.8 → below; baseline 1.0 | `PASS` |
| `TC-08` | Insufficient data | Resilience | `status=insufficient_data` / mảng rỗng | trả `[]`, page hiện empty state, không crash, không mock | `PASS` |
| `TC-09` | Latest events sort UTC | Boundary | 3 event có `event_time` UTC | sort desc theo `Date.parse`, giữ WGS84 lat/lon | `PASS` |
| `TC-10` | 4 chart + 6 widget | Functional | đọc tĩnh `.tsx` | `App.tsx` dùng `<OverviewPage`; có 4 chart, live feed, forecast; **không** còn `ov-card__head` / `ov-card--12` / `ov-terminals` | `PASS` |
| `TC-12` | Nhãn mức độ tiếng Việt | Functional | `severityLabel(6.4/5.2/4.1/null)` | `Cao` / `Trung bình` / `Thấp` / `—` kèm tone `high/medium/low`; bảng dùng tiêu đề `Độ lớn TB`, `Độ lớn cao nhất`, `Mức độ` | `PASS` |
| `TC-13` | Rủi ro Pattern 6 tiếng Việt | Functional | `riskLabelVietnamese(LOW/MEDIUM/HIGH/CRITICAL)` + `formatPrediction(..., "High Activity")` | `Thấp` / `Trung bình` / `Cao` / `Rất cao`; không lộ `LOW/HIGH/...` | `PASS` |
| `TC-11` | Grid/Dark Mode token | Functional | đọc `OverviewPage.css` | grid `12/6/1`, dùng `var(--...)`, không hex | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm test
cd apps/web && pnpm build
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:** `overview-view.test.ts` 11/11 + `overview-page.test.ts` 2/2 pass · `pnpm test` **173/173 pass, 0 fail** · `pnpm build` PASS (main chunk 419 kB nhờ lazy-load `OverviewPage`) · `notes_index.py --check` OK.
- **Ghi chú:** `App.tsx` dùng `React.lazy` cho `OverviewPage` để giữ Recharts ra khỏi main bundle; `PlaceholderPage` chỉ còn làm Suspense fallback. `styles/index.css` được bổ sung 1 dòng import `OverviewPage.css` theo convention CSS tập trung. Cả 2 điểm đã thêm vào `plan.md` In Scope / Step.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
