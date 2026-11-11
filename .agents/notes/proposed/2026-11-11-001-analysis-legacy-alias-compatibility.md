# ĐỀ XUẤT — TƯƠNG THÍCH ALIAS P2/P3 CỦA FEAT-03

- **Proposal ID:** 2026-11-11-001
- **Trạng thái:** Approved — triển khai theo phê duyệt trong hội thoại.
- **Người đề xuất:** AI Agent theo yêu cầu của Lê Trung Sơn.
- **Ngày tạo:** 2026-11-11.
- **Nhánh dự kiến:** `bugfix/analysis-legacy-alias-compatibility`, dựa trên commit FEAT-03 `0224c80`; nếu FEAT-03 đã merge thì tách từ develop chứa commit đó. Phiên lập kế hoạch không tạo/chuyển nhánh.
- **Thay thế (Overrides):** None. Bổ sung cách thực hiện cam kết tương thích tại §4.1 proposal `2026-11-10-001`, không thay quyết định thuật toán hoặc bảo toàn mã nguồn.
- **Proposal liên quan:** [2026-11-10-001](2026-11-10-001-feat-03-timeseries-analysis.md), Decision: Approved.

## 1. Mục tiêu & bối cảnh

Project-review ngày 2026-11-11 phát hiện tên alias được giữ nhưng cấu trúc phần tử khác payload seeder cũ:

| Alias | Payload seeder cũ | Payload FEAT-03 tại 0224c80 |
| --- | --- | --- |
| `trend_line[]` | `period`, `start`, `end`, `event_count`, `avg_magnitude`, `trend_slope` | `period`, `actual_value`, `trend_value`, `partial` |
| `seasonal_components[]` | `cycle`, `seasonal_factor`, `typical_events` | `cycle_index`, `period_label`, `seasonal_factor` |

Mục tiêu là bổ sung trường mà client cũ cần, đồng thời giữ các trường FEAT-03 và kết quả phân tích thật. Đây là tương thích cấu trúc với quy ước giá trị được công bố; không tái tạo số liệu minh họa, nhãn tuần tương đối hoặc công thức giả của seeder. Client cần cho phép null khi thống kê chưa xác định và đọc seasonal factor theo mô hình additive đã duyệt.

Frontend hiện tại không đọc trực tiếp hai mảng này. Chưa có bằng chứng lỗi hiển thị do hai alias; rủi ro nằm ở client đọc các trường cũ và cam kết hợp đồng trong proposal.

### Căn cứ và kiểm tra quyết định

- Đã đọc context-memory, RULE-03 trong `docs/quyuocchung.md`, SAD, `contracts/README.md`, proposal/plan/status/QA của FEAT-03.
- Đối chiếu `decomposition.py`, `analysis_metrics.py`, `demo_seeder.py`, `repository.py`, `pipeline.py`, `worker.py`, hợp đồng và nơi sử dụng trong frontend.
- Không có quyết định Rejected liên quan trong `proposed/` hoặc `implemented/`. Quyết định Approved hiện hữu yêu cầu chỉ bổ sung, dùng dữ liệu thật, giữ worker độc lập và công bố nguyên tử.
- Review vừa chạy lại 39 unit + 13 integration tests đạt, Ruff/formatter/schema đạt. Đây là baseline hiện tại, chưa phải kết quả kiểm thử phương án trong proposal này.

## 2. Đánh giá khả thi theo kiến trúc GDMAS

- **T3:** Bổ sung adapter ngay trước công bố snapshot; T6 tiếp tục đọc JSONB qua `/api/v1/patterns`, không tính lại trong request.
- **RULE-03:** Không sửa bất kỳ source, test, schema JSON hoặc entrypoint hiện hữu. Dùng lớp repository/pipeline mở rộng và entrypoint mới; không monkeypatch module toàn cục.
- **I1–I7:** Không thêm worker vào main.py; không xóa file; giữ UTC/WGS84; không cần migration; chỉ ảnh hưởng alias P2/P3; không dùng secret thật trong fixture; test cũ giữ nguyên.
- **Giới hạn tích hợp:** Chạy worker hiện hữu sẽ vẫn tạo payload cũ của FEAT-03. Phải chuyển T3 sang entrypoint mới sau validation; giữ riêng bước kích hoạt để không tuyên bố adapter tự có hiệu lực.

