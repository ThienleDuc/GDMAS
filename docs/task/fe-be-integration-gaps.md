# Chức năng Còn Thiếu / Chưa thể Tích hợp BE → FE — Danh sách Task nhỏ

> **Ngày đối chiếu:** 2026-11-22 · **Người đối chiếu:** `thien` · **Nhánh:** `docs/fe-be-contract-integration-audit-thien`
>
> File **thứ hai** trong cặp kết quả audit FE↔BE. File còn lại:
> [`fe-be-integration-ready.md`](fe-be-integration-ready.md) — các chức năng đã sẵn sàng.
>
> **Yêu cầu kèm theo của đầu việc:** *"thay đổi phía BE để đồng bộ FE"* → các task **GAP-01…GAP-04, GAP-06, GAP-07** là đầu việc sửa BE, được ghi lại dưới dạng task để chủ vùng triển khai. **Nhánh này chỉ build danh sách task — không sửa mã nguồn `apps/**`** (quyết định của người dùng 2026-11-22). Các task chạm `contracts/` chỉ thực hiện sau khi có phê duyệt (đã được chấp thuận cho GAP-07).

---

## 0. Định nghĩa "chưa thể tích hợp"

Một chức năng rơi vào file này khi **FE contract đã khai báo field/shape nhưng BE route không trả**, khiến FE phải:
- hiển thị `"—"` / "chưa có dữ liệu kiểm định" dù T3/T4/T5 đã tính ra số (`I3` — mất thông tin thật);
- gộp nhãn thành `"Khác"` dù có địa danh thật (`overview-view.ts:174-180`);
- dùng mock ở view chính thức (`mock-region-clusters.ts`, vi phạm `I5`);
- hoặc bỏ qua sự kiện realtime dù SSE đã phát (`monitoring-view.ts:112-118`).

**Nguyên tắc sửa:** chỉ **pass-through thêm field** (additive) từ dữ liệu T3/T4/T5 đã có sẵn trong DB → **không migration Alembic** (`I4`), **không đổi chữ ký hàm/route cũ** (`I2`), **không đụng `contracts/`** trừ khi có phê duyệt riêng (`I6`, vùng khóa). Kiểm tra `additionalProperties:false` trong schema trước khi thêm field.

Bảng dưới đây phân biệt rõ: **Field đã có trong schema repo → thêm an toàn** vs **Field chưa có trong schema → phải xin đổi contract trước**.

---

## 1. Bảng tổng hợp gap

