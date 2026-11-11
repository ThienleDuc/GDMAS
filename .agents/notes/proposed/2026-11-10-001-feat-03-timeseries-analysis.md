# ĐỀ XUẤT & KẾ HOẠCH FEAT-03 — PHÂN TÍCH CHUỖI THỜI GIAN

- **Proposal ID:** 2026-11-10-001
- **Trạng thái:** Proposed — chưa triển khai
- **Người phụ trách:** Lê Trung Sơn — Backend Dev 1 — MSSV 21115053120241
- **Người đề xuất:** AI Agent theo yêu cầu của Lê Trung Sơn
- **Ngày tạo:** 2026-11-10
- **Nhánh dự kiến:** `feature/feat-03-timeseries-analysis`, tách từ `develop` sau khi duyệt; chưa tạo nhánh.
- **Thay thế (Overrides):** None.

## 1. Mục tiêu & bối cảnh nghiệp vụ

Theo [phân công](../../../docs/task-assignment.md), Sơn phụ trách Terminal 3: đọc `earthquake_events`, tính Patterns 1–4 mỗi 5 phút và lưu `analysis_results` để Terminal 6 phục vụ Terminal 7.

| Pattern | Sản phẩm bàn giao |
| --- | --- |
| 1 — Temporal | Dữ liệu Line, Scatter, Histogram; tổng hợp ngày/tuần/tháng |
| 2 — Trend | Chuỗi sau resampling, đường xu hướng, slope và chiều biến thiên |
| 3 — Seasonality | Thành phần mùa vụ tuần/tháng, phần dư và độ mạnh mùa vụ khi đủ lịch sử |
| 4 — Correlation | Ma trận Pearson từ dữ liệu thực; định nghĩa rõ biến và đơn vị quan sát |

### Căn cứ đã đọc và kiểm tra quyết định cũ

- [FEAT-03](../../../docs/planning/features/03-timeseries-analysis.md), [TC-PAT-01](../../../docs/planning/testing/03-test-timeseries-analysis.md), [phân công](../../../docs/task-assignment.md).
- [Quy ước chung](../../../docs/quyuocchung.md), [SAD](../../../docs/architecture/SAD.md), [ERD](../../../docs/architecture/ERD.md), [API](../../../docs/api/API.md), [yêu cầu bắt buộc](../../../docs/yeucaubatbuoc.md), [hợp đồng](../../../contracts/README.md).
- Đã đối chiếu runner, demo seeder, model DB, route patterns và trang Statistics hiện tại.
- `proposed/` và `implemented/` hiện chỉ có README tổng quan, chưa có proposal Approved/Rejected riêng cho FEAT-03. Không phát hiện xung đột với quyết định riêng đã duyệt/bác bỏ.
- `memory/context-memory.md` chưa tồn tại; sử dụng trực tiếp tài liệu và mã nguồn. Working tree ban đầu sạch, nhánh `develop`.

### Hiện trạng ảnh hưởng đến kế hoạch

| Quan sát | Hướng xử lý |
| --- | --- |
| `analysis/runner.py` đã tồn tại nhưng chỉ in thông báo và ngủ 300 giây | Cần pipeline thực; không ghi đè tệp theo RULE-03 |
| Seeder có một phần thống kê thật, nhưng trend có công thức minh họa, seasonality và correlation có số liệu cố định | Tham khảo cấu trúc; viết thuật toán riêng, không gọi seeder trong worker |
| `/api/v1/patterns` nhận `time_series`, `trend`, `seasonality`, `correlation` | Ghi đúng bốn tên runtime; không dùng các tên lệch trong đặc tả như `time_distribution`, `decomposition`, `correlation_matrix` |
| Route lấy bản ghi đầu tiên từng loại, không sắp theo thời gian | Chỉ duy trì một snapshot cho mỗi loại T3; không chèn nhiều interval hoặc lịch sử cùng loại |
| Bốn endpoint `/api/v1/analysis/*` trong API.md chưa được đăng ký | Tích hợp trước bằng endpoint hiện hữu; endpoint chuyên biệt cần thống nhất riêng với T6 |
| Các thư viện pandas/numpy/scipy/statsmodels đã khai báo | Chưa có căn cứ thêm dependency |
| Trang Statistics có fallback và chưa có đủ các biểu đồ yêu cầu | Bàn giao dữ liệu cho FE; nghiệm thu backend và nghiệm thu View 03 cần phân biệt |