## 3. Phạm vi triển khai

### Trong phạm vi — chỉ thêm mới

| Tệp | Trách nhiệm |
| --- | --- |
| `apps/api/src/gdmas/services/analysis/legacy_aliases.py` | Hàm thuần bổ sung alias trên bản sao payload; đối chiếu bucket và tính trường bổ sung |
| `apps/api/src/gdmas/schemas/analysis_alias_metrics.py` | Model Pydantic cho payload có alias mở rộng; tái sử dụng model con không đổi |
| `apps/api/src/gdmas/services/analysis/alias_pipeline.py` | Repository và pipeline mở rộng, kiểm tra adapter trước khi gọi publish hiện hữu |
| `apps/api/src/gdmas/services/analysis/alias_worker.py` | CLI mới; tái sử dụng `worker.run()` và settings hiện hữu |
| `apps/api/tests/unit/test_analysis_legacy_aliases.py` | Mapping, dữ liệu biên, null, không mutation, idempotence và schema |
| `apps/api/tests/integration/test_analysis_alias_pipeline.py` | API, atomicity, rollback, khóa, recovery và CLI thật trên DB test |
| `contracts/schemas/analysis-patterns-aliases-v1.1.json` | Hợp đồng mới, giữ schema 1.0 nguyên trạng |
| `contracts/examples/analysis_patterns_aliases_sample.json` | Ví dụ đủ mùa vụ và thiếu dữ liệu, số liệu minh họa có thể tái tạo |
| `docs/guides/backend/feat-03-legacy-alias-compatibility.md` | Mapping, giới hạn tương thích, cách chọn schema, vận hành và rollback |

Sau khi duyệt mới tạo `plan.md`, `status.md`, `qa-report.md` trong `implemented/2026-11-11-001-analysis-legacy-alias-compatibility/`. Cập nhật dòng theo dõi proposal là thay đổi hồ sơ được phép.

### Ngoài phạm vi

Không sửa runner/worker/pipeline/repository/schema/test cũ, router, frontend, Compose, dependency hoặc migration. Không tối ưu API 10.000 sự kiện, thay thuật toán trend/seasonality, mở endpoint, sửa fallback UI hoặc chạy seeder. Không chuyển DB dự án sang payload mới trong pha validation. Không commit/push/mở PR trong phạm vi lập kế hoạch và triển khai.

## 4. Phương án kỹ thuật chi tiết

### 4.1. Alias `trend_line` — mặc định tuần/count

Giữ nguyên `series`, `by_interval`, `slope`, `trend_direction`, `direction` và mọi trường hiện có của phần tử `trend_line`. Bổ sung:

| Trường | Quy ước dự kiến |
| --- | --- |
| `start` | Ngày UTC đầu bucket, bằng `period` hiện tại; giữ `period` dạng ngày ISO, không thay bằng nhãn `Tuần N` |
| `end` | Ngày UTC đầu bucket kế tiếp, cận trên loại trừ; tuần có độ dài 7 ngày kể cả bucket partial |
| `event_count` | Số nguyên bằng `actual_value` của count series; đối chiếu P1 tuần theo cùng ngày bắt đầu |
| `avg_magnitude` | Lấy `actual_value` của avg_magnitude series ở đúng bucket; null nếu không có phép đo hợp lệ |
| `trend_slope` | Slope toàn chuỗi count/tuần, bằng top-level `slope`, đơn vị sự kiện/tuần; null khi chưa đủ bucket đầy đủ |