| Task | Chức năng / Field thiếu | FE contract (đọc ở đâu) | BE route / nguồn | Tác động FE hiện tại | Mức | Chủ vùng | Trạng thái / hướng xử lý |
|---|---|---|---|---|---|---|---|
| **GAP-01** | `/clusters` thiếu `dominant_place`, `radius_km` (và `max_magnitude` không ổn định) | `clusters.ts:14-16`; `map-data.ts:110-151`; `country-clusters.ts:47-50` | `routes/clusters.py:19-29` `_cluster()`; nguồn `clustering.py` JSONB đã có chỗ chứa | Xếp hạng Overview rơi `"Khác"`; popup bản đồ mất bán kính/địa danh; header lọc quốc gia suy yếu | **Cao** | `van` (T4) + `tai` (T6) | ✅ **Đã xong code + validation** — pass-through `_cluster()` (xem §5) |
| **GAP-02** | `/analysis/trend` thiếu `intercept`, `r_squared`, `p_value`, `sample_size` | `analysis.ts:62-67`; `overview-view.ts:264-269`; `ai-insights.ts:119-152` | `routes/analysis.py:155-189` `build()`; T3 có tại `services/analysis/patterns.py:366,368,369,372-373` | Chart A Overview & Pattern 2 mất độ tin cậy mô hình (hiện `"—"`) | **Cao** | `son` (T3) + `tai` (T6) | ✅ **Đã xong code + validation** — pass-through từ `source` (xem §5) |
| **GAP-03** | `/analysis/correlation` thiếu `status`, `sample_size`, `note` | `analysis.ts:107-112`; `ai-insights.ts:189-235` | `routes/analysis.py:232-237` `build()`; T3 có tại `patterns.py:572,577,579` | Heatmap không phân biệt `insufficient_data`; mất hệ số mẫu & chú thích "không suy diễn nhân quả" | **Cao** | `son` + `tai` | ✅ **Đã xong code + validation** — 3 field đã có trong `analysis.json` (xem §5) |
| **GAP-04** | `/analysis/temporal` thiếu `status`, `stats`; `/analysis/seasonality` thiếu `status`, `period`, `data_points` | `analysis.ts:32,37-42,82,91`; `chart-data.ts:371-407` | `routes/analysis.py:124-137,199-223`; T3 có tại `patterns.py:244,249-252,470,473,482` | Empty State không đọc được thông điệp `insufficient_data` của BE; mất số điểm dữ liệu | Trung bình | `son` + `tai` | ✅ **Đã xong code + validation** — pass-through (xem §5) |
| **GAP-05** | FE dùng mock ở view chính thức (`mock-region-clusters.ts`) | `country-clusters.ts:6-12` (view model FE-only) | Hệ quả của GAP-01; BE không có endpoint riêng cho "khu vực" | Panel lọc khu vực trên `/monitoring` hiển thị 8 địa danh giả → vi phạm `I5` | **Cao** | `thien` (T7) | ✅ **Đã xong code + validation** — bỏ mock, dùng `/clusters` + `[]` (xem §5) |
| **GAP-06** | SSE inner `data` shape không khớp FE: BE gửi `new_events[]`/`alert_events[]`, FE đọc phẳng `latitude/magnitude` | `sse.ts:19-28`; `monitoring-view.ts:108-141`; `docs/api/API.md:453-462` | `realtime/sse.py:256-293` (packet `earthquake_detected`/`earthquake_alert`) | Marker realtime gần như không bao giờ được thêm vào bản đồ (`applySseEvent` trả nguyên mảng cũ) | **Cao** | `tai` (T6) + `thien` (T7) | ✅ **Đã xong code + validation** — BE bổ sung field phẳng, giữ field cũ (xem §5) |
| **GAP-13** | Toast "Dữ liệu đã được cập nhật" bắn theo đồng hồ cục bộ, không theo SSE; SSE `ingestion_cycle_completed` (5 phút) chỉ được dùng để phục hồi DB | `DataRefreshLabel.tsx:24-30`; `useDatabaseReset.ts:48-58` | BE phát `ingestion_cycle_completed` mỗi chu kỳ T2 (`sse.py:256-266`) | Toast báo cập nhật giả; event thật không bắn toast | Trung bình | `thien` (FE) | ✅ **Đã xong code + validation** — giữ toast cũ, đổi nguồn kích hoạt sang SSE (xem §5) |
| **GAP-07** | `/patterns` P5 thiếu `metric_name`, `model_version`, `evaluation_metrics`, `generated_at`; P6 thiếu `model_version`, `evaluation_metrics` | `patterns.ts:9-17`; `chart-types.ts:138-163`; `contracts/README.md:98` | `routes/patterns.py:103-157`; DB đã có (`models/prediction.py:25,31-39,57-63`) | Typed view FE đọc `undefined`; UI hiện "chưa có dữ liệu kiểm định" dù DB có số | Trung bình | `tai` + `thien` | ✅ **Đã xong code + validation** — ghi chú contracts cập nhật, BE `/patterns` pass-through field (xem §5) |
| **GAP-08** | `/predictions` thiếu top-level `confidence_level`; `/classifications` thiếu alias `probability_scores` | `predictions.ts:36`; `classifications.ts:15-16` | `routes/predictions.py:42-61,85-96` | Không chặn — FE đã adapter (`asPrediction`, `asClassification`) | Thấp | `tai` | ✅ **Đã xong** — user chọn bổ sung BE: `confidence_level` + `probability_scores` (xem §6) |
| **GAP-09** | SSE chưa phát event `"alert"`; chưa gửi header `id:`/`retry:` | `sse.ts:8-15,25-27` | `realtime/sse.py:59-62`, phát `:192-304` | Không chặn — FE đăng ký cả tên lạ; reconnect backoff tự tính | Thấp | `tai` | ✅ **Đã xong** — user chọn bổ sung BE: phát `alert` + `id`/`retry` (xem dưới) |
| **GAP-10** | `time_series_preview[].time` là `"HH:MM"` thay vì ISO 8601 UTC | `earthquake.ts:56-60`; `API.md:211`; `earthquake.json:21` | `routes/statistics.py:52` `strftime("%H:%M")` | FE đọc chuỗi `string` nên không crash, nhưng lệch `I3` nếu dùng làm mốc thời gian | Trung bình | `thien` (FE) | ✅ **Đã xong** — comment contract `earthquake.ts`: `time` là nhãn `HH:MM`, không parse ISO (xem §5) |
| **GAP-11** | Empty state `/patterns` mâu thuẫn nội bộ: prose `API.md` đòi `data:null`, schema `patterns.json` lại không định nghĩa `data` | `common.ts:95-104` `isApiEmptyEnvelope` | `routes/patterns.py:39-45` trả `{success:false,total_patterns:0,patterns:[],message}` | FE vẫn render Empty State được, nhưng contract không nhất quán | Trung bình | `thien` + `tai` | ✅ **Đã xong** — prose `docs/api/API.md` §2/§3.3 đúng shape empty `/patterns`, không sửa schema (xem §5) |
| **GAP-12** | `/system/status` thiếu `records_processed`, `error_message`, `generated_at`; `/health` thiếu `degraded/unhealthy`, `uptime_seconds` | `system-status.ts:7-13,38-40,53`; `health.ts:6-16` | `routes/system.py:67-75,84-131` | Không chặn — FE coi `last_run` thiếu là `unknown` | Thấp | `tai` | ✅ **Đã xong** — user chọn bổ sung BE (xem dưới) |