## 2. Đánh giá khả thi theo kiến trúc GDMAS

- **T3 độc lập:** T1 cung cấp DB, T2 cung cấp dữ liệu, T6 đọc kết quả tính sẵn. Không nhúng worker hoặc tính toán vào FastAPI.
- **RULE-03:** Phương án đề xuất chỉ thêm tệp mới; giữ nguyên code runner, seeder, models, routes, frontend và cấu hình hiện có.
- **Điểm khác đặc tả cần ghi nhận khi duyệt:** Thêm entrypoint `gdmas.services.analysis.worker`. Lệnh `gdmas.services.analysis.runner` cũ vẫn chỉ là placeholder, không tự thực hiện phân tích. Vì vậy phương án này chưa đáp ứng nguyên văn AC-1 về lệnh runner trong đặc tả. Nếu nhóm bắt buộc giữ nguyên lệnh, cần đồng thuận nhóm cho ngoại lệ sửa runner thành dispatcher mỏng trước khi triển khai phần đó. Không mặc nhiên coi duyệt proposal là quyền sửa mã lõi.
- **Docker:** Compose hiện gọi runner cũ. Mốc này chạy worker bằng Terminal 3; nếu cần Docker, bổ sung Compose override mới và validation riêng, không sửa cấu hình hiện tại âm thầm.
- **Phạm vi:** Sơn thực hiện Patterns 1–4. FEAT-04, FEAT-05 và giao diện không thuộc phần lập trình này.

## 3. Phạm vi triển khai

### Tệp dự kiến thêm mới

Các đường dẫn Python dưới đây tính từ `apps/api/`.

| Tệp | Trách nhiệm |
| --- | --- |
| `src/gdmas/services/analysis/preprocessing.py` | Chuẩn hóa UTC, cửa sổ dữ liệu, resampling |
| `src/gdmas/services/analysis/statistical.py` | Pattern 1: line/scatter/histogram |
| `src/gdmas/services/analysis/decomposition.py` | Patterns 2–3, slope, seasonal/residual, thiếu dữ liệu |
| `src/gdmas/services/analysis/correlation.py` | Pearson và metadata biến |
| `src/gdmas/services/analysis/repository.py` | Truy vấn, khóa worker, transaction snapshot |
| `src/gdmas/services/analysis/pipeline.py` | `execute_cycle()` điều phối một chu kỳ và ServiceRun |
| `src/gdmas/services/analysis/worker.py` | `run()`, CLI `--once`, lịch 300 giây, dừng an toàn |
| `src/gdmas/schemas/analysis_metrics.py` | Kiểu dữ liệu kiểm tra JSONB đầu ra |
| `tests/unit/test_analysis_statistical.py` | Chuẩn hóa, resampling, P1 |
| `tests/unit/test_analysis_decomposition.py` | Trend, mùa vụ, dữ liệu ngắn/hằng |
| `tests/unit/test_analysis_correlation.py` | Pearson, biến hằng, null |
| `tests/unit/test_analysis_worker.py` | Lịch, lỗi chu kỳ, Ctrl+C; giả lập đồng hồ |
| `tests/integration/test_analysis_pipeline.py` | PostgreSQL, atomicity, recovery, API |

Bổ sung tại gốc repo:

- `contracts/schemas/analysis-patterns.json`.
- `contracts/examples/analysis_patterns_sample.json`, ghi rõ dữ liệu minh họa phục vụ kiểm thử.
- `docs/guides/backend/feat-03-timeseries-analysis.md`, hướng dẫn chạy, payload, bàn giao và khác biệt đặc tả.

### Ngoài phạm vi