`trend_slope` lặp cùng giá trị trên các bucket là alias của kết quả hồi quy đã tính, không phải sai phân từng bucket hoặc slope của moving average. Không dùng công thức minh họa `(event_count - 15) * 0.12` trong seeder. Bảo toàn 0 và cờ partial; không thay null bằng 0. Ghép theo ngày bucket, không ghép theo vị trí danh sách. Thiếu/trùng khóa bucket hoặc sai count phải làm validation thất bại trước publish.

### 4.2. Alias `seasonal_components` — mặc định tháng

Giữ nguyên `seasonal_line`, toàn bộ decomposition, quality/strength và các trường hiện có trong phần tử alias. Bổ sung:

| Trường | Quy ước dự kiến |
| --- | --- |
| `cycle` | `Tháng <cycle_index>`, chỉ số tháng lịch từ 1 đến 12 |
| `typical_events` | Trung bình `observed` của các tháng cùng chỉ số trong các bucket tháng đầy đủ, làm tròn về số nguyên gần nhất; đúng nửa thì làm tròn lên |

Ví dụ tháng 1 có các count 10, 11 thì `typical_events=11`. Đây là thống kê số sự kiện đã quan sát, không phải dự báo hoặc giá trị tạo từ seasonal factor. Chỉ tính từ `by_interval.month.timestamps/observed` của cùng payload, không truy vấn lại DB. Tháng không có sự kiện nhưng đã quan sát đầy đủ có count 0 và được tính vào trung bình.

Giữ `seasonal_factor` bằng kết quả additive hiện tại, đơn vị sự kiện, có thể âm. Không chuyển thành tỷ lệ nhân để giống số demo. Khi mùa vụ chưa đủ dữ liệu, alias giữ `[]` và quality hiện hữu; không dựng 12 phần tử giả. Không bổ sung seasonal alias cho tuần ở đợt này.

### 4.3. Phiên bản và giới hạn hợp đồng

- P1/P4 giữ nguyên payload và `metadata.schema_version=1.0`.
- P2/P3 có alias mở rộng dùng `metadata.schema_version=1.1`; giữ thời điểm, quality, số sự kiện và kết quả canonical khác nguyên vẹn. Phiên bản áp dụng theo từng pattern, không suy đoán từ pattern đầu tiên.
- Schema mới mô tả rõ tổ hợp phiên bản này; Pydantic và JSON Schema phải khớp. Không dùng model cũ `extra=forbid` để validate payload sau mở rộng.
- Client khóa cứng schema 1.0 hoặc cấm trường bổ sung cần chọn schema mới trước kích hoạt. Không tuyên bố tương thích tuyệt đối với validator 1.0 hoặc client dựa vào ý nghĩa số giả của seeder.
- Adapter không sửa input, không nhân đôi alias khi chạy lại; nhận biết đầu vào 1.0/1.1 và từ chối phiên bản không hỗ trợ. Đầu vào 1.1 vẫn phải được kiểm tra, không bỏ qua validation theo nhãn phiên bản.
- Kiểm tra bất biến bằng phép chiếu payload mới về dạng 1.0: bỏ riêng các trường bổ sung, phục hồi nhãn phiên bản; mọi dữ liệu còn lại phải bằng đầu vào.

### 4.4. Tích hợp không sửa source cũ

1. `AliasCompatibleRepository` kế thừa repository hiện hữu. Trong `replace_snapshot`, đầu vào `{}` được chuyển nguyên trạng cho cơ chế làm sạch T3. Với snapshot đủ bốn loại: tạo bản sao, thêm alias và validate toàn bộ trước khi gọi `super().replace_snapshot(...)`.
2. `AliasCompatiblePipeline` kế thừa pipeline hiện hữu, gọi constructor cũ rồi thay repository của chính instance bằng repository mở rộng với cùng session factory. Không sao chép `execute_cycle()` hoặc thay symbol của module cũ.
3. Kế thừa cùng transaction, advisory lock key, ServiceRun, rollback và failure logging. Không chạy adapter thành một transaction cập nhật riêng sau publish.
4. `alias_worker` hỗ trợ `--once`, `--lookback-days`, dùng `ANALYSIS_INTERVAL_SECONDS` và gọi `worker.run()` với pipeline mới. Không thêm cấu hình môi trường.
5. Dừng worker cũ trước khi kích hoạt worker mới. Cùng khóa chỉ ngăn ghi đồng thời; hai worker chạy luân phiên vẫn có thể ghi qua lại phiên bản 1.0/1.1 nên không được vận hành cả hai.

