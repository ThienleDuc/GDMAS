<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Fallback cụm thật từ `/patterns` (RD-15)

## Metadata
- ID: 2026-11-22-patterns-cluster-fallback-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-patterns-cluster-fallback-thien.md
- Target: apps/web/src/services/earthquake-api.ts (`getClustersOptional`), apps/web/src/lib/transforms/cluster-fallback.ts, apps/web/src/contracts/common.ts (`isApiEnvelope` — sửa để `/patterns` aggregate hợp lệ)
- Test File: apps/web/tests/cluster-fallback.test.ts, apps/web/tests/services.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Khi `/clusters` trả 404, service thử `/patterns` và trả cụm legacy đã map sang `ClustersResponse`; consumer (`useEarthquakeInsights`, `GlobalCountryFilter`) nhận dữ liệu thật mà không đổi code.
- **Ràng buộc GDMAS liên quan:**
  - [x] I1 — chỉ gọi T6 qua service, không mạng trực tiếp ngoài `fetchApi`.
  - [x] I2 — giữ chữ ký `getClustersOptional(signal?)`, không đổi `normalizeClusters()`.
  - [x] I3 — timestamp UTC `Z`, toạ độ WGS84; không nội suy số thiếu.
  - [x] I5 — fallback sang **dữ liệu thật** `/patterns`, tuyệt đối không mock.
  - [x] I7 — test offline 100% (mock `globalThis.fetch`).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test`, mock `globalThis.fetch` như `apps/web/tests/services.test.ts`; payload `/patterns` lấy shape từ `contracts/examples/patterns_sample.json` (`clustering_summary.clusters` dạng `id/lat/lon/events_count/avg_mag`).
```json
{
  "success": true,
  "total_patterns": 6,
  "patterns": [],
  "clustering_summary": {
    "clusters": [
      { "id": 1, "name": "Honshu, Japan", "lat": 38.29, "lon": 142.38, "events_count": 12, "avg_mag": 5.4 }
    ]
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Map legacy → canonical | Functional | payload `/patterns` có 1 cụm legacy | `cluster_id=1`, `center_latitude=38.29`, `event_count=12`, `avg_magnitude=5.4`, `max_magnitude=null`, `name` giữ nguyên | `PASS` |
| `TC-02` | Payload rỗng / thiếu `clustering_summary` | Resilience | `success:false` hoặc `clustering_summary:null` | `clustersFromPatterns()` trả `null`, không tạo cụm giả | `PASS` |
| `TC-03` | Không nội suy field thiếu | Boundary | legacy thiếu `avg_mag`/`name` | `avg_magnitude=null`, `name=null`; không gán 0 | `PASS` |
| `TC-04` | `/clusters` 200 → không gọi `/patterns` | Functional | fetch trả 200 cho `/clusters` | `unavailable:false`, số request = 1 | `PASS` |
| `TC-05` | `/clusters` 404 → fallback thật | Functional | 404 rồi `/patterns` trả cụm | `unavailable:false`, `data.clusters[0].cluster_id=1`, URL có cả 2 path | `PASS` |
| `TC-06` | Cả 2 404 / `/patterns` rỗng | Resilience | `/clusters` 404, `/patterns` empty-state | `unavailable:true`, `data:null` (giữ hành vi cũ) | `PASS` |
| `TC-07` | `/patterns` 500 | Negative | fetch `/clusters` 404, `/patterns` 500 | Vẫn `{unavailable:true, data:null}`, **không throw**, không đổi Error State consumer | `PASS` |
| `TC-08` | UTC & WGS84 | Boundary | toạ độ biên trong payload legacy | Giữ nguyên, không đổi giá trị | `PASS` |
| `TC-09` | `/patterns` aggregate envelope hợp lệ | Functional | `getPatterns()` nhận `{success:true,total_patterns,patterns}` không có `data` | Không ném ApiError, trả đúng `total_patterns` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/cluster-fallback.test.ts tests/services.test.ts -v
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 18 test chuyên biệt PASS (cluster-fallback + services); `pnpm test` 183/183 PASS; `pnpm build` PASS; `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