---

## 2. Đầu việc chi tiết (dành cho chủ vùng triển khai)

### GAP-01 — `/api/v1/clusters` trả đủ địa danh & bán kính

- **Đụng:** `apps/api/src/gdmas/api/routes/clusters.py` — hàm `_cluster()` (dòng 19-29).
- **Thay đổi:** copy thêm `radius_km`, `dominant_place`, `max_magnitude` (canonical, fallback alias nếu payload legacy); `name` trả ổn định dưới dạng `str | None`. Không đổi chữ ký `_cluster()`, không sửa `models/clustering.py` (JSONB), không migration.
- **Schema:** cả 3 field đã có trong `contracts/schemas/clusters.json:61-67` (optional) → an toàn.
- **Acceptance:** payload có `dominant_place = "Honshu, Japan"` → `groupClustersByCountry()` bỏ nhóm `"Khác"`; thiếu field → fallback `eps_km` như cũ, không bịa số.
- **Test:** `apps/api/tests/unit/test_cluster_contract_fields.py` (mới) — canonical + legacy + missing field.

### GAP-02 — `/api/v1/analysis/trend` pass-through hệ số hồi quy

- **Đụng:** `apps/api/src/gdmas/api/routes/analysis.py` — `build()` trong `get_trend()` (dòng 155-189).
- **Thay đổi:** thêm `intercept`, `r_squared`, `p_value` từ `source`; `sample_size` lấy theo thứ tự `source.sample_size → source.complete_periods → source.data_points`; đảm bảo `status` luôn có (fallback `"computed"` khi nguồn cũ không có).
- **Schema:** `analysis.json:113-117` đã định nghĩa → an toàn.
- **Acceptance:** `GET /analysis/trend?resample_freq=M&metric=count` trả `r_squared > 0` khi T3 có; series vẫn giữ nguyên (không relabel sai metric).
- **Test:** mở rộng `apps/api/tests/unit/test_analysis_trend_route.py` (kiểm chứng field mới bằng snapshot T3 thật).