Lệnh dự kiến tại `apps/api/`, với `PYTHONPATH=src`:

```powershell
uv run python -m gdmas.services.analysis.alias_worker --once
uv run python -m gdmas.services.analysis.alias_worker
```

Các lệnh trên chưa tồn tại ở thời điểm soạn proposal. Chỉ chạy với DB test trong validation; dùng DB dự án là bước kích hoạt riêng sau đánh giá kết quả.

### 4.5. Các mốc công việc sau phê duyệt

| Mốc | Công việc | Đầu ra |
| --- | --- | --- |
| M0 | Tạo plan/status, chốt mapping/null/version bằng fixture xác định | Ma trận trường cũ, FEAT-03 và hợp đồng 1.1 |
| M1 | Bổ sung schema, adapter, unit tests | Mapping đúng và không thay canonical |
| M2 | Bổ sung repository/pipeline mở rộng và CLI | Cùng transaction/khóa, không sửa source cũ |
| M3 | Integration, suite hồi quy, lint/schema và đo payload/HTTP | QA có bằng chứng và giới hạn còn mở |
| M4 | Source-guard/project-review và hướng dẫn chuyển T3 | Dừng ở validation để người dùng xem xét |

## 5. Các phương án đã cân nhắc

| Phương án | Đánh giá |
| --- | --- |
| Sửa trực tiếp decomposition/schema/worker hiện hữu | Ít tệp hơn nhưng trái quyết định bảo toàn source; không chọn trong proposal này |
| Sửa frontend bỏ client cũ, chỉ dùng series/seasonal_line | Không khôi phục cam kết alias, mở rộng sang T7; không chọn |
| Thêm route hoặc adapter ở T6 | Đụng hợp đồng API và đường xử lý request, không sửa snapshot dùng chung; không chọn |
| Adapter trước publish, repository/pipeline mở rộng, CLI mới | **Chọn:** bổ sung thuần túy, giữ thuật toán và atomicity; đánh đổi bằng bước chuyển entrypoint có tài liệu |

## 6. Tác động kiến trúc & tài liệu

Không thay bảng/cột, route, lịch 5 phút hoặc mô hình 7 terminals. Hai alias tăng kích thước payload; phải đo lại nhưng không coi đây là tác vụ đạt SLA 100 ms với 10.000 sự kiện.

Hướng dẫn bổ sung phải dẫn tới hướng dẫn FEAT-03 hiện tại, ghi rõ tài liệu mới áp dụng khi dùng `alias_worker`, cách chọn schema theo phiên bản, ý nghĩa nullable/additive và các client không được bảo đảm tương thích. Giữ các tài liệu/schema 1.0 như hồ sơ của entrypoint cũ. Không ghi báo cáo PASS chung nếu chưa kiểm tra giới hạn tương thích này.

## 7. Tiêu chí nghiệm thu

