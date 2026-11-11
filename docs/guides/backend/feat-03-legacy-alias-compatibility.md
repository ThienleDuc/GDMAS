# FEAT-03 — Alias tương thích cho trend và seasonality

Hướng dẫn này bổ sung cho [FEAT-03](feat-03-timeseries-analysis.md). Dùng
`gdmas.services.analysis.alias_worker` tại Terminal 3 để công bố payload có các
trường legacy. `analysis.worker` vẫn tạo payload 1.0; runner/Compose cũ giữ nguyên.
Không chạy cả hai worker hoặc demo seeder cùng lúc: advisory lock chỉ ngăn ghi
đồng thời, không ngăn hai worker luân phiên ghi hai phiên bản payload.

## Phạm vi tương thích

API vẫn là `GET /api/v1/patterns`. P1/P4 giữ nguyên dữ liệu và metadata phiên bản
1.0; P2/P3 dùng phiên bản 1.1. Đọc `patterns[i].metrics.metadata.schema_version`
cho từng pattern. Envelope API, dữ liệu T4/T5 và các trường canonical
`series`, `by_interval`, `seasonal_line`, decomposition, slope/quality/strength
giữ nguyên. Dữ liệu canonical không bị tính lại bởi adapter.

Đây là tương thích tên trường/cấu trúc với dữ liệu thực. Client cần xử lý null,
chấp nhận trường bổ sung và hiểu seasonal factor additive. Validator khóa cứng
schema 1.0 sẽ từ chối payload 1.1; cần chọn schema mới trước kích hoạt. Không tái
tạo số liệu giả, tuần trượt, nhãn `Tuần N`, hoặc seasonal factor dạng tỷ lệ trong
demo seeder cũ. `period` vẫn là ngày ISO đầu bucket tuần theo lịch UTC.

## Mapping các trường bổ sung

| Alias | Trường | Nguồn và ý nghĩa |
| --- | --- | --- |
| `trend_line[]` | `start` | Bằng `period`, ngày thứ Hai đầu tuần UTC |
| | `end` | Ngày thứ Hai tiếp theo, cận trên loại trừ |
| | `event_count` | Count thực của bucket, kiểu số nguyên; gồm cả sự kiện thiếu magnitude |
| | `avg_magnitude` | Giá trị thực của series magnitude trung bình tại cùng bucket; null khi chưa xác định |
| | `trend_slope` | Bằng slope toàn chuỗi count/tuần, đơn vị sự kiện/tuần; null khi thiếu bucket đầy đủ |
| `seasonal_components[]` | `cycle` | `Tháng <cycle_index>`, tháng lịch 1–12 |
| | `typical_events` | Trung bình count của các tháng cùng chỉ số trong các bucket tháng đầy đủ; làm tròn gần nhất, đúng nửa làm tròn lên |

Ví dụ tháng 1 có 10 và 11 sự kiện thì `typical_events=11`. Tháng đầy đủ có count 0
vẫn tham gia trung bình. Giá trị này là thống kê quan sát, không phải dự báo.
`trend_slope` là cùng một slope hồi quy lặp trên các phần tử, không phải sai phân
từng tuần. Tuần partial vẫn có ngày start/end đầy đủ theo lịch và cờ `partial`.

Các trường `actual_value`, `trend_value`, `partial`, `cycle_index`, `period_label`
và `seasonal_factor` trong alias vẫn giữ nguyên. Factor là thành phần cộng theo
đơn vị sự kiện, có thể âm. Thiếu 24 tháng đầy đủ thì seasonal alias giữ `[]`;
đọc quality trong metadata và từng interval. Không đổi null thành 0 hoặc dùng
kiểm tra truthy để hiển thị số.

Schema mới: [analysis-patterns-aliases-v1.1.json](../../../contracts/schemas/analysis-patterns-aliases-v1.1.json).
Mẫu: [analysis_patterns_aliases_sample.json](../../../contracts/examples/analysis_patterns_aliases_sample.json).
Mẫu có `cases[].metrics` khớp schema và `recipe` mô tả fixture xác định: sự kiện
của mỗi tháng đặt ở ngày đầu tháng UTC, ID tăng từ 1. Hai case là đủ 24 tháng
và một sự kiện thiếu lịch sử; toàn bộ đều là dữ liệu tổng hợp phục vụ kiểm thử.
Schema 1.0 và mẫu cũ tiếp tục áp dụng cho entrypoint cũ.

## Tích hợp và lỗi

