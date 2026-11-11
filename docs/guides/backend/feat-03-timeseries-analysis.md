# FEAT-03 — Terminal 3: Time-Series Analysis

Chủ sở hữu: **Lê Trung Sơn — Backend Dev 1**. Worker đọc dữ liệu thực từ
`earthquake_events`, tính Patterns 1–4 và công bố snapshot trong `analysis_results`.
Không gọi demo seeder, không tự nạp sự kiện và không ghi dữ liệu T4/T5.

## Chạy tại Terminal 3

Sau khi cài môi trường backend theo hướng dẫn dự án, chạy tại `apps/api/` với
PostgreSQL T1 sẵn sàng và T2 đã cung cấp dữ liệu:

```powershell
uv sync
$env:PYTHONPATH = 'src'
uv run python -m gdmas.services.analysis.worker --once
uv run python -m gdmas.services.analysis.worker
```

Mặc định tính ngay khi khởi động và chạy theo `ANALYSIS_INTERVAL_SECONDS=300`.
`--once` trả exit code 0 khi thành công hoặc bỏ qua do worker khác giữ khóa,
1 khi chu kỳ thất bại; Ctrl+C dừng an toàn. Lịch dùng monotonic clock, không chạy
chồng và bỏ qua các mốc đã lỡ nếu xử lý kéo dài.

Mặc định dùng toàn bộ lịch sử hiện có. Để dùng cửa sổ hữu hạn:

```powershell
uv run python -m gdmas.services.analysis.worker --once --lookback-days 90
```

Chỉ vận hành một cấu hình cửa sổ cho T3. Các lần chạy thay snapshot hiện hành,
không lưu đồng thời snapshot 30/90 ngày. Không chạy demo seeder đồng thời với
worker vì seeder cũ không dùng khóa mới. Nếu cần dùng seeder: dừng T3, chạy seeder,
sau đó khởi động T3 để tính lại bằng dữ liệu thực.

## Tương thích với hệ thống hiện tại

- Entrypoint mới được chấp nhận trong proposal `2026-11-10-001`. Lệnh
  `gdmas.services.analysis.runner` cũ và Compose hiện hữu vẫn chạy placeholder;
  tài liệu này không khẳng định hai lệnh đó đã được nâng cấp. Dùng `analysis.worker`
  ở Terminal 3; không sửa cấu hình Docker cũ.
- API sử dụng `GET /api/v1/patterns`, giữ envelope và IDs `pattern_1` đến `pattern_4`.
  Các endpoint `/api/v1/analysis/*` trong tài liệu quy hoạch chưa được thêm ở đợt này.
- Tên lưu DB là `time_series`, `trend`, `seasonality`, `correlation`, khác một số
  ví dụ trong FEAT-03/ERD. Mỗi loại có một bản ghi với `time_interval=multi`.
- API chỉ đọc snapshot, không chạy thuật toán và chưa có query interval/window.
- Đây là bàn giao backend. FE sở hữu việc dựng biểu đồ và selector; các fallback
  hiện tại của Statistics có thể che giá trị 0 hoặc thiếu dữ liệu.

## Hợp đồng và cách FE chọn dữ liệu

Schema: [analysis-patterns.json](../../../contracts/schemas/analysis-patterns.json).
Ví dụ: [analysis_patterns_sample.json](../../../contracts/examples/analysis_patterns_sample.json)
là wrapper `{description, metrics}` để ghi rõ dữ liệu minh họa; `metrics` khớp schema.
Schema này mô tả bốn payload theo loại DB, không phải toàn bộ envelope sáu patterns.

Trong response API, mỗi payload nằm ở `patterns[i].metrics`:

| Loại | Trường dùng cho biểu đồ |
| --- | --- |
| time_series | `by_interval.day/week/month.line_chart`, `scatter_plot`, `histogram` |
| trend | `by_interval.day/week/month.count/avg_magnitude/max_magnitude/energy_joules` chứa `series`, `slope`, `trend_direction` |
| seasonality | `by_interval.week/month` chứa `observed`, `trend`, `seasonal`, `residual`, `seasonal_line`, `seasonality_strength` |
| correlation | `variables`, `units`, `matrix`, `sample_counts`, `method` |

Top-level mặc định là ngày cho P1, tuần/count cho P2, tháng cho P3. Các alias
`trend_line`, `seasonal_components`, `direction` sinh từ cùng một kết quả.
P1 giữ histogram dictionary 5 bin như seeder; `time_distribution` nay đếm đủ 24 giờ.
Metadata phiên bản 1.0 có thời điểm tính, cửa sổ UTC, số sự kiện và thống kê giá trị
bị loại theo cột. Một sự kiện vẫn được đếm nếu chỉ thiếu magnitude/depth; scatter
chỉ chứa magnitude hợp lệ. Timestamp UTC ISO 8601, độ sâu km, tọa độ WGS84.

