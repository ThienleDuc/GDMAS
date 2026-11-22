# Testcase: Panel khu vực dùng cụm thật (GAP-05)

## Metadata
- ID: 2026-11-22-region-clusters-no-mock-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-region-clusters-no-mock-thien.md
- Target: apps/web/src/features/monitoring/mock-region-clusters.ts, region-clusters.ts (buildRegionClusterRows), MonitoringMapPage.tsx
- Test File: apps/web/tests/region-clusters.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `fetchRegionClusters()` lấy cụm thật từ `/clusters` (đã có `dominant_place` sau GAP-01), map sang `RegionClusterRow`.
- **Ràng buộc:** I1 (chỉ API T6), I2 (giữ export `fetchRegionClusters`, thêm `signal?`), I3 (không bịa số — magnitude thiếu → NaN → `buildRegionClusters` bỏ qua), I5 (không mock), I7 (test offline mock fetch).

---

## 2. Dữ liệu mẫu (Fixtures)
- `/clusters` 200: `{success:true, data:{clusters:[{cluster_id:1, center_latitude:38.2, center_longitude:142.4, event_count:3, avg_magnitude:5.4, max_magnitude:6.1, dominant_place:"Honshu, Japan"}, ...]}}`.
- 404: error envelope → `unavailable:true` → `[]`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Map cụm thật | Functional | payload canonical có `dominant_place` | `country="Japan"`, `region="Honshu"`, `eventCount` đúng | `PASS` |
| `TC-02` | Fallback `name` | Functional | chỉ có `name` | Dùng `name` làm place; không rỗng | `PASS` |
| `TC-03` | Không bịa magnitude | Boundary | `avg_magnitude:null` | Row vẫn gom (eventCount), avg `null` | `PASS` |
| `TC-04` | 404/empty | Resilience | fetch 404 hoặc `data.clusters:[]` | Trả `[]`, không mock | `PASS` |
| `TC-05` | Không còn mock trong src | Regression | source `mock-region-clusters.ts` | Không có `MOCK_SOURCES`/`getMockRegionClusters` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/region-clusters.test.ts -v
cd apps/web && pnpm test && pnpm build
cd apps/api && uv run pytest -q
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 5/5 test regional PASS; `pnpm test` 212/212 + build PASS; BE 313/313.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