### GAP-03 — `/api/v1/analysis/correlation` pass-through trạng thái & chú thích

- **Đụng:** `apps/api/src/gdmas/api/routes/analysis.py` — `build()` trong `get_correlation()` (dòng 232-237).
- **Thay đổi:** thêm `status`, `sample_size`, `note` từ `metrics_data`. **Không** thêm `spearman_matrix`/`undefined_pairs`/`corr_mag_depth` vì `analysis.json:168-192` có `additionalProperties:false` chưa định nghĩa (đưa vào GAP riêng nếu cần).
- **Acceptance:** `status = "insufficient_data"` → FE `resolvePatternView` hiển thị thông điệp từ `note`; `sample_size` đúng số dòng T3.
- **Test:** `apps/api/tests/unit/test_analysis_contract_fields.py` (mới).

### GAP-04 — `/analysis/temporal` & `/analysis/seasonality` pass-through field optional

- **Đụng:** `apps/api/src/gdmas/api/routes/analysis.py` — `build()` của `get_temporal()` (124-137) và `get_seasonality()` (199-223).
- **Thay đổi:** temporal thêm `status` + `stats{data_points, avg_magnitude, max_magnitude, avg_depth}` (gom từ `metrics_data`, không nội suy); seasonality thêm `status`, `period`, `data_points`.
- **Acceptance:** field chỉ xuất hiện khi nguồn có; không trả số 0 thay cho `null`.
- **Test:** gộp vào `test_analysis_contract_fields.py`.

### GAP-06 — SSE inner `data` bổ sung field phẳng cho marker bản đồ

- **Đụng:** `apps/api/src/gdmas/realtime/sse.py` — các chỗ phát `earthquake_detected` (`:269-279`) và `earthquake_alert` (`:284-293`).
- **Thay đổi:** giữ nguyên `title/message/new_events[]/alert_events[]`, **bổ sung** `source_event_id`, `event_time`, `latitude`, `longitude`, `magnitude`, `depth_km`, `place`, `magnitude_type`, `source_url` từ sự kiện đầu tiên trong mảng (packet phẳng theo `API.md:455` và `sse.ts:19-28`). Không xoá field cũ (RULE-03), không đổi cấu trúc bọc `{event,data,timestamp}`.
- **Acceptance:** FE `applySseEvent` đọc `payload.data.latitude/magnitude` → thêm marker ngay trên bản đồ; khi mảng rỗng không emit field phẳng (FE giữ nguyên danh sách).
- **Test:** `apps/api/tests/unit/test_sse_stream.py` (bổ sung case) — assert inner data có field phẳng, outer vẫn đúng bọc.

---

## 3. Quyết định của người dùng (2026-11-22) — định hướng triển khai các task

> Nhánh này **chỉ build task**: không file nào trong `apps/**`, `contracts/**` hay `docs/api/API.md` bị sửa. Các quyết định dưới đây là **định hướng để chủ vùng triển khai**, không phải công việc đã làm.

| Hạng mục | Quyết định / định hướng |
|---|---|
| GAP-05 (mock FE) | Lỗi FE (`I5`) — dứt điểm sau GAP-01; tách task riêng |
| GAP-09 (SSE `"alert"` / header `id`,`retry`) | Không chặn — cần nhóm quyết định bỏ tên khỏi contract hay phát thêm |
| GAP-07 (`/patterns` P5/P6) | User **cho phép sửa contracts**, nhưng chỉ ghi chú (không đổi shape schema): cập nhật `patterns.json`/`README.md`, BE pass-through field |
| GAP-10 (`HH:MM`) | User chọn **sửa FE, không sửa BE**: `earthquake.ts` ghi rõ `time` là nhãn hiển thị, không parse ISO |
| GAP-11 (empty `/patterns`) | User **"không sửa schema"**: chỉ cập nhật prose `docs/api/API.md` §2/§3.3 cho đúng shape thực tế |
| GAP-13 (toast ↔ SSE) | BE xác nhận phát `ingestion_cycle_completed` mỗi 5 phút (`sse.py:256-266`); giữ toast cũ, đổi nguồn kích hoạt sang SSE (không CSS lại) |
| Migration Alembic, phần còn lại của `contracts/**` | Giữ nguyên quy tắc vùng khóa (I4/I6) |