Không dùng kiểm tra truthy để hiển thị số: `0` là giá trị hợp lệ. Dùng null hoặc
`metadata.data_quality` để hiển thị thiếu dữ liệu. API hiện báo `COMPUTED` khi bản ghi
tồn tại, vì vậy phải đọc metadata cho chất lượng phân tích. P3 có quality riêng
từng interval; metadata top-level mô tả mặc định tháng.

## Quy ước thuật toán

- Ngày UTC (`1D`), tuần kết thúc Chủ nhật (`1W`), tháng lịch (`1ME`). Bản ghi có
  ngày label là đầu bucket; `partial` báo bucket chưa trọn trong cửa sổ quan sát.
  Bucket trống trong lịch sử đã quan sát có count 0, mean/max null. Không thêm
  lịch sử trước sự kiện đầu tiên để giả đủ chu kỳ.
- Histogram: `<2`, `[2,3)`, `[3,4)`, `[4,5)`, `>=5`; có tính magnitude âm.
- Trend: moving average trailing 3 bucket, `min_periods=1`; slope hồi quy tuyến
  tính của metric trên chỉ số bucket đầy đủ. Bucket partial không tham gia slope.
  Ngưỡng stable là `max(1, max(abs(metric))) * 1e-9`, lưu trong từng series.
  Moving average ở bucket partial vẫn được trả kèm cờ partial. Một bucket có slope null.
- Năng lượng ước tính `10^(4.8 + 1.5M)` joules; không diễn giải là đo trực tiếp.
  Giá trị overflow được loại và thống kê, không ghi Infinity.
- Mùa vụ additive: tháng theo năm period 12 cần ít nhất 24 tháng đầy đủ; tuần dùng
  chu kỳ cố định 52 bucket cần 104 tuần. Tuần là phase tương đối bắt đầu ở bucket
  đầy đủ đầu tiên, không đồng nhất ISO week 53 với chu kỳ 52. Không hardcode seasonal.
  Trend/residual tại biên decomposition có thể null. Seasonal factor là thành phần
  cộng, có thể âm; đây không phải tỷ lệ nhân.
- Strength: `max(0, min(1, 1 - Var(residual)/Var(residual + seasonal)))` trên phần
  residual xác định, dùng phương sai tổng thể. Mẫu số gần 0 thì strength null;
  chuỗi hằng không được diễn giải là có mùa vụ mạnh.
- Pearson trên từng sự kiện với magnitude, depth, lat/lon, daily count và năng
  lượng. Daily count lặp theo sự kiện nên ngày nhiều sự kiện có nhiều quan sát.
  Dùng từng cặp hữu hạn; biến hằng/ít hơn hai quan sát có hệ số null, kể cả đường
  chéo. `sample_counts` cho biết số cặp. Không đổi null thành 0 hoặc ép đường chéo 1.

## Snapshot, phục hồi và giới hạn

Một transaction giữ PostgreSQL advisory lock bigint `0x47444D415303`, đọc sự kiện
trong một SELECT, tính và kiểm tra cả bốn payload trước khi thay snapshot T3.
Khóa theo transaction tự nhả khi commit/rollback. Reader thấy snapshot trước hoặc
sau commit; không thấy bộ kết quả chỉ ghi một phần. Khóa này chỉ bảo vệ các worker
mới cùng tuân thủ, không bảo vệ trước SQL thủ công hoặc seeder cũ.

`service_runs` ghi `analysis`, `SUCCESS`/`FAILED`, thời điểm và số sự kiện. RUNNING
được tạo trong transaction công bố nên không nhìn thấy khi đang tính. Lỗi rollback
snapshot và ghi FAILED bằng transaction riêng khi DB khả dụng. Thông báo lỗi chỉ
lưu tên lớp exception để tránh lộ SQL parameters hoặc URI kết nối.

Nguồn rỗng làm sạch bốn snapshot T3 cũ. API có thể trả `success=false` nếu toàn bộ
phân hệ rỗng, hoặc trả sáu patterns với T3 `PENDING` nếu T4/T5 còn dữ liệu. Nguồn
nạp lại hoặc bảng kết quả bị xóa sẽ được tính lại ở chu kỳ tiếp theo.

Feed giờ hiện hữu không đảm bảo đủ lịch sử mùa vụ. Worker báo thiếu dữ liệu thay
vì tạo dữ liệu giả; backfill dữ liệu thực là công việc riêng của nhóm. Scatter không
phân trang trong endpoint hiện hữu; cần đo kích thước payload trước khi cam kết API
dưới 100 ms ở tập dữ liệu lớn.

Trước lần công bố đầu trên DB dùng chung, lưu bản sao các snapshot T3 hiện có bằng
công cụ PostgreSQL của nhóm. Hoàn tác bằng dừng worker và phục hồi riêng bốn loại
T3 từ bản sao đã kiểm tra nếu cần; không xóa DB hoặc dùng Git reset.

## Kiểm thử

Chạy tại `apps/api/` với `PYTHONPATH=src`:

