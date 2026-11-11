# QA & PROJECT REVIEW — TƯƠNG THÍCH ALIAS P2/P3

- **Proposal:** 2026-11-11-001 — Approved bởi Lê Trung Sơn ngày 2026-11-11.
- **Nhánh:** bugfix/analysis-legacy-alias-compatibility, base 0224c80 (FEAT-03).
- **Kết quả:** PASS trong phạm vi đã duyệt; trạng thái validation trên working tree.
- **Giới hạn:** Chưa kích hoạt worker trên DB dự án; HTTP lớn vẫn vượt 100 ms. Client khóa schema 1.0 cần chọn hợp đồng mới; không tái tạo số liệu minh họa cũ.

## 1. Kết quả kiểm thử cuối

**99 passed trong 137,41 giây**, chạy toàn bộ `tests` với `-W error`, không skip hoặc cảnh báo pytest. Gồm **52 test FEAT-03 giữ nguyên** và **47 test mới** (36 unit, 11 integration). Ca Hypothesis cũ vẫn chạy 150 tổ hợp trong một pytest test, không cộng thành 150 test riêng.

Lệnh chính tại `apps/api/` trong bản sao container, `PYTHONPATH=/tmp/review/apps/api/src`:

```text
coverage run --source=gdmas.services.analysis.legacy_aliases,gdmas.services.analysis.alias_pipeline,gdmas.services.analysis.alias_worker,gdmas.schemas.analysis_alias_metrics -m pytest -q -s -W error -p no:cacheprovider tests
coverage report -m
```

Ruff check và formatter check đạt trên cả sáu tệp Python mới. `git diff --check` đạt; source/test/schema/cấu hình cũ không thay đổi.

| Module mới | Statements | Chưa phủ | Coverage |
| --- | --- | --- | --- |
| analysis_alias_metrics.py | 35 | 1 | 97% |
| alias_pipeline.py | 15 | 0 | 100% |
| alias_worker.py | 16 | 4 | 75% |
| legacy_aliases.py | 84 | 3 | 96% |
| Tổng | 150 | 8 | 95% |

Luồng main CLI đã chạy ở tiến trình con nhưng coverage không gộp tiến trình con. Các dòng còn lại gồm nhánh từ chối cấu hình/seasonal payload không nhất quán; không tuyên bố phủ mọi nhánh.

## 2. Môi trường và các vấn đề QA đã giải quyết

Docker Linux với image `gdmas-api:latest`, Python 3.12.16, PostgreSQL 16 Alpine riêng. Dependency chính: pandas 3.1.1, numpy 2.5.4, scipy 1.18.1, statsmodels 0.15.0, Pydantic 2.14.3, SQLAlchemy 2.1.8, psycopg 3.3.8, FastAPI 0.162.2, HTTPX 0.28.1, Uvicorn 0.54.0.

Công cụ chỉ cài trong container QA: pytest 9.2.0, Hypothesis 6.170.15, jsonschema 4.26.0 với extras `[format]` và rfc3339-validator 0.1.4, coverage 7.17.2, Ruff 0.17.4. Không sửa manifests hoặc cài công cụ lên host. Lần này xác minh trên một môi trường Python 3.12; không diễn giải kết quả ba môi trường của FEAT-03 cũ thành kiểm thử đa môi trường cho alias mới.

Mã nguồn host gắn chỉ đọc, test/lint chạy trên bản sao `/tmp/review`; mode file Python trên bản sao đặt 0644 để tránh Windows bind mount báo executable giả. DB `gdmas_alias_test` chạy trong network Docker riêng, không mở cổng host; fixture dùng schema UUID và chỉ dọn schema do chính test tạo. Không dùng DB dự án.

Lượt đầu kiểm thử phát hiện môi trường jsonschema thiếu extras `[format]` nên chưa từ chối datetime sai; đã cài đúng dependency QA và giữ ca kiểm thử. Hai fixture integration mới ban đầu thiếu lower_bound/upper_bound bắt buộc của P5; đã bổ sung dữ liệu fixture, không sửa model hoặc code P5. Lượt cuối đạt toàn bộ 99 test, không filter/skip ca thất bại.

## 3. Truy vết tiêu chí nghiệm thu