---

## 4. Cách kiểm chứng khi triển khai task

Khi chủ vùng nhận task, tạo proposal/testcase theo quy trình GDMAS rồi kiểm chứng:

```bash
cd apps/api && uv run pytest <test_file> && uv run pytest
cd apps/api && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
./scripts/git-ship.sh scope
```

Mỗi task use additive (không migration, không đổi chữ ký hàm cũ), kèm test offline 100% (I7).

---

## 5. Nhật ký triển khai (đọc đầu tiên ở phiên tiếp theo)

> Mỗi gap hoàn thành ghi 1 mục ở đây để phiên sau không phân tích lại. Thứ tự đề xuất:
> **GAP-01** ✅ → GAP-02/03/04 (analysis pass-through) → GAP-06 (SSE) → GAP-07 (/patterns) → GAP-05 (FE mock) → GAP-13 (toast) → GAP-10/11 (docs/FE nhỏ) → GAP-08/09/12 (thấp).

### GAP-01 — `/clusters` trả `dominant_place` & `radius_km` — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-cluster-contract-fields-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-cluster-contract-fields-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** `_cluster()` (`routes/clusters.py:19-29`) chỉ trả 6 field + `name` có điều kiện → FE không có địa danh/bán kính thật, xếp hạng rơi `"Khác"`.
- **Cách làm:** thêm `max_magnitude` (alias `max_mag`), `radius_km` (alias `radius`), `name` (luôn trả, `None` khi thiếu), `dominant_place` (alias `place`). Giữ nguyên 6 key/chữ ký; field thiếu → `None`, không số giả. Không migration (JSONB), không đổi schema/docs/contracts, không đụng FE.
- **Test:** `apps/api/tests/unit/test_cluster_contract_fields.py` (mới, 3 case: canonical / legacy alias / empty); `uv run pytest` full BE **299 passed**, `ruff check/format` sạch; `cd apps/web && pnpm test` 209/209 + `pnpm build` PASS (kiểm tra drift); `notes_index --check` OK; `scope` OK.
- **Bài học cho phiên sau:** schema `clusters.json:61-67` đã có field từ trước → không cần sửa contracts. Nguồn `summary_clusters` từ `demo_seeder` chỉ có alias legacy → `radius_km`/`max_magnitude` sẽ `None` cho tới khi T4 ghi canonical; FE đã fallback `eps_km` (đúng thiết kế).
- **Tiếp theo (đã làm, xem bên dưới):** GAP-02/03/04 ✅ — pass-through hệ số hồi quy/trạng thái/stats trong `routes/analysis.py`.

### GAP-02/03/04 — Pass-through field 4 route analysis — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-analysis-contract-fields-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-analysis-contract-fields-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** 4 hàm `build()` trong `routes/analysis.py` bỏ qua field T3 đã tính → FE hiện `"—"`, không phân biệt `insufficient_data`.
- **Cách làm (tất cả additive, giữ chữ ký build):**
  - `temporal`: `status` + `stats{data_points,avg_magnitude,max_magnitude,avg_depth}` (chỉ key có trong `metrics_data`).
  - `trend`: `intercept/r_squared/p_value` từ `source`; `sample_size` = `source.sample_size → complete_periods → data_points`; `status` fallback `"computed"`.
  - `seasonality`: `status/period/data_points`.
  - `correlation`: `status/sample_size/note`; **không** thêm `spearman_matrix`/`undefined_pairs`/`corr_mag_depth` vì `analysis.json:168-192` có `additionalProperties:false` chưa định nghĩa.