```powershell
uv run pytest tests/unit
```

Integration test yêu cầu `GDMAS_TEST_DATABASE_URL` trỏ đến PostgreSQL với tên DB kết
thúc `_test`. Không dùng DB dự án. Mỗi test tạo schema `feat03_test_<uuid>` riêng và
chỉ xóa schema đó khi xong; không xóa schema/bảng đã có. Nếu chưa cấu hình thì skip.

```powershell
uv run pytest -s tests/integration/test_analysis_pipeline.py
```

Ruff kiểm tra các tệp mới; `coverage`, `jsonschema` và `hypothesis` được cài riêng
trong môi trường QA, không thêm vào dependency dự án. `test_analysis_robustness.py`
bổ sung 150 tổ hợp dữ liệu tự sinh và các ranh giới lỗi vận hành. Để đo coverage:

```powershell
coverage run --source=gdmas.services.analysis,gdmas.schemas.analysis_metrics -m pytest -W error tests
coverage report -m
```

Phạm vi trên bao gồm runner placeholder cũ; báo cáo độ phủ các module mới riêng khi
nghiệm thu. Test hiệu năng in số sự kiện, pipeline, API latency và payload bytes;
không đưa ngưỡng wall-clock vào assertion correctness để tránh test chập chờn.

## Kết quả validation ngày 2026-11-10

Theo yêu cầu người dùng, agent tự chạy toàn bộ QA và sửa lỗi; không còn bước
yêu cầu người dùng kiểm thử thủ công. Có **52 test đạt trên cả ba môi trường**,
với `-W error` (cảnh báo cũng là lỗi), không có test skip hoặc cảnh báo. Coverage
các module mới đạt **99%** (420 statements, 4 chưa phủ); Ruff/Formatter và hợp đồng đạt.

Hai lỗi đã bắt và sửa bằng test hồi quy:

- ID BIGINT lớn hơn `2^53` từng bị làm tròn do `DataFrame.iterrows()` ép hàng sang
  float. Scatter nay dùng `itertuples()` để giữ nguyên kiểu số nguyên.
- Pandas 2.2.1 có thể tạo MultiIndex khi aggregate resampler rỗng. Nhánh rỗng nay
  trả DatetimeIndex UTC và kiểu cột tường minh, hoạt động ở cả Pandas 2.2 và 3.1.

| Môi trường | Kết quả |
| --- | --- |
| Python 3.12.16, thư viện trong image API hiện có | 52 passed |
| Python 3.12.16, các phiên bản tối thiểu trong pyproject | 52 passed |
| Python 3.11.18, các phiên bản tối thiểu trong pyproject | 52 passed |

Phiên bản tối thiểu đã kiểm tra: pandas 2.2.1, numpy 1.26.4, scipy 1.12.0,
statsmodels 0.14.1, SQLAlchemy 2.0.28, psycopg 3.1.18, Pydantic 2.6.4,
FastAPI 0.110.0, httpx 0.27.0, uvicorn 0.28.0 và sse-starlette 2.0.0.

Integration test tự chạy worker thật qua ít nhất ba chu kỳ, dừng bằng SIGINT,
khởi động Uvicorn thật và gọi HTTP qua socket. Test chủ động ngắt đúng kết nối
PostgreSQL của pipeline giữa transaction để xác nhận rollback, giữ snapshot cũ,
nhả khóa và phục hồi ở chu kỳ sau. Tất cả dùng DB/schema test cô lập.

Đo trên Docker Linux 8 CPU, khoảng 7,6 GiB RAM, PostgreSQL 16. HTTP đo sau warm-up,
10 request/cỡ dữ liệu; p95 theo nearest-rank là giá trị cao nhất của 10 mẫu.
Tiến trình HTTP riêng không bật coverage. Luôn trả đầy đủ điểm scatter, không sampling.

| Môi trường | HTTP p95: 100 sự kiện / 180 ngày | HTTP p95: 10.000 sự kiện / 730 ngày |
| --- | --- | --- |
| Python 3.12, image hiện có | 56,6 ms | 178,7 ms |
| Python 3.12, dependency tối thiểu | 36,6 ms | 253,4 ms |
| Python 3.11, dependency tối thiểu | 27,3 ms | 222,2 ms |

Pipeline dưới 1 giây trên fixture 10.000 sự kiện trong các lượt cuối (0,45–0,61 giây,
lượt image hiện có còn bật coverage ở tiến trình pytest). Fixture chuẩn 100 sự kiện
đạt mục tiêu API dưới 100 ms qua HTTP thật. Fixture lớn vẫn chưa đạt mục tiêu đó,
payload khoảng 1,44 MB; đây là giới hạn hiệu năng còn mở của route hiện hữu.
Không diễn giải số đo local thành SLA production. Tối ưu/phân trang route T6 cần
phạm vi riêng, không tự sửa router hoặc giảm số điểm dữ liệu để làm đẹp benchmark.