Không thay schema DB hoặc model hiện hữu; không sửa ingestion, clustering, prediction, SSE, router hay frontend. Không refactor seeder, không bổ sung endpoint ở mốc đầu. Không tự tạo branch, commit, push hoặc xóa dữ liệu dùng chung.

## 4. Phương án kỹ thuật & các mốc thực hiện

### 4.1. Chốt hợp đồng dữ liệu trước thuật toán

Giữ envelope `/api/v1/patterns` và định danh `pattern_1` đến `pattern_4`. Lưu đúng bốn loại `time_series`, `trend`, `seasonality`, `correlation`.

- Mỗi loại có một bản ghi hiện hành. `time_interval` dự kiến là `multi`; `metrics_data.by_interval` chứa `day`, `week`, `month` cho từng pattern phù hợp.
- Payload top-level cung cấp chế độ mặc định: P1 ngày, P2 tuần, P3 tháng. Duy trì cấu trúc cũ như histogram dictionary, `trend_line`, `seasonal_components`, `variables`, `matrix` bằng alias sinh từ cùng một kết quả.
- Bổ sung `line_chart`, `scatter_plot`, `series`, `slope`, `trend_direction`, `seasonal_line`, `seasonality_strength`, `method` theo từng pattern. Chốt schema cụ thể và ví dụ tại M0 trước lập trình thuật toán.
- Metadata: `schema_version`, `computed_at`, phạm vi UTC, số sự kiện, `data_quality` và `reason`. Không ghi NaN/Infinity; số không xác định dùng JSON null.
- `period_start`/`period_end` phản ánh cửa sổ dữ liệu, khác thời điểm tính. Timestamp ISO 8601 UTC, giữ nguyên km/WGS84.
- API hiện coi có bản ghi là `COMPUTED`; trạng thái này chưa nói lên độ tin cậy mùa vụ. Client cần đọc metadata mới. Thay ngữ nghĩa status thuộc tác vụ riêng của T6.
- Endpoint hiện chưa có query interval/window; FE chọn series đã tính từ payload. Không hứa có lọc tùy ý qua route hiện hữu.

### 4.2. Chuẩn hóa đầu vào

Đọc các cột `id`, `event_time`, `magnitude`, `depth_km`, `latitude`, `longitude`, sắp thời gian tăng dần và chuẩn hóa DatetimeIndex UTC. Loại dữ liệu không hợp lệ theo cột cần dùng, ghi số lượng bị loại; không sửa sự kiện nguồn.

Mặc định xử lý toàn bộ lịch sử hiện có, hỗ trợ `--lookback-days 30` hoặc `90`. Mỗi lần chỉ công bố một cửa sổ cho bốn snapshot; không chạy nhiều cấu hình cùng ghi T3.

Dùng interval ngày/tuần/tháng tương ứng `1D`, `1W`, `1ME`; chốt ngày UTC, tuần kết thúc Chủ nhật, tháng lịch với label/closed tường minh. Kiểm tra biên và đánh dấu bucket chưa trọn kỳ. Bucket không có sự kiện trong phạm vi quan sát có count 0, mean/max null; không đệm dữ liệu trước lịch sử thực để giả đủ chu kỳ.

### 4.3. Thuật toán

| Pattern | Cách tính và xử lý biên |
| --- | --- |
| P1 | Count, mean/max magnitude, mean depth theo ngày/tuần/tháng. Scatter từ sự kiện thật. Histogram 5 khoảng tương thích seeder: `<2`, `[2,3)`, `[3,4)`, `[4,5)`, `>=5`; bảo toàn mọi magnitude hợp lệ, kể cả âm |
| P2 | Resample count, mean/max magnitude và tổng năng lượng ước tính. Moving average với cửa sổ công bố trong metadata; slope hồi quy tuyến tính theo thứ tự bucket, đơn vị theo bucket. Hướng tăng/giảm/ổn định theo ngưỡng số học tường minh; một bucket thì slope null |
| P3 | Phân rã additive bằng statsmodels khi có tối thiểu hai chu kỳ hoàn chỉnh. Mùa vụ năm theo tuần dùng period 52, theo tháng dùng period 12; cần tối thiểu 104 tuần hoặc 24 tháng đầy đủ. Thiếu dữ liệu báo `INSUFFICIENT_DATA`, thành phần chưa xác định là null. Không dùng period 4 rồi diễn giải thành mùa vụ năm; không dựng số liệu giả |
| P4 | Pearson trên sự kiện: magnitude, depth_km, latitude, longitude, daily_event_count gắn theo ngày UTC, energy_joules = 10^(4.8 + 1.5M). Metadata nêu `observation_unit=event` và đơn vị; daily count lặp theo sự kiện có trọng số theo số sự kiện/ngày. Ít hơn hai quan sát hữu hạn hoặc biến hằng thì hệ số null, kể cả đường chéo biến hằng |