- **Test:** `apps/api/tests/unit/test_analysis_contract_fields.py` (mới, 6 case) + bổ sung `test_analysis_trend_route.py` (snapshot T3 thật); `uv run pytest` targeted **20 passed**, full BE **307 passed**, ruff sạch; FE 209/209 + build PASS; notes OK; scope OK.
- **Bài học:** `metrics_data` của T3 là nguồn sự thật — route chỉ pass-through, không tính lại; field legacy thiếu → bỏ qua (không số giả). `complete_periods` là sample size đúng cho hồi quy.
- **Tiếp theo (đã làm, xem bên dưới):** GAP-06 ✅ — SSE inner `data` bổ sung field phẳng.

### GAP-06 — SSE packet bổ sung field phẳng cho marker — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-sse-marker-fields-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-sse-marker-fields-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** inner `data` của `earthquake_detected`/`earthquake_alert` chỉ có `new_events[]`/`alert_events[]`; FE `monitoring-view.ts:112-118` đọc phẳng `latitude/magnitude` → marker realtime gần như không xuất hiện, dù `API.md:455` mô tả dạng phẳng.
- **Cách làm:** thêm `_EVENT_MARKER_FIELDS` + hàm thuần `_marker_fields(events)` trong `realtime/sse.py` (lấy event đầu, trả `{}` khi rỗng); `**_marker_fields(...)` vào 2 packet. Giữ nguyên mảng gốc, bọc `{event,data,timestamp}`, event names, backoff (RULE-03 additive). Không đụng FE/contract/docs.
- **Test:** bổ sung `apps/api/tests/unit/test_sse_stream.py` (`earthquake_detected` field phẳng, `earthquake_alert` field phẳng, mảng rỗng → `{}`); targeted **14 passed**, full BE **310 passed**, ruff sạch; FE 209/209 + build PASS; notes OK; scope OK.
- **Bài học:** outer packet không đổi → FE `parseSsePayload` vẫn parse được; field phẳng lấy từ `_event_to_dict()` đã có sẵn. Khi nhiều event, chỉ event đầu làm field phẳng — mảng gốc vẫn đủ cho xử lý tiếp.
- **Tiếp theo (đã làm, xem bên dưới):** GAP-07 ✅ — `/patterns` P5/P6 field optional.

### GAP-07 — `/patterns` P5/P6 trả field optional — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-patterns-optional-fields-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-patterns-optional-fields-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** route `/patterns` bỏ qua field DB đã có (`metric_name`, `model_version`, `evaluation_metrics`, `generated_at` cho P5; `model_version`, `evaluation_metrics` cho P6) → FE typed view đọc `undefined`.
- **Cách làm:**
  - `routes/patterns.py`: import `_iso` từ `routes.system`; P5 thêm 4 key, P6 thêm 2 key (giữ key cũ, `None` nếu thiếu record); `generated_at` format UTC `Z` (I3).
  - `contracts/schemas/patterns.json` (`:195,:220,:225`) + `contracts/README.md:98`: **chỉ đổi ghi chú** "BE hiện chưa trả" → "đã trả từ 2026-11-22" — **không đổi shape/schema/additionalProperties** theo quyết định user.
- **Test:** `apps/api/tests/unit/test_patterns_contract_fields.py` mới (3 case: field đúng, empty state, ghi chú contract); targeted 3/3, full BE **313/313**, ruff sạch; FE 209/209 + build PASS; notes OK; scope OK.
- **Bài học:** `patterns.json` có `additionalProperties:false` nhưng field đã định nghĩa sẵn → thêm an toàn; ghi chú cũ nằm ở 3 chỗ (`:195` của `evaluationMetrics` dễ sót — test source assertion đã bắt).
- **Tiếp theo (đã làm, xem bên dưới):** GAP-05 ✅ — FE bỏ mock region clusters.