| Tiêu chí | Bằng chứng |
| --- | --- |
| AC-01 | Alias giữ trường hiện có, thêm đủ trường cũ; kiểm tra kiểu int, zero, null và số liệu thực |
| AC-02 | Fixture qua biên năm, Chủ nhật/thứ Hai, bucket partial; đảo thứ tự series vẫn ghép đúng; thiếu/trùng bucket hoặc sai count/magnitude bị từ chối |
| AC-03 | Slope tuần bằng -2 trên fixture xác định; typical_events của tháng 1 có 10/11 thành 11, tháng 2 có 0/0 thành 0; không đổi seasonal factor âm |
| AC-04 | Nguồn rỗng, một sự kiện, 24 tháng hằng và 24 tháng biến thiên; chất lượng/decomposition giữ nguyên |
| AC-05 | Không mutation, idempotence trên 1.1; alias sai không được tự sửa; phép chiếu về 1.0 bằng input; P1/P4 và scatter giữ nguyên |
| AC-06 | Export Pydantic bằng JSON Schema; cả hai case mẫu, payload sinh và payload API qua schema với FormatChecker; datetime sai bị từ chối; validator 1.0 tiếp tục áp dụng cho payload cũ |
| AC-07 | Unit xác nhận validation trước DB mutation; integration inject lỗi adapter, exception/KeyboardInterrupt/mất kết nối sau flush, reader giữ snapshot trước; chu kỳ kế tiếp phục hồi |
| AC-08 | Khóa hai chiều giữa pipeline cũ/mới, một snapshot mỗi loại, nguồn rỗng/nạp lại; API giữ prediction/classification/clustering và bản ghi analysis khác |
| AC-09 | Tiến trình thật chạy --once/lookback 30 ngày, ít nhất ba chu kỳ định kỳ, SIGINT exit 0; chạy worker cũ để quay về 1.0; 52 test cũ vẫn đạt |
| AC-10 | Ruff/formatter sáu tệp mới, schema match, source-guard đạt; không thay source/test/schema cũ |
| AC-11 | HTTP qua socket Uvicorn thật, warm-up + 10 request trên cùng fixture trước/sau; giữ đủ 100/10.000 điểm scatter |

## 4. Hiệu năng trước/sau

Hai pipeline cùng chạy với computed_at và tập sự kiện như nhau. Tiến trình pipeline có bật coverage; tiến trình API riêng không bật coverage. HTTP p95 nearest-rank của 10 request là giá trị lớn nhất. Đây là số đo local, không phải SLA hoặc kết luận tăng tốc trên fixture nhỏ.

| Fixture | Pipeline trước / sau | HTTP p95 trước / sau | Payload trước / sau |
| --- | --- | --- | --- |
| 100 sự kiện / 180 ngày | 239,1 / 260,3 ms | 81,7 / 31,5 ms | 149.739 / 152.713 byte |
| 10.000 sự kiện / 730 ngày | 761,3 / 833,6 ms | 195,5 / 243,8 ms | 1.438.568 / 1.451.934 byte |

Alias tăng 2.974 byte ở fixture nhỏ, 13.366 byte ở fixture lớn. Pipeline vẫn dưới mục tiêu 5 giây; HTTP lớn vẫn vượt 100 ms. Không tối ưu T6/FE, sampling hoặc cắt scatter để đạt số đo.

## 5. Project-review I1–I7, scope và drift

| Bất biến | Kết quả | Căn cứ |
| --- | --- | --- |
| I1 | PASS | alias_worker độc lập T3, tái sử dụng scheduler; không sửa main.py |
| I2 | PASS | Chỉ thêm source/test/schema/docs mới, không xóa hoặc sửa source cũ |
| I3 | PASS trong giới hạn đã duyệt | P2/P3 1.1 có trường legacy; P1/P4 1.0 nguyên vẹn; UTC/WGS84; giới hạn null/additive/validator 1.0 ghi rõ |
| I4 | PASS | Không thay DB schema hoặc migrations |
| I5 | PASS | Chỉ alias P2/P3; canonical P1–P4 và P5/P6 giữ nguyên; không sửa UI |
| I6 | PASS | Không stage .env hoặc thêm secret thật; DB QA dùng credential giả, cô lập |
| I7 | PASS | 52 test cũ nguyên trạng và đạt; 47 test bổ sung độc lập |

Đúng danh sách In Scope tại plan/proposal: bốn source, hai test, hai contract/example và một hướng dẫn mới, cùng hồ sơ được phép. Index/proposal cập nhật quyết định theo lời duyệt của người dùng. Không phát hiện scope creep; không áp dụng lại phương án bị bác. Việc thêm CLI/schema 1.1 đã nằm trong proposal Approved.

Hướng dẫn mới dẫn tới docs FEAT-03 và schema/mẫu tương ứng, nêu rõ bước chuyển entrypoint, rollback, số liệu thật và giới hạn client. Docs/schema 1.0 giữ nguyên cho worker cũ. Không khẳng định alias mới tự có hiệu lực khi chạy worker cũ hoặc Compose cũ.

## 6. Trạng thái bàn giao

Tại mốc kết thúc validation, thay đổi nằm trên working tree và chưa stage/commit/push/PR/merge. Chưa kích hoạt hoặc ghi vào DB dự án. Sau đánh giá riêng mới chuyển T3 sang alias_worker; không chạy song song với worker cũ. Các container/network QA được dọn sau khi lấy kết quả; chỉ còn source, hợp đồng, test và hồ sơ trong workspace.

Ngày 2026-11-11, người dùng chủ động gọi git-commit-push để đóng gói kết quả này và đẩy nhánh. Giữ nguyên trạng thái validation và giới hạn hiệu năng/tương thích đã nêu; không mở PR/merge hoặc kích hoạt DB dự án. Hash và xác nhận đồng bộ được cập nhật trong context-memory sau khi thực hiện.
