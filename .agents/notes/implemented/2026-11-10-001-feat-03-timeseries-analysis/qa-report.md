# QA & PROJECT REVIEW — FEAT-03

- **Nhánh:** feature/feat-03-timeseries-analysis
- **Proposal:** 2026-11-10-001, Approved bởi Lê Trung Sơn.
- **Yêu cầu bổ sung:** Người dùng yêu cầu agent tự kiểm thử và sửa lỗi, không giao lại kiểm thử thủ công; người dùng quyết định PR/merge develop sau báo cáo.
- **Kết luận chức năng:** PASS — không còn lỗi chức năng phát hiện trong phạm vi đã kiểm thử.
- **Kết luận kiến trúc:** PASS — chỉ bổ sung, giữ nguyên code cũ.
- **Hiệu năng:** PASS trên fixture chuẩn 100 sự kiện; WARNING với API trả toàn bộ 10.000 sự kiện, còn vượt mục tiêu 100 ms.
- **Trạng thái:** validation; không stage, commit, push, mở PR hoặc merge.

## 1. Hai lỗi đã sửa

| Lỗi | Tái hiện | Cách sửa | Kiểm tra hồi quy |
| --- | --- | --- | --- |
| Mất độ chính xác ID BIGINT | ID 9007199254740993 thành 9007199254740992 trong scatter | Dùng DataFrame.itertuples thay iterrows, giữ kiểu số nguyên | Test BigInt đạt trên cả ba môi trường |
| Không tương thích Pandas 2.2 khi dữ liệu rỗng | compute_patterns([]) lỗi MultiIndex không có tz_localize | Aggregate rỗng trả DatetimeIndex UTC và kiểu cột tường minh | Test ngày/tuần/tháng, empty JSON và dữ liệu sinh tự động đạt |

## 2. Ma trận môi trường

| Python | Dependency | Lệnh cuối | Kết quả |
| --- | --- | --- | --- |
| 3.12.16 | Image API hiện có: pandas 3.1.1, numpy 2.5.4, scipy 1.18.1, statsmodels 0.15.0, Pydantic 2.14.3 | coverage run ... -m pytest -q -s -W error -p no:cacheprovider tests | 52 passed, 59,92 s |
| 3.12.16 | Các phiên bản tối thiểu trong pyproject | python -m pytest -q -s -W error -p no:cacheprovider tests | 52 passed, 45,94 s |
| 3.11.18 | Các phiên bản tối thiểu trong pyproject | python -m pytest -q -s -W error -p no:cacheprovider tests | 52 passed, 38,40 s |

Tổng cộng 156 lượt test đạt trong ma trận cuối, không skip/cảnh báo. Mỗi môi trường chạy 150 tổ hợp dữ liệu xác định bằng Hypothesis; số tổ hợp nằm trong một pytest test, không cộng thành 150 pytest cases riêng.

Dependency tối thiểu: pandas 2.2.1, numpy 1.26.4, scipy 1.12.0, statsmodels 0.14.1, SQLAlchemy 2.0.28, psycopg/binary 3.1.18, Pydantic 2.6.4, pydantic-settings 2.2.1, FastAPI 0.110.0, httpx 0.27.0, uvicorn 0.28.0, sse-starlette 2.0.0. Không sửa manifests/lockfile để thực hiện QA.

Coverage tám module mới: 420 statements, 4 chưa phủ, 99%. Các nhánh CLI chạy ở tiến trình con không được gộp coverage nhưng đã thực thi bằng integration test.

## 3. Các hành vi được kiểm tra tự động

- Chuẩn hóa UTC, biên ngày/tuần/tháng, thời gian tương lai/ngoài lookback, dữ liệu không hợp lệ, histogram đủ 5 khoảng và bảo toàn count.
- Bucket yên lặng sau sự kiện cuối; không tạo lịch sử giả trước sự kiện đầu dù lookback dài.
- Scatter giữ nguyên BIGINT và toàn bộ sự kiện hợp lệ, không sampling hoặc cắt bớt benchmark.
- Slope tăng/giảm/hằng, loại bucket partial khỏi slope, mùa vụ đủ/thiếu hai chu kỳ và chuỗi hằng.
- Pearson đối xứng, miền hệ số, cặp thiếu dữ liệu, biến hằng, số cặp và JSON không NaN/Infinity.
- Snapshot giới hạn đúng bốn loại, giữ nguyên kết quả T4/T5, reader không thấy dữ liệu dở dang.
- Rollback khi lỗi, khi SIGINT/KeyboardInterrupt giữa publish và khi thực sự pg_terminate_backend đúng session pipeline của test; khóa được giải phóng, chu kỳ sau phục hồi.
- Worker thật chạy ít nhất ba chu kỳ một giây và dừng bằng SIGINT với exit code 0.
- CLI --once thật; lịch monotonic không chồng, bỏ lịch trễ, đầu vào không hợp lệ.
- Uvicorn thật và HTTP qua socket với đủ 100/10.000 điểm scatter.
- DB nguồn rỗng, xóa kết quả, nạp lại, giữ snapshot cũ khi DB lỗi; log/result không lộ mật khẩu kết nối.
- JSON Schema và payload mẫu khớp Pydantic; Ruff và Formatter đạt trên 14 tệp Python mới.