Công bố cách tính seasonality strength và chặn về [0,1] khi xác định. Pearson phải đối xứng, trong [-1,1]; đường chéo bằng 1 chỉ cho biến có phương sai khác 0 và đủ quan sát. Năng lượng là ước tính theo công thức đặc tả, không phải giá trị đo trực tiếp.

### 4.4. Pipeline và vận hành

1. Tái sử dụng SessionLocal và cấu hình DB. Khóa một worker ghi T3 bằng PostgreSQL advisory lock với khóa cố định có tài liệu; các worker mới cùng tuân thủ khóa.
2. Đọc tập dữ liệu nhất quán, tính đủ bốn payload, kiểm tra schema/JSON trước công bố.
3. Transaction chỉ thay snapshot thuộc bốn loại T3; không xóa cả bảng hoặc tác động FEAT-04/05. Reader thấy phiên bản trước hoặc sau commit, không thấy kết quả dở dang.
4. Nguồn rỗng: xóa snapshot T3 cũ trong transaction, ghi chu kỳ 0 sự kiện; không gọi seeder/ingestion. Nếu T4/T5 còn dữ liệu, API có thể vẫn `success=true`, nhưng Patterns 1–4 phải `PENDING` với metrics rỗng.
5. Lỗi tính/ghi: rollback và giữ snapshot trước; ghi log và ServiceRun lỗi bằng transaction riêng khi DB khả dụng. Status phải thống nhất với service hiện hữu khi triển khai.
6. Chạy ngay khi khởi động, sau đó theo `ANALYSIS_INTERVAL_SECONDS` mặc định 300; dùng monotonic clock, không chồng chu kỳ, bỏ lịch đã lỡ khi chu kỳ kéo dài. Lỗi một lần không kết thúc worker; Ctrl+C dừng an toàn.
7. ServiceRun dùng `service_name=analysis`, ghi bắt đầu/kết thúc, số sự kiện và lỗi; log thời gian tính, không log thông tin kết nối bí mật.

Seeder cũ không dùng khóa mới và cũng ghi/xóa analysis_results. Không chạy đồng thời với T3: dừng T3, chạy demo seeder khi cần, rồi khởi động T3 để tính lại từ dữ liệu thực. Kịch bản xóa/nạp lại khi kiểm thử chỉ thực hiện trên DB test.

### 4.5. Kế hoạch công việc cho Sơn và AI QA

Ước lượng **5–7 ngày làm việc**, tùy DB và thời gian chốt hợp đồng; không phải lịch cam kết.

| Mốc | Thời lượng | Sơn thực hiện | AI QA hỗ trợ | Đầu ra nghiệm thu |
| --- | --- | --- | --- | --- |
| M0 — Hợp đồng | 0,5 ngày | Chốt entrypoint, interval, cửa sổ, payload với T6/FE | Fixture xác định và ma trận yêu cầu | Schema, ví dụ và khác biệt đặc tả được thống nhất |
| M1 — Chuẩn hóa + P1 | 1 ngày | Preprocessing, statistical | Biên UTC, histogram, bảo toàn count | Đủ ngày/tuần/tháng, line/scatter/histogram |
| M2 — P2/P3 | 1–2 ngày | Trend, slope, decomposition | Chuỗi tăng/giảm/hằng và đủ/thiếu hai chu kỳ | Không hardcode xu hướng hoặc mùa vụ |
| M3 — P4 | 0,5 ngày | Pearson, metadata | Đối chiếu phép tính độc lập, null/biến hằng | Ma trận đúng và JSON hợp lệ |
| M4 — Pipeline + worker | 1 ngày | DB, transaction, ServiceRun, CLI | Rollback, khóa, lịch, dừng, mất kết nối | Một chu kỳ và lịch 300 giây hoạt động |
| M5 — Tích hợp + bàn giao | 1 ngày | Demo T1/T2/T3/T6, hướng dẫn | API contract, recovery, đo hiệu năng | Báo cáo validation và dữ liệu bàn giao FE |

