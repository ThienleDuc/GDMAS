# Proposal: Đồng bộ `docs/api/API.md` với hợp đồng và implementation BE/FE hiện tại

## Metadata
- ID: 2026-11-21-api-docs-contract-sync-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: docs
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: `docs/api/API.md` (duy nhất), `scripts/tests/test_api_docs_contracts.py` (mới)
- Architecture Impact: docs/api/API.md
  <!-- Cập nhật payload/param/event examples cho khớp implementation BE thật; KHÔNG đổi endpoint, schema repo contracts/, code apps/api hay apps/web. Chủ vùng nội dung T6: tai — ghi rõ trong mô tả PR. -->
- Related Docs:
  - docs/api/API.md (§2 envelope, §3.1 system, §3.2 statistics, §3.3 patterns, §3.5 SSE, §4 lỗi)
  - docs/yeucaubatbuoc.md §2 (6 pattern), docs/architecture.md §12, docs/architecture/SAD.md §5
  - contracts/README.md §3.1–§3.8, contracts/schemas/*.json, contracts/examples/*.json
  - apps/api/src/gdmas/api/routes/{analysis,predictions,statistics,system,patterns}.py (BE thật — nguồn đối chiếu)
  - apps/web/src/contracts/*.ts (FE đã khớp BE ở hầu hết trường)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md — BE đã triển khai 9 endpoint nhưng `API.md` chưa được cập nhật theo payload thật; proposal này **bổ sung tài liệu**, không sửa quyết định BE.
  - .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md — BE định nghĩa empty state/SSE; proposal này ghi nhận cách FE tiêu thụ (không đổi logic).
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md — T7.02 đã audit FE, ghi nhận drift docs-only; proposal này xử lý phần drift đó.
  - .agents/notes/proposed/2026-11-21-statistics-six-patterns-charts-thien.md — FE vừa gặp 2 blocking do docs mô tả sai payload (`predictions`/`classifications`); FE đã tự adapter, proposal này làm rõ payload gốc cho lần sau.
  - Overrides: none   <!-- không thay quyết định cũ; chỉ cập nhật tài liệu bị lỗi thời -->
- Related Bugs: none
  <!-- BUG-thien-001 (dải tin cậy Pattern 5) đã fixed; docs nên mô tả CI theo dạng BE trả (confidence_interval.lower/upper) để tránh tái phạm. -->

---

## 1. Vấn đề
### Bối cảnh
Trong các đợt implement T6/T7 trước, BE và FE đã thống nhất payload thật qua contract và code, nhưng `docs/api/API.md` vẫn giữ nhiều mô tả và ví dụ ban đầu. Kết quả: khi đọc docs để triển khai FE mới (T7.06–T7.09), tầng transform đã phải thêm adapter cho 2 payload bị docs mô tả sai.

### Vấn đề
`docs/api/API.md` đang lệch implementation ở 10 điểm (chi tiết §2), gồm cả các điểm từng gây lỗi runtime khi dùng API thật (Pattern 5/6).

### Ảnh hưởng
- Người đọc docs (thành viên mới, hội đồng, bài báo cáo) hiểu sai payload/param.
- FE implement theo docs sẽ lặp lại lỗi đã sửa (`confidence_interval`, `probabilities`, empty state).
- Vi phạm nguyên tắc "tài liệu là nguồn sự thật" của GDMAS (`AGENTS.md`, I3).

---

## 2. Hiện trạng — bảng drift (đã đối chiếu read-only)

| # | `docs/api/API.md` đang ghi | BE/FE thật | Mức | Hướng sửa |
|---|---|---|---|---|
| D1 | §3.2 `/statistics/earthquakes`: `summary_24h`, `summary_7d`, `magnitude_distribution` (`API.md:178-201`) | `total_events`, `strong_events_count`, `moderate_events_count?`, `minor_events_count?`, `recent_24h_count`, `avg_magnitude`, `max_magnitude`, `latest_event_time?`, `time_series_preview?` (`statistics.py:111-123`; FE `contracts/earthquake.ts:60-73`) | docs-only | Thay ví dụ + field list theo BE |
| D2 | §3.1 `/system/status`: key `data_ingestion`, `data_analysis`, status `running/active/connected` (`API.md:102-107`) | key `ingestion`, `analysis`, `clustering`, `prediction`, `api`, `frontend`, `postgres`; status `active/idle/error/unknown` (`system.py:25-30,84-120`; FE `contracts/system-status.ts:15-22`) | docs-only | Đổi key + enum status |
| D3 | §3.3 `/classifications`: 3 nhãn `Low Activity / Normal Activity / High Activity` (`API.md:353-357`) | BE phát 4 nhãn `Low / Moderate / High / Critical` (`prediction/inference.py:18`, `service.py:121`); FE `normalizeRiskLabel` hỗ trợ cả 2 bộ | docs-only | Ghi 4 nhãn canonical + ghi chú alias cũ vẫn được chấp nhận |
| D4 | §3.5 chỉ có `/events/stream`, event `earthquake_alert`, `data` phẳng (`API.md:403-414`) | BE có cả `/stream/earthquakes` + `/events/stream`; 6 event (`earthquake_detected`, `earthquake_alert`, `heartbeat`, `ingestion_cycle_completed`, `database_cleared`, `alert`); packet `data: {event,data,timestamp}` (`realtime/sse.py:59-62,192-296`; FE `contracts/sse.ts:8-28`, `lib/sse.ts:85-104`) | docs-only | Bổ sung route/event + cấu trúc packet |
| D5 | §2 chỉ mô tả envelope `success:true` / lỗi 4xx-5xx | BE trả **HTTP 200 + `{success:false, data:null, message}`** cho rỗng/`insufficient_data` (`predictions.py:18-20,40-41`; `clusters.py:45-46`; `analysis.py:86-89`; `patterns.py:39-45`); FE xử lý như Empty State | docs-only | Thêm mục "Phản hồi rỗng hợp lệ" |
| D6 | §3.3 `/analysis/trend` example thiếu `r_squared`, `intercept`, `p_value`, `sample_size` | Contract/FE/schema/fixture có các field này (`contracts/schemas/analysis.json:112-117`, `apps/web/src/contracts/analysis.ts:62-67`, `analysis_sample.json:90-95`) | docs-only | Bổ sung ví dụ + ghi chú BE route hiện **chưa trả** (xem §7) |
| D7 | §3.3 `/analysis/correlation` example thiếu `status`, `note`, `sample_size`, `spearman_matrix` | FE contract `apps/web/src/contracts/analysis.ts:104-115` khai báo; BE route `analysis.py:232-237` chưa trả `status/note` | docs-only | Bổ sung field optional + ghi chú tương tự D6 |
| D8 | §3.3 histogram bin `"1.0 - 2.0" … ">= 5.0"` | BE sinh `< 2.0 … >= 5.0` (`patterns.py:42-48`); fixture đã dùng nhãn BE | docs-only | Đổi ví dụ cho khớp BE |
| D9 | Không liệt kê `GET /api/v1/patterns` dù là hợp đồng chính (`contracts/README.md:81-100`) | FE có `getPatterns()` (`earthquake-api.ts:145-147`), BE có route (`patterns.py:34-167`) | docs-only | Thêm mục §3.3 Pattern 0/tổng hợp |
| D10 | §3.3 `/predictions` example chi tiết metric nhưng không cảnh báo alias | BE trả `forecasted_metric`, `confidence_interval{lower,upper}`, `evaluation_metrics{mae,rmse}`; `/patterns` trả alias phẳng `lower_bound/upper_bound` | docs-only | Ghi rõ 2 shape + khuyến nghị FE adapter (đã áp dụng ở `asPrediction`) |

Không có thay đổi nào cần thực hiện ở `apps/api/**` hay `contracts/schemas/` trong proposal này.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Sửa `docs/api/API.md` để mô tả **đúng payload/param/event BE đang trả**, đối chiếu với `contracts/schemas/*.json`, `contracts/examples/*.json` và FE contracts.
  2. Bổ sung mục "Phản hồi rỗng hợp lệ" và "Hai dạng payload Pattern 5/6" để tránh tái phạm lỗi adapter.
  3. Thêm test doc-contract offline để ngăn drift tái diễn.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi endpoint, route, logic, schema, migration, `.env`, code FE/BE, `AGENTS.md`, `docs/quyuocchung.md`.
  - Không tự ý sửa `apps/api/**` để trả thêm `r_squared`/`note`/`status` — đó là proposal riêng (chủ vùng T3/T6, xem §7).
  - Không commit/push/merge.

---

## 4. Giải pháp đề xuất
### 4.1. Chỉnh `docs/api/API.md`
- §2: thêm ví dụ `200` + `{success:false, data:null, message}`; làm rõ đây là rỗng, không phải lỗi.
- §3.1: đổi key service + enum status theo D2.
- §3.2: thay ví dụ statistics theo D1.
- §3.3: bổ sung mục `/api/v1/patterns` (D9); chỉnh histogram (D8); thêm `r_squared/intercept/p_value/sample_size` (D6), `status/note/sample_size/spearman_matrix` (D7); đổi nhãn classification (D3); thêm ghi chú 2 shape predictions/classifications (D10).
- §3.5: bổ sung `/stream/earthquakes`, 6 event, packet `{event,data,timestamp}` (D4).
- Giữ nguyên §1 nguyên tắc thiết kế, §4 bảng mã lỗi, timestamps UTC `Z`, tọa độ WGS84.

### 4.2. Test doc-contract offline
- `scripts/tests/test_api_docs_contracts.py` (mới, `unittest` stdlib): đọc `docs/api/API.md`, trích các khối JSON dưới endpoint, kiểm tra:
  - các field bắt buộc theo `contracts/schemas/*.json` có mặt trong ví dụ;
  - nhãn phân loại trong docs là 4 nhãn canonical;
  - docs có nhắc đủ 6 event SSE + packet `event/data/timestamp` + empty envelope.
- Không dùng `jsonschema` (chưa cài); chỉ check cấu trúc/text bằng stdlib → chạy offline.

---

## 5. Phương án đã cân nhắc
### Phương án A: Sửa thẳng `API.md` không test
Ưu: nhanh. Nhược: drift sẽ tái diễn ở đợt sau. **Không chọn.**
### Phương án B (chọn): Sửa docs + test doc-contract stdlib
Ưu: tài liệu tự kiểm được, không thêm dependency, không đụng code sản xuất. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +1 file test stdlib, sửa 1 file docs | Tài liệu là nguồn sự thật cần được bảo vệ |
| Rủi ro | Thấp — không đụng runtime | Chỉ markdown + test đọc file |
| Bảo trì | Tốt | Test chặn drift khi BE đổi payload |

---

## 7. Rủi ro & phần ghi nhận không tự sửa
- BE `/analysis/trend` hiện **chưa trả** `r_squared/intercept/p_value/sample_size`; `/analysis/correlation` chưa trả `status/note` dù T3 có tính. Docs sẽ ghi các field này là **optional/có trong schema** và ghi chú rõ "route hiện chưa trả — chờ cập nhật BE". Cần proposal riêng cho T3/T6 (người dùng sẽ quyết định ở câu hỏi cuối phiên trước đó).
- `docs/api/API.md` là vùng chung — mọi thay đổi phải ghi rõ trong PR: "đối chiếu với BE, chủ vùng T6: `tai`".
- Không sửa `contracts/README.md` trừ khi phát hiện mâu thuẫn; nếu có, ghi `Related Docs` và đưa vào câu hỏi cuối phiên.

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-api-docs-contract-sync-thien.md` *(từ `_TEMPLATE.md`, `Mode: proposal-paired`, hoặc docs-only → ghi rõ)*
- **Code test tự động (offline):** `scripts/tests/test_api_docs_contracts.py` *(mới — `python3 -m unittest`, không mạng)*
- **Cách kiểm chứng:** `python3 -m unittest discover -s scripts/tests -v` (hoặc chạy riêng file), `python3 scripts/notes_index.py --check`; đối chiếu thủ công 10 mục §2 với BE/contracts.
- **Không** chạy `pnpm build`/`uv run pytest` (không đụng code sản xuất).

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: Người dùng đang thao tác (`thien`) xác nhận rõ trong chat: "Approved" cho `.agents/notes/proposed/2026-11-21-api-docs-contract-sync-thien.md` (2026-11-21). Duyệt §4: sửa `docs/api/API.md` theo 10 điểm drift đã đối chiếu + test doc-contract stdlib. Không đụng code sản xuất, contracts, AGENTS.md, docs/quyuocchung.md. Nhánh `docs/...` sẽ tách riêng để không làm dở công việc statistics.
Scope of Rejection: -   <!-- bắt buộc khi Rejected -->

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ `thien|son|van|tai`, **không cần `ThienleDuc`**). Sau `Approved`: rẽ nhánh `docs/2026-11-21-api-docs-contract-sync-thien` từ `develop` (lưu ý working tree hiện có công việc statistics chưa commit — cần hoàn tất/tách riêng trước khi chuyển nhánh), sinh `implemented/<id>/` + `testcase/<id>.md`, sửa docs + test, validation, dừng CHECKPOINT 1.