Các ca tiêm lỗi/đầu vào CLI không hợp lệ cố ý tạo exception hoặc exit code 2 và assert hành vi đó; đây không phải lỗi còn tồn ở cuối suite. Dùng HTTPX ASGITransport thay TestClient deprecated trong test; không sửa thư viện/framework hoặc ẩn cảnh báo.

## 4. Hiệu năng HTTP thật

Docker Linux, 8 CPU, khoảng 7,6 GiB RAM, PostgreSQL 16 riêng. Mỗi cỡ dữ liệu warm-up rồi gọi 10 HTTP request; p95 nearest-rank là max của 10 mẫu. Uvicorn chạy ở tiến trình riêng không bật coverage.

| Môi trường | P50 / P95: 100 sự kiện | P50 / P95: 10.000 sự kiện |
| --- | --- | --- |
| Python 3.12, image hiện có | 19,9 / 56,6 ms | 164,1 / 178,7 ms |
| Python 3.12, dependency tối thiểu | 23,4 / 36,6 ms | 182,5 / 253,4 ms |
| Python 3.11, dependency tối thiểu | 21,5 / 27,3 ms | 190,4 / 222,2 ms |

Payload khoảng 149.739 byte / 1.438.568 byte. Pipeline 10.000 sự kiện ở lượt cuối 0,45–0,61 giây; lượt image còn bật coverage ở pytest. Mục tiêu pipeline <5 giây và API <100 ms với fixture chuẩn 100 sự kiện đạt. Không tuyên bố mục tiêu API đạt cho 10.000 sự kiện: route T6 hiện hữu vẫn tuần tự hóa payload đầy đủ. Việc tối ưu router/phân trang là phạm vi T6/FE riêng, không tự sửa code T6 hoặc cắt dữ liệu để thay số đo. Số đo local không phải SLA production.

## 5. Project-review: I1–I7

| Bất biến | Kết quả | Bằng chứng |
| --- | --- | --- |
| I1 — Terminal độc lập | PASS | Worker mới độc lập theo proposal; main.py không đổi; tiến trình thật đã chạy |
| I2 — Open-Closed | PASS | Không sửa/xóa source cũ; chỉ thay code mới chưa commit và thêm test |
| I3 — Contract/UTC/WGS84 | PASS | Schema và fixture qua ba môi trường; UTC/calendar/property tests |
| I4 — Migration | PASS | Không đổi schema hoặc migration cũ |
| I5 — Patterns | PASS trong FEAT-03 | P1–P4 được kiểm thử; dữ liệu P5/P6 và clustering giữ nguyên |
| I6 — Secrets | PASS | Không stage .env; secret test chỉ trong container; ca redaction đạt |
| I7 — Test integrity | PASS | Không sửa test cũ trong HEAD; thêm QA độc lập, không skip ở ma trận cuối |

## 6. Scope và drift

Đúng phạm vi worker/P1–P4; không sửa source T1/T2/T4/T5/T6/T7, router, models, manifests, migrations hoặc Compose. Bổ sung test_analysis_robustness.py và các ca fault injection/HTTP/runtime theo yêu cầu QA mới của người dùng; đã ghi trong plan/status. Docs cập nhật hai lỗi đã sửa, ma trận tương thích, kết quả HTTP thật và giới hạn hiệu năng còn mở. Không đổi hợp đồng API hoặc giảm fidelity.

Entrypoint mới vẫn là analysis.worker theo quyết định Approved. Runner/Compose cũ vẫn placeholder; không có tuyên bố sai rằng chúng đã được nâng cấp. Agent hoàn thành kiểm thử tự động; quyền quyết định mở PR/merge thuộc người dùng.