Thứ tự: M0 → M1 → M2/M3 → M4 → M5. Kiểm thử đi cùng từng mốc. Sơn sở hữu thuật toán và tích hợp; AI hỗ trợ QA theo phân công. Không tự gửi thông điệp hoặc giao việc qua công cụ cho thành viên khác.

### 4.6. Lệnh chạy dự kiến

Tại `apps/api/`, sau khi T1 sẵn sàng và T2 có dữ liệu:

```powershell
uv run python -m gdmas.services.analysis.worker --once
uv run python -m gdmas.services.analysis.worker
```

Các lệnh này thuộc module dự kiến, hiện chưa tồn tại. Chạy thử một chu kỳ trước khi chạy định kỳ; không chạy đồng thời placeholder và worker rồi coi là hai T3.

## 5. Phương án đã cân nhắc

| Phương án | Đánh giá |
| --- | --- |
| Gọi lại toàn bộ demo seeder mỗi 5 phút | Không chọn: có số liệu minh họa, tự seed và ảnh hưởng clustering/prediction |
| Sửa runner cũ gọi pipeline mới | Giữ lệnh đúng đặc tả, nhưng cần đồng thuận nhóm cho ngoại lệ RULE-03 trước khi sửa |
| Thêm worker và thuật toán mới, payload tương thích API cũ | **Đề xuất chọn:** chỉ thêm mới, phạm vi rõ; cần ghi nhận thay lệnh chạy và giới hạn API/FE |
| Mở ngay bốn endpoint analysis | Hữu ích cho lọc tùy ý, nhưng cần thiết kế cache và đăng ký router; tách khỏi mốc đầu với T6 |

## 6. Tác động kiến trúc & phụ thuộc

- Tái sử dụng analysis_results và service_runs; không cần migration.
- Thêm schema, mẫu và hướng dẫn, mô tả khác biệt với API.md/ERD/FEAT-03/test spec. Việc sửa tài liệu gốc sẽ theo tác vụ tài liệu được thống nhất.
- T6 xác nhận envelope, bốn tên loại runtime và giới hạn status; không tính lại thuật toán trong request.
- FE nhận by_interval, metadata thiếu dữ liệu và null; FE sở hữu biểu đồ, selector và sửa fallback che mất số 0. Chưa thể coi backend hoàn thành là View 03 hoàn thành.
- T2 hiện dùng feed giờ, không mặc nhiên có hai năm lịch sử. QA tạo chuỗi đủ dài trong DB test. Backfill dữ liệu thực là công việc riêng, không tự sửa ingestion.
- Scatter lớn có thể tăng payload. Đo API theo kích thước đã nêu; nếu không đạt mục tiêu, thống nhất giới hạn/phân trang hoặc endpoint riêng với T6, không cắt dữ liệu âm thầm.

## 7. Tiêu chí nghiệm thu & validation

