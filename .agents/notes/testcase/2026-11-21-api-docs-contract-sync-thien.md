# Testcase: Đồng bộ `docs/api/API.md` với hợp đồng và implementation

## Metadata
- ID: 2026-11-21-api-docs-contract-sync-thien
- Mode: proposal-paired   <!-- docs-only nhưng vẫn có test stdlib -->
- Proposal: .agents/notes/proposed/2026-11-21-api-docs-contract-sync-thien.md
- Target: `docs/api/API.md`
- Test File: `scripts/tests/test_api_docs_contracts.py`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- **Đối tượng:** 10 điểm drift trong proposal §2 (envelope rỗng, system status, statistics, 6 pattern, SSE).
- **Ràng buộc:** chỉ doc + test stdlib, không mạng, không đụng code sản xuất (I1–I7 không vi phạm).

---

## 2. Điều kiện tiên quyết & Fixtures
- **Mock:** đọc text `docs/api/API.md` và JSON từ `contracts/examples/*.json` bằng stdlib.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| `TC-01` | Envelope rỗng được mô tả | docs §2 | Có cụm `success: false`, `data: null`, `message` + giải thích HTTP 200 | PASS |
| `TC-02` | System status đúng key | docs §3.1 | Có `ingestion`, `analysis`, không còn `data_ingestion`/`data_analysis` | PASS |
| `TC-03` | Statistics đúng payload | docs §3.2 | Có `total_events`, `strong_events_count`; không còn `summary_24h` | PASS |
| `TC-04` | Histogram bin theo BE | docs §3.3 | Có `"< 2.0"`; không còn `"1.0 - 2.0"` | PASS |
| `TC-05` | Trend fields đủ | docs §3.3 | Có `r_squared`, `intercept`, `p_value`, `sample_size` | PASS |
| `TC-06` | Correlation fields đủ | docs §3.3 | Có `status`, `note`, `sample_size` | PASS |
| `TC-07` | Classification 4 nhãn | docs §3.3 | Có `Moderate`, `Critical`; không còn `Normal Activity` | PASS |
| `TC-08` | Pattern 5/6 hai shape | docs §3.3 | Có `confidence_interval.lower/upper` + alias `lower_bound/upper_bound`; `probabilities` + `probability_scores` | PASS |
| `TC-09` | SSE đủ route/event/packet | docs §3.5 | Có `/stream/earthquakes`, 6 event, `{"event","data","timestamp"}` | PASS |
| `TC-10` | `/patterns` được liệt kê | docs §3.3 | Có mục `GET /api/v1/patterns` | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
python3 -m unittest discover -s scripts/tests -v
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:** `python3 -m unittest discover -s scripts/tests -v` → 28/28 pass (10 TC mới + 18 test cũ). `python3 scripts/notes_index.py --check` → OK; `git-ship.sh scope` → OK (6 tệp). Không phát sinh lỗi, không tạo bug log.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