### GAP-05 — Panel khu vực dùng cụm thật, bỏ mock — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-region-clusters-no-mock-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-region-clusters-no-mock-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** `mock-region-clusters.ts` sinh 8 địa danh/count giả cho panel lọc `/monitoring` (view chính thức) → vi phạm I5. Tiền đề: GAP-01 (`dominant_place`) và RD-15 (fallback `/patterns`) đã merge.
- **Cách làm:**
  - Giữ tên file `mock-region-clusters.ts` (RULE-03 — không xóa file), viết lại thành adapter thật: `fetchRegionClusters(signal?)` → `getClustersOptional(signal)` → cụm `data.clusters` → `buildRegionClusterRows()`; 404/empty → `[]`. Bỏ `MOCK_SOURCES`/`getMockRegionClusters`.
  - `MonitoringMapPage.tsx`: effect truyền `controller.signal`, catch → `[]`.
  - **Deviation:** thêm `buildRegionClusterRows(clusters)` trong `region-clusters.ts` — hàm `buildRegionClusters` cũ coi 1 item = 1 event nên mất `event_count` thật; hàm mới dùng trực tiếp `event_count`/`avg_magnitude`/`max_magnitude`/`dominant_place`, hàm cũ vẫn giữ nguyên (I2).
- **Test:** `apps/web/tests/region-clusters.test.ts` đổi case mock → payload `/clusters` thật + 404 + source assertion "không còn mock"; FE **212/212** PASS, build PASS; BE 313/313 (drift check); notes OK; scope OK.
- **Bài học:** khi thay mock bằng API, đừng reuse adapter giả định "1 item = 1 event" — cụm thật có `event_count` riêng. `countryFromPlace("Java, Indonesia")` → Indonesia; một số `dominant_place` tiếng Việt vẫn rơi "Khác" (dữ liệu thật, không bịa).
- **Tiếp theo (đã làm, xem bên dưới):** GAP-13 ✅ — toast theo SSE.

### GAP-13 — Toast bắn theo SSE `ingestion_cycle_completed` — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-sse-refresh-toast-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-sse-refresh-toast-thien` (§9 Approved), `.agents/notes/implemented/...`, `.agents/notes/testcase/...`
- **Vấn đề đã đóng:** toast bắn theo đồng hồ cục bộ (`DataRefreshLabel.tsx`) dù BE phát event thật mỗi 5 phút (`sse.py:256-266`).
- **Cách làm:** helper thuần `dataRefreshKey(event)` trong `header-data.ts`; `DashboardLayout` derive key từ `sse.data` → `HeaderActions` → `DataRefreshLabel` (prop tùy chọn); effect mở toast khi key đổi; countdown chỉ `onRefresh()`. Giữ nguyên toast/CSS (không CSS lại).
- **Test:** `apps/web/tests/header-sse-refresh.test.ts` mới (3 case: key, event khác, wiring + countdown không bắn toast); FE **215/215** PASS, build PASS; notes OK; scope OK.
- **Bài học:** chỉ đổi nguồn kích hoạt, không đổi UI — CSS toast cũ giữ nguyên theo yêu cầu.
- **Còn lại (cần quyết định/ngoài scope implementation tự động):** GAP-08 (alias `/predictions` — FE adapter đủ dùng), GAP-09 (event `"alert"` / header `id`,`retry` — cần chọn bỏ khỏi contract hay phát thêm), GAP-12 (field optional `/system/status` — cần BE đổi).