| ID | Điều kiện đạt |
| --- | --- |
| AC-01 | Worker mới chạy độc lập, --once và lịch mặc định 300 giây được kiểm tra. Việc thay lệnh phải được duyệt; không tuyên bố lệnh runner cũ đã hoạt động |
| AC-02 | P1 đủ ba interval; tổng count và histogram bảo toàn sự kiện; scatter lấy dữ liệu thực |
| AC-03 | P2 đúng trên fixture tăng/giảm/hằng, slope/metric có đơn vị và ngưỡng được công bố |
| AC-04 | P3 trích xuất được chu kỳ biết trước trên fixture đủ dài; lịch sử ngắn báo thiếu dữ liệu. Không yêu cầu sáu tháng chứng minh mùa vụ năm |
| AC-05 | Pearson khớp phép tính mẫu độc lập, đối xứng, miền giá trị đúng khi xác định; không có NaN/Infinity trong JSON |
| AC-06 | Đúng một snapshot mỗi loại qua nhiều lần chạy; rollback không để lộ kết quả dở dang; hai worker mới không ghi đồng thời |
| AC-07 | Xóa kết quả rồi chạy lại tái tạo đủ bốn loại. Nguồn rỗng làm sạch T3 cũ, nguồn nạp lại phục hồi ở chu kỳ kế tiếp, không seed giả |
| AC-08 | /api/v1/patterns trả đủ metrics T3 và giữ nguyên dữ liệu T4/T5. Không ép success=false nếu phân hệ khác còn dữ liệu |
| AC-09 | Mục tiêu pipeline <5 giây trên fixture ít nhất 100 sự kiện/6 tháng; đo thêm 10.000 sự kiện/24 tháng. Ghi cấu hình máy, thời gian DB và kích thước payload; đo mục tiêu API <100 ms riêng |
| AC-10 | Coverage module mới mục tiêu ≥80%; có schema, mẫu và hướng dẫn. Không giả định pytest-cov đã được cài |

Lệnh dự kiến tại `apps/api/` sau triển khai:

```powershell
uv run pytest tests/unit/test_analysis_statistical.py tests/unit/test_analysis_decomposition.py tests/unit/test_analysis_correlation.py tests/unit/test_analysis_worker.py
uv run pytest tests/integration/test_analysis_pipeline.py
```

Chạy Ruff check trên các tệp mới của analysis, schema và test; chạy suite backend liên quan sau test tập trung. Conftest hiện rỗng, thêm fixture trong tệp test mới; DB integration phải là DB test riêng và xác minh đích trước thao tác xóa. Nếu đo coverage cần công cụ bổ sung, ghi rõ cách cài/chạy trong kế hoạch triển khai, không sửa dependency âm thầm. pnpm build chỉ cần khi phạm vi FE được thống nhất thêm. Phiên lập kế hoạch chưa chạy test/build vì chưa lập trình.

## 8. Kế hoạch hoàn tác

Dừng worker mới ở T3; code cũ giữ nguyên. Runner placeholder không phải phương án duy trì phân tích. Khi triển khai, sao lưu snapshot T3 trước lần công bố đầu; chỉ phục hồi bốn loại T3 từ bản sao đã kiểm tra nếu cần, không xóa DB hoặc tác động T4/T5. Không có migration để downgrade; không tự động xóa tệp hoặc dùng git reset.

## 9. Phê duyệt của con người

- **Reviewer:** Lê Trung Sơn (phê duyệt trực tiếp trong hội thoại)
- **Ngày duyệt:** 2026-11-10
- **Decision:** Approved
- **Comments:** Người dùng phê duyệt toàn bộ kế hoạch và yêu cầu bắt đầu code; chấp nhận worker mới và phạm vi chỉ bổ sung theo proposal.
- **Lựa chọn đề xuất:** Chấp nhận `gdmas.services.analysis.worker` cho mốc FEAT-03; dùng API hiện hữu và metadata thiếu dữ liệu; không sửa runner/router cũ. Nếu bắt buộc giữ lệnh runner, cần quyết định nhóm cho ngoại lệ sửa runner trước khi làm phần đó.

Sau khi được duyệt rõ ràng (`Decision: Approved`), bước tiếp theo là tạo plan.md/status.md theo skill build-implementation, rồi lập trình và validation trên working tree. Phiên hiện tại chỉ tạo proposal và dòng index; chưa có code, commit hoặc push.

## 10. Lịch sử tu chỉnh

- 2026-11-10: Khởi tạo kế hoạch theo phân công Lê Trung Sơn; đối chiếu code/đặc tả, đề xuất worker bổ sung, payload tương thích, mốc thực hiện và QA.