Adapter chạy trong transaction của pipeline cũ, trước thao tác xóa/thay snapshot.
Nó ghép theo ngày bucket, kiểm tra count/P1, magnitude, alias/decomposition và
phiên bản. Thiếu/trùng bucket, count không nhất quán, giá trị không hữu hạn hoặc
alias 1.1 sai với canonical khiến cả chu kỳ thất bại; snapshot trước được giữ và
ServiceRun FAILED được ghi theo cơ chế hiện hữu. Không tự sửa payload 1.1 sai.

Khóa advisory, lịch monotonic, ServiceRun, recovery và xử lý nguồn rỗng được tái
sử dụng từ pipeline/worker cũ. Nguồn rỗng vẫn làm sạch bốn snapshot T3. Mỗi loại
chỉ có một snapshot hiện hành. Không thêm route, migration, dependency runtime
hoặc biến môi trường.

## Chạy và kích hoạt

Tại `apps/api/`, dùng môi trường backend đã cài theo hướng dẫn dự án:

```powershell
$env:PYTHONPATH = 'src'
uv run python -m gdmas.services.analysis.alias_worker --once
uv run python -m gdmas.services.analysis.alias_worker --lookback-days 90
```

Mặc định tính toàn bộ lịch sử, chạy ngay và lặp theo
`ANALYSIS_INTERVAL_SECONDS=300`. CLI giữ `--once`, `--lookback-days` số nguyên dương,
exit code 0 khi thành công hoặc bỏ qua do khóa, 1 khi chu kỳ lỗi; Ctrl+C dừng an toàn.
Chỉ chạy một cấu hình cửa sổ cho T3.

Validation chỉ sử dụng DB test. Kích hoạt trên DB dự án là bước riêng sau khi
đánh giá kết quả: xác minh đúng DB, sao lưu bốn snapshot T3, dừng worker cũ,
xác nhận client/schema đã sẵn sàng, chạy worker mới `--once` với cùng cửa sổ,
kiểm tra P2/P3 thực sự có metadata 1.1 và alias đúng rồi mới chạy định kỳ.
Exit code 0 của `--once` chưa đủ để xác nhận kích hoạt vì có thể đã bỏ qua do khóa.

Để hoàn tác trên DB đã xác minh: dừng alias_worker, chạy
`analysis.worker --once` với cùng cửa sổ rồi chỉ khởi động worker cũ; kết quả trở
về payload 1.0 với giới hạn alias trước đây. Khi DB/nguồn chưa khả dụng, giữ worker
dừng và chỉ phục hồi bốn snapshot T3 từ bản sao đã kiểm tra. Không xóa DB hoặc tác
động dữ liệu T4/T5. Việc chuyển worker cần được thực hiện một lần có kiểm soát.

## Kiểm thử

Giữ nguyên 52 test FEAT-03; bổ sung hai tệp test độc lập. PostgreSQL test phải có
tên kết thúc `_test`; fixture dùng schema UUID riêng. Các test fault injection chỉ
ngắt kết nối do chính pipeline test tạo. Test tiến trình/SIGINT chạy trong Docker
Linux; không dùng DB dự án và không công bố cổng host.

Ví dụ chạy suite trong môi trường QA riêng có `pytest`, `hypothesis`,
`jsonschema[format]`, `coverage` và Ruff; không thêm công cụ QA vào manifest dự án:

```powershell
$env:PYTHONPATH = 'src'
uv run --with hypothesis --with 'jsonschema[format]' pytest -W error tests
```

`jsonschema[format]` cần thiết để `FormatChecker` thực sự kiểm tra date-time;
test cố ý truyền thời gian sai phải bị từ chối. Test so sánh export Pydantic với
schema, validate mẫu, bảo toàn canonical, idempotence, null/zero, biên năm, partial,
round-half-up, lỗi trước publish, rollback, khóa cũ/mới và CLI thật.

Đo pipeline, HTTP p95 (10 request sau warm-up) và payload bytes trước/sau trên cùng
fixture 100/10.000 sự kiện; giữ đủ scatter. Alias bổ sung có thể tăng payload;
giới hạn API lớn vượt 100 ms của FEAT-03 vẫn là tác vụ T6/FE riêng. Xem
[hồ sơ QA của lần triển khai này](../../../.agents/notes/implemented/2026-11-11-001-analysis-legacy-alias-compatibility/qa-report.md)
để biết môi trường, kết quả và số đo thực tế; không diễn giải số đo local thành SLA.