### GAP-10/11 — Ghi chú hợp đồng — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `docs/2026-11-22-contract-notes-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-contract-notes-thien` (§9 Approved)
- **Đã làm:** FE contract `earthquake.ts` comment `HourlyTimeSeriesPoint.time` là nhãn `HH:MM`, không parse ISO (GAP-10 — user chọn sửa FE, không sửa BE); `docs/api/API.md` §2/§3.3 prose đúng shape empty `/patterns` `{success:false,total_patterns:0,patterns:[],message}` **không có `data`** (GAP-11 — user chọn không sửa schema).
- **Test:** `apps/web/tests/api-contract-notes.test.ts` (2 source assertions); FE **217/217** + build; scripts docs test 10/10; notes OK.
- **Không đổi:** runtime, type, BE, `contracts/schemas/**`.

---

## 6. Trạng thái tổng kết

| Nhóm | Trạng thái |
|---|---|
| GAP-01, 02, 03, 04, 05, 06, 07, 13, 10, 11 | ✅ code + validation + merge vào `develop` |
| GAP-08 | ✅ Đã xong — `confidence_level` + `probability_scores` (xem dưới) |
| GAP-09 | ✅ Đã xong — event `alert` + `id`/`retry` (xem dưới) |
| GAP-12 | ✅ Đã xong — `records_processed`/`error_message`/`generated_at`/`uptime_seconds` (xem dưới) |

### GAP-09 — SSE phát `alert` và `id`/`retry` — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-sse-contract-events-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-sse-contract-events-thien` (§9 Approved)
- **Đã làm:** `_packet()` thêm `id` duy nhất (`gdmas-N`, `itertools.count`) và `retry=5000` cả ở wire dict lẫn inner JSON (FE đọc inner); nhánh `earthquake_alert` phát thêm event alias `"alert"` cùng payload. Giữ nguyên `earthquake_alert`, bọc `{event,data,timestamp}`, event names cũ.
- **Test:** bổ sung `test_sse_stream.py` (id/retry, alias alert cùng payload, set packet keys); targeted 16/16, full BE **317/317**, ruff sạch; FE 217/217 + build.
- **Lưu ý:** `alert` cùng data với `earthquake_alert` → FE dedup theo `source_event_id` (field phẳng GAP-06), không nhân marker.

### GAP-12 — Bổ sung field `/system/status` & `/health` — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-system-status-fields-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-system-status-fields-thien` (§9 Approved)
- **Đã làm:** mỗi worker trong `/system/status` trả `records_processed`/`error_message` từ `ServiceRun` (None khi chưa có run — không suy diễn 0); root `generated_at` UTC `Z`; `/health` trả `uptime_seconds >= 0`. Giữ status/error envelope cũ (`degraded/unhealthy` vẫn chỉ qua 500 khi DB lỗi). Field đã có trong `system-status.json:40,66-68` / `health.json` → không sửa schema.
- **Test:** bổ sung `test_system_prediction_routes.py` (2 case); targeted 36/36, full BE **318/318**, ruff sạch; FE 217/217 + build.

---

## 7. Trạng thái cuối cùng

| Nhóm | Trạng thái |
|---|---|
| GAP-01…13 (toàn bộ file `fe-be-integration-gaps.md`) | ✅ đã code + validation + merge vào `develop` |
| Cần làm tiếp nếu có yêu cầu mới | Chỉ các cải tiến ngoài phạm vi audit (auth BE, UI mới, v.v.) |

### GAP-08 — Alias `/predictions` & `/classifications` — ✅ CODE XONG (2026-11-22)

- **Nhánh:** `feat/2026-11-22-prediction-contract-aliases-thien`
- **Proposal / Plan / Testcase:** `2026-11-22-prediction-contract-aliases-thien` (§9 Approved)
- **Đã làm:** `/predictions` thêm top-level `confidence_level` lấy từ `evaluation_metrics.confidence_level` (`None` nếu thiếu — không số giả); `/classifications` thêm alias `probability_scores` = `probabilities`, giữ key cũ. Field đã có trong `predictions.json:30` / `classifications.json:27-31` → không sửa schema.
- **Test:** bổ sung `test_system_prediction_routes.py` (3 case); targeted 35/35, full BE **315/315**, ruff sạch; FE 217/217 + build.