| ID | Bằng chứng bắt buộc |
| --- | --- |
| AC-01 | Mỗi phần tử alias đủ trường FEAT-03 và trường cũ theo mapping; 0, null và kiểu số đúng hợp đồng |
| AC-02 | Ghép đúng bucket qua biên năm/tháng, tuần chứa Chủ nhật, partial và danh sách bị đổi thứ tự; thiếu/trùng bucket bị từ chối |
| AC-03 | `trend_slope` bằng slope thật, `typical_events` khớp fixture tính tay gồm nhiều năm, tháng count 0 và ca làm tròn .5 |
| AC-04 | Lịch sử dưới 24 tháng đầy đủ giữ seasonal alias rỗng; dữ liệu đủ dài/hằng giữ nguyên chất lượng và kết quả decomposition |
| AC-05 | Input không mutation; adapter idempotent; phép chiếu về payload 1.0 khớp input; P1/P4 không đổi; JSON không NaN/Infinity |
| AC-06 | Payload mẫu, payload sinh và dữ liệu trả qua API đều qua model/schema 1.1; payload cũ vẫn qua schema 1.0; kiểm tra format UTC có bật format checker |
| AC-07 | Lỗi adapter/schema xảy ra trước xóa snapshot; integration chứng minh giữ snapshot cũ, ghi FAILED và phục hồi chu kỳ sau |
| AC-08 | Nguồn rỗng làm sạch đúng T3; P5/P6 và clustering giữ nguyên; khóa giữa worker cũ/mới có hiệu lực; chỉ một snapshot mỗi loại |
| AC-09 | CLI mới chạy thật --once/lookback, lịch và SIGINT; 52 test cũ giữ nguyên và vẫn đạt; test mới không skip trong môi trường nghiệm thu |
| AC-10 | Ruff/formatter trên tệp mới; so sánh Pydantic/JSON Schema; source-guard xác nhận không sửa/xóa source hoặc test cũ |
| AC-11 | Ghi thời gian pipeline, HTTP p95 và payload bytes trước/sau trên cùng fixture 100/10.000 sự kiện; không cắt scatter hoặc sửa T6 để làm đẹp số đo |

Lệnh kiểm thử dự kiến tại `apps/api/`: `uv run pytest -W error tests/unit/test_analysis_legacy_aliases.py tests/integration/test_analysis_alias_pipeline.py`, rồi chạy `uv run pytest -W error tests` với đủ công cụ QA riêng. Dùng PostgreSQL DB tên kết thúc `_test`, schema UUID riêng, không dùng DB dự án. Agent tự chạy kiểm thử và báo cáo; không giao lại kiểm thử thủ công cho người dùng. Không cần build frontend vì không sửa FE. Không cài dependency QA vào manifest dự án.

## 8. Kế hoạch hoàn tác

Trước kích hoạt: xác nhận đích DB và sao lưu riêng bốn snapshot T3 hiện hành. Nếu có lỗi: dừng `alias_worker`, chạy `analysis.worker --once` với cùng cấu hình cửa sổ để tính lại payload 1.0, rồi chỉ khởi động worker cũ. Đây là quay về hành vi FEAT-03 trước xử lý alias, không phải sửa lỗi tương thích.

Nếu DB/nguồn không khả dụng, giữ trạng thái dừng và chỉ phục hồi bản sao T3 đã xác minh trong transaction được kiểm soát; không xóa DB hoặc chạm T4/T5. Không cần downgrade migration, xóa source hoặc git reset. Trong pha validation chỉ thực hành hoàn tác trên DB test.

## 9. Phê duyệt của con người

- **Reviewer:** Lê Trung Sơn — phê duyệt trực tiếp trong hội thoại.
- **Ngày duyệt:** 2026-11-11.
- **Decision:** Approved
- **Comments:** Người dùng xác nhận: "Oke tôi approve decision". Duyệt triển khai phương án chỉ bổ sung, entrypoint T3 mới, mapping số liệu thật và giới hạn schema 1.1 theo proposal. Kích hoạt trên DB dự án vẫn là bước riêng sau validation.

## 10. Lịch sử tu chỉnh

- 2026-11-11: Khởi tạo theo phát hiện project-review; hoàn tất kế hoạch mapping, phạm vi, tích hợp, nghiệm thu và rollback. Chỉ tạo proposal và dòng index, chưa sửa code hoặc chạy phương án mới.
- 2026-11-11: Ghi nhận Decision: Approved theo xác nhận trực tiếp của người dùng; bắt đầu build-implementation, không commit/push hoặc kích hoạt DB dự án.
