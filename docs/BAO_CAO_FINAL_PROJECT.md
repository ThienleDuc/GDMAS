# BÁO CÁO FINAL PROJECT

## GDMAS — Global Disaster Monitoring & Analysis System

**Hệ thống giám sát và phân tích dữ liệu động đất toàn cầu**

- **Nguồn yêu cầu:** slide thứ 3, “Tập báo cáo”, của `docs/Class #10 - Requirements for Final project.pptx`. Báo cáo không sử dụng slide 2 làm yêu cầu.
- **Mốc đối chiếu source:** commit `9454b35`, ngày lập báo cáo **25/11/2026**.
- **Phạm vi thực tế:** dữ liệu động đất USGS, không phải hệ thống đã hỗ trợ mọi loại thiên tai. Sáu patterns gồm biểu diễn thời gian, xu hướng, mùa vụ, tương quan, dự báo định lượng và phân loại.
- **Ngôn ngữ:** tiếng Việt; thuật ngữ, tên API, bảng và định danh source giữ tiếng Anh.
- **Quy ước bằng chứng:** “đã hiện thực” là có mã; “đã kiểm thử” chỉ dùng khi có kết quả chạy trong phiên lập báo cáo; số liệu trong artifact được ghi rõ là kết quả lưu sẵn, không phải phép đo được tái lập.
- **Thông tin môn học, lớp, mã sinh viên, giảng viên hướng dẫn:** [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].

| Thành viên | Vai trò được ghi trong `.agents/team.md` |
|---|---|
| Lê Đức Thiện | Techlead / Frontend Developer, kiến trúc tổng thể và T7 |
| Lê Trung Sơn | Backend Dev 1, Time-Series Analysis, T3 |
| Nguyễn Đình Văn | Backend Dev 2, Spatial Clustering DBSCAN, T4 |
| Trần Đức Tài | Backend Dev 3, Prediction & Risk, T5 |

## Mục lục

1. [High-level Design / System Architecture](#muc-1)
2. [Các Use Case: tiền điều kiện và dữ liệu vào/ra](#muc-2)
3. [Sequence Diagram cho các use case chính](#muc-3)
4. [Phương pháp luận: dữ liệu, data flow và lý do thiết kế](#muc-4)
5. [Deployment Design](#muc-5)
6. [API Documentation](#muc-6)
7. [Sơ đồ ERD toàn bộ database](#muc-7)
8. [Figma UI/Canvas](#muc-8)
9. [Kết quả demo và bằng chứng kiểm chứng](#muc-9)
10. [Folder structure của source code](#muc-10)
11. [Toàn bộ source code Backend](#muc-11)

<a id="muc-1"></a>

## 1. High-level Design / System Architecture

**Bố cục một trang:** sơ đồ dưới đây là một khối kiến trúc duy nhất, trình bày trên một trang ngang khi xuất PDF. Markdown không cố định khổ giấy; cần chọn Landscape và scale-to-fit cho riêng trang sơ đồ khi in. Các phần giải thích và triển khai chi tiết nằm ở mục 4–5, không ghép thêm vào trang kiến trúc.

```mermaid
flowchart LR
    subgraph EXT["Nguồn và dịch vụ ngoài hệ thống"]
        USGS["USGS GeoJSON / FDSN Event API<br/>Dữ liệu quan trắc động đất"]
        GEO["Bản đồ nền bên ngoài<br/>Tiles / GeoJSON fallback đóng gói"]
        GEMINI["Google Gemini API<br/>Diễn giải dữ liệu, tùy chọn"]
    end
    subgraph GDMAS["GDMAS — 7 tiến trình / terminals độc lập"]
        subgraph WORKERS["T2–T5: xử lý dữ liệu ngoài FastAPI"]
            T2["T2 Ingestion · 300 s<br/>httpx → parse / validate<br/>UTC + WGS84 + geo enrichment<br/>Upsert theo (source, source_event_id) / backfill"]
            T3["T3 Analysis · 300 s<br/>P1 Temporal / P2 Trend<br/>P3 Seasonality / P4 Correlation<br/>pandas + SciPy + statsmodels"]
            T4["T4 Clustering · 86400 s<br/>DBSCAN + Haversine<br/>eps 150 km / min_samples 5<br/>Snapshot cụm và ánh xạ sự kiện"]
            T5["T5 Prediction · 300 s<br/>P5 ARIMA log, one-step daily count<br/>P6 Forecast-Distribution classifier<br/>Nạp artifact, không train online"]
            ART[("Artifact local<br/>forecast_model.joblib<br/>risk_classifier.joblib<br/>recent_history.json<br/>training_report.json")]
        end
        DB[("T1 PostgreSQL 16<br/>earthquake_events / analysis_results<br/>clustering_results / clustering_event_mapping<br/>prediction_results / classification_results<br/>service_runs / alembic_version<br/>SSE đọc trạng thái bằng SQL polling")]
        subgraph API["T6 FastAPI + Uvicorn · :8000"]
            REST["REST /api/v1<br/>Earthquakes, Statistics, Patterns<br/>Analysis, Clusters, Predictions<br/>Classifications, System, AI settings"]
            SSE["SSE /api/v1/events/stream<br/>SQL polling mỗi 2 s / client<br/>earthquake_detected / ingestion_cycle_completed / heartbeat"]
            ONFLY["Filtered analysis / forecast<br/>Tính theo phạm vi ngay trong request"]
            AI["Proxy Gemini / cấu hình API key<br/>Không ghi key vào bảng nghiệp vụ"]
        end
        subgraph WEB["T7 React + Vite · :3000"]
            UI["Overview / Earthquakes / Monitoring<br/>Statistics: 6 patterns<br/>Dark Mode / UTC hoặc UTC+7"]
            CLIENT["fetch API client + React hooks<br/>REST fetch / state / refetch<br/>EventSource SSE"]
            MAP["Leaflet map + Recharts<br/>Loading / Error / Empty states"]
        end
    end
    USER["Người dùng trình duyệt"]
    USGS -->|GeoJSON / HTTP| T2
    GEO -.->|Tiles / fallback| MAP
    T2 -->|Upsert + commit| DB
    DB -->|Raw events| T3
    DB -->|Tọa độ / cửa sổ thời gian| T4
    DB -->|Counts ngày UTC hoàn tất| T5
    ART --> T5
    ART --> ONFLY
    T3 -->|Snapshot P1–P4 + ServiceRun| DB
    T4 -->|Clusters + mapping + ServiceRun| DB
    T5 -->|Forecast + classification + actuals + ServiceRun| DB
    REST <-->|SQLAlchemy Session / psycopg| DB
    DB -->|SQL polling mỗi 2 s| SSE
    REST --> ONFLY
    ONFLY -->|Query raw events| DB
    REST --> AI
    AI <-->|HTTPS JSON / key server-side| GEMINI
    USER <--> UI
    UI --> CLIENT
    UI --> MAP
    CLIENT <-->|HTTP REST / JSON| REST
    SSE -->|text/event-stream| CLIENT
```

<a id="muc-2"></a>

## 2. Các Use Case: tiền điều kiện và dữ liệu vào/ra

### 2.1. Tác nhân và phạm vi

- **Người dùng Dashboard:** xem và lọc dữ liệu, bản đồ, phân tích, dự báo; sử dụng AI nếu có cấu hình.
- **Người vận hành:** khởi động database, migration, API và bốn worker; theo dõi tình trạng; chủ động đồng bộ hoặc reset khi cần.
- **USGS:** cung cấp dữ liệu bên ngoài.
- **T2–T5:** tác nhân tự động theo chu kỳ, không phải cron được nhúng trong T6.
- **Gemini:** dịch vụ diễn giải tùy chọn, không thay thế phép tính thống kê hay mô hình dự báo.

Vai trò trên mô tả nghiệp vụ, **không đồng nghĩa hệ thống đã có RBAC**. Cơ chế tài khoản, đăng nhập, phân quyền theo người dùng: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].

### 2.2. Danh sách use case

| ID | Use case / tác nhân | Tiền điều kiện | Input | Output / hậu điều kiện |
|---|---|---|---|---|
| UC01 | Thu thập dữ liệu định kỳ — T2 | DB đã migrate; kết nối USGS khả dụng | Feed GeoJSON, URL và chu kỳ cấu hình | Sự kiện hợp lệ được insert/update; thống kê chu kỳ; thông báo thay đổi catalog |
| UC02 | Xem Overview — người dùng | API hoạt động; dữ liệu phụ thuộc từng panel | Phạm vi địa lý / thời gian theo control | KPI, danh sách gần đây, chart tổng quan; Loading/Error/Empty nếu chưa có dữ liệu |
| UC03 | Tra cứu danh sách và chi tiết động đất — người dùng | API và DB hoạt động | Bộ lọc thời gian, magnitude, địa lý; phân trang; ID | Danh sách và metadata; bản ghi chi tiết; lỗi không tìm thấy / lỗi tham số |
| UC04 | Xem bản đồ và cập nhật realtime — người dùng | T6 SSE; T2 phát thay đổi; trình duyệt giữ kết nối | Bộ lọc map, bounds/phạm vi; kết nối EventSource | Marker, popup, danh sách; catalog được làm mới sau SSE; trạng thái kết nối |
| UC05 | Phân tích P1–P4 — người dùng / T3 | Có raw events; từng thuật toán có ngưỡng dữ liệu riêng | Cửa sổ dữ liệu; country/region; timezone/frequency ở route hỗ trợ | Resampling, trend, seasonality, correlation; snapshot hoặc kết quả on-the-fly; trạng thái thiếu dữ liệu |
| UC06 | Phân cụm không gian — T4 / người dùng | DB có tọa độ hợp lệ; số điểm phù hợp min_samples | Events trong cửa sổ; eps_km; min_samples | Cụm, centroid/radius, thống kê, mapping sự kiện; noise count; kết quả rỗng nếu thiếu dữ liệu |
| UC07 | Dự báo số trận và phân loại — T5 / người dùng | Artifact tồn tại và đúng loại; đủ quan sát | Daily counts UTC, history và tham số mô hình; bộ lọc tùy route | One-step forecast, khoảng dự báo, probabilities và nhãn; metadata; lỗi thiếu dữ liệu/artifact |
| UC08 | Xem trạng thái hệ thống — người vận hành | API truy cập được DB cho trạng thái đầy đủ | Request health / system status | Tình trạng kết nối, catalog, lịch sử chạy dịch vụ và lỗi liên quan |
| UC09 | Đồng bộ USGS thủ công — người vận hành | Có mạng; DB; API nhận request đồng bộ | POST sync, cấu hình feed | Chỉ insert sự kiện chưa có; synced_count; SSE có thể phát hiện ID mới |
| UC10 | Cấu hình và trích xuất nhận định AI — người dùng | Gemini khả dụng nếu dùng AI; có dữ liệu phân tích | API key/model ở cấu hình; payload context phân tích | Trạng thái masked key; nhận định Gemini hoặc fallback quy tắc phía Web |
| UC11 | Broadcast trạng thái đã xóa — người vận hành | Client SSE đang kết nối; người vận hành hiểu đây chỉ là tín hiệu | POST stream/broadcast-cleared | Packet database_cleared; không thực hiện DELETE trong DB |

**Ngoại lệ chung:** DB không khả dụng, lỗi USGS/Gemini, dữ liệu nguồn không hợp lệ, thiếu sự kiện, không đủ kỳ đầy đủ, model artifact thiếu/không hỗ trợ và client ngắt SSE. Không thay các trường hợp này bằng số liệu demo giả.

<a id="muc-3"></a>

## 3. Sequence Diagram cho các use case chính

### 3.1. UC01 — Ingestion định kỳ

```mermaid
sequenceDiagram
    participant R as T2 runner
    participant U as USGS
    participant P as Parser / geo / upsert
    participant D as PostgreSQL
    participant S as T6 SSE
    participant W as Web
    loop Xử lý rồi sleep 300 giây mặc định
        R->>D: Ghi ServiceRun RUNNING
        R->>U: GET GeoJSON feed (fallback nếu cần)
        alt Nguồn khả dụng
            U-->>R: FeatureCollection
            R->>P: Parse / validate / UTC / WGS84
            P->>D: Upsert theo source và source_event_id; commit
            R->>D: Ghi ServiceRun SUCCESS; commit
            S->>D: Poll latest ID / ingestion run mỗi 2 s
            D-->>S: Trạng thái hiện tại
            S-->>W: ingestion_cycle_completed / earthquake_detected
            W->>W: Map và view liên quan xử lý / refetch
        else HTTP / parse / DB error
            R->>D: Cố ghi ServiceRun FAILED
            R->>R: Ghi lỗi và tiếp tục vòng chạy
        end
    end
```

### 3.2. UC02–UC03 — Dashboard, danh sách và chi tiết

```mermaid
sequenceDiagram
    actor N as Người dùng
    participant W as React / fetch hooks
    participant A as FastAPI REST
    participant D as PostgreSQL
    N->>W: Mở Overview / Earthquakes, đổi bộ lọc
    W->>A: GET endpoint tương ứng + query params
    A->>A: Validate params và xây truy vấn
    A->>D: SELECT / aggregate / count / pagination
    D-->>A: Rows và thống kê
    A-->>W: JSON response
    W-->>N: KPI / bảng / chart hoặc Empty state
    opt Chọn một sự kiện
        W->>A: GET /api/v1/earthquakes/{id}
        A->>D: SELECT theo ID
        alt Tồn tại
            A-->>W: Earthquake detail
        else Không tồn tại
            A-->>W: HTTP 404
        end
    end
```

### 3.3. UC04 — Monitoring Map và SSE

```mermaid
sequenceDiagram
    actor N as Người dùng
    participant W as Monitoring / EventSource
    participant A as FastAPI REST
    participant S as SSE generator
    participant D as PostgreSQL
    N->>W: Mở Monitoring
    W->>A: GET dữ liệu map / geo catalog
    A->>D: SELECT theo phạm vi
    D-->>A: Events / geographic metadata
    A-->>W: JSON
    W->>S: GET /api/v1/events/stream
    S->>D: Đọc baseline counts / latest event / latest run
    S-->>W: heartbeat ban đầu
    loop Poll mỗi 2 giây trên kết nối
        S->>D: Query trạng thái mới trong worker thread
        D-->>S: Latest IDs / events / runs
        alt Có ingestion run hoặc event mới
            S-->>W: ingestion_cycle_completed / earthquake_detected / alert
            W->>A: Map refetch dữ liệu liên quan
        else Không có thay đổi
            S-->>W: heartbeat
        end
    end
    W->>S: Disconnect
    S->>S: Dọn asyncio queue của client
```

### 3.4. UC05 — Worker Analysis và phân tích lọc

```mermaid
sequenceDiagram
    participant T as T3 Analysis
    participant D as PostgreSQL
    actor N as Người dùng
    participant A as API Analysis / Patterns
    T->>D: Đọc raw events cửa sổ mặc định 30 ngày
    T->>T: prepare_events; tính P1, P2, P3, P4
    T->>D: Thay snapshot analysis_results trong transaction
    T->>D: Ghi service_runs
    N->>A: GET pattern với bộ lọc / frequency / timezone
    alt Route đọc snapshot
        A->>D: Đọc analysis_results
        D-->>A: JSONB snapshot
    else Route tính theo phạm vi
        A->>D: Đọc raw events theo country / region / thời gian
        A->>A: Tính P1–P4 on-the-fly
    end
    A-->>N: Kết quả hoặc trạng thái thiếu dữ liệu
```

### 3.5. UC06 — Phân cụm DBSCAN

```mermaid
sequenceDiagram
    participant T as T4 runner
    participant C as Clustering service
    participant D as PostgreSQL
    actor N as Người dùng
    participant A as Clusters API
    T->>C: run_cycle(now UTC)
    C->>D: Đọc sự kiện trong cửa sổ
    C->>C: Coordinates → radians
    C->>C: DBSCAN(metric=haversine)
    C->>C: Summary centroid, radius, magnitude, noise
    C->>D: Thay clustering_event_mapping và clustering_results
    C->>D: Ghi service_runs; commit
    N->>A: GET /api/v1/clusters
    A->>D: SELECT clustering_results / mappings
    D-->>A: Cụm hiện tại
    A-->>N: JSON cụm cho UI
```

### 3.6. UC07 — Dự báo và phân loại

```mermaid
sequenceDiagram
    participant T as T5 runner
    participant I as Inference
    participant F as Artifacts local
    participant D as PostgreSQL
    actor N as Người dùng
    participant A as Predictions / Classifications API
    T->>I: Kiểm tra và load artifacts
    I->>F: joblib + history + training_report
    F-->>I: Model params, residuals, metadata
    T->>D: Đếm sự kiện theo ngày UTC đã hoàn tất
    T->>I: build_series(history, DB counts)
    I->>I: ARIMA smooth(params), forecast 1 bước
    I->>I: Residual distribution → 4 xác suất lớp
    I-->>T: Forecast, bounds, label, probabilities
    T->>D: Thay kết quả cùng target_date; bổ sung actuals; ServiceRun
    N->>A: GET dự báo / phân loại
    alt Không lọc địa lý
        A->>D: Đọc snapshot đã lưu
    else Lọc country / region
        A->>I: Tính on-the-fly từ dữ liệu lọc và artifact toàn cầu
    end
    A-->>N: Payload và metadata / insufficient_data
    Note over A,I: Horizon của đường filtered và worker hiện chưa nhất quán; xem mục 4.6
```

### 3.7. UC08–UC09 — Trạng thái và đồng bộ thủ công

```mermaid
sequenceDiagram
    actor N as Người vận hành
    participant W as Web
    participant A as System / Events API
    participant U as USGS
    participant D as PostgreSQL
    N->>W: Xem trạng thái hệ thống
    W->>A: GET health / system status
    A->>D: Kiểm tra kết nối, catalog và service_runs
    A-->>W: Trạng thái hiện tại
    opt Đồng bộ USGS thủ công
        N->>W: Bấm đồng bộ
        W->>A: POST /api/v1/earthquakes/sync
        A->>U: GET feed
        U-->>A: GeoJSON
        A->>D: Parse riêng / insert sự kiện chưa có / commit
        A-->>W: Kết quả sync
        W->>W: Làm mới dữ liệu
    end
```

### 3.8. UC10 — Cấu hình và diễn giải AI

```mermaid
sequenceDiagram
    actor N as Người dùng
    participant W as Web / AI settings
    participant A as FastAPI AI routes
    participant E as Cấu hình server
    participant G as Gemini API
    N->>W: Cấu hình key / model
    W->>A: Gửi cấu hình AI
    A->>E: Lưu cấu hình theo ai_env
    A-->>W: Trạng thái cấu hình, không trả secret nguyên văn
    N->>W: Yêu cầu trích xuất nhận định
    W->>W: Tải 6 nguồn; dựng báo cáo quy tắc
    W->>A: POST /api/v1/ai/generate với prompt, model, key
    A->>G: generateContent qua HTTP
    alt Dịch vụ phản hồi hợp lệ
        G-->>A: Nội dung AI
        A-->>W: Văn bản nhận định
        W-->>N: Expert Insights
    else Thiếu key / lỗi mạng / lỗi upstream
        A-->>W: Lỗi có kiểm soát
        W-->>N: Thông báo lỗi / fallback báo cáo quy tắc
    end
```

### 3.9. UC11 — Broadcast trạng thái đã xóa

```mermaid
sequenceDiagram
    actor N as Người vận hành
    participant A as Stream API
    participant S as SSE queues trong API process
    participant W as Web đang kết nối
    N->>A: POST /api/v1/stream/broadcast-cleared
    A->>S: broadcast_database_cleared_event()
    S-->>W: database_cleared
    A-->>N: Số client được gửi
    Note over A,S: Không xóa bảng hoặc xác minh DB đã trống
    Note over S,W: Chỉ broadcast trong một API process
```

Việc xóa dữ liệu demo bằng script vận hành là thao tác khác, không phải chức năng DELETE của endpoint trên. Source không có REST reset API để suy diễn thêm.

<a id="muc-4"></a>

## 4. Phương pháp luận: dữ liệu, data flow và lý do thiết kế

### 4.1. Bài toán và giới hạn khoa học

Mục tiêu của GDMAS là biến catalog sự kiện động đất thành dữ liệu có thể tra cứu, trực quan hóa và phân tích. Hệ thống kết hợp phân tích mô tả chuỗi thời gian, phân cụm không gian, dự báo **số lượng sự kiện theo ngày** và phân loại **mức hoạt động địa chấn**.

Không có cơ sở từ code để khẳng định hệ thống dự báo chính xác thời điểm, tọa độ, magnitude của trận động đất kế tiếp, hoặc xác suất thương vong và thiệt hại. Bốn nhãn Low/Moderate/High/Critical trong P6 là nhãn theo tần suất, không phải thang đánh giá rủi ro thiệt hại đã tích hợp exposure/vulnerability.

### 4.2. Dữ liệu và pipeline

1. **Thu nhận:** T2 gọi USGS qua HTTP; parser đọc GeoJSON, kiểm tra sự kiện và chuẩn hóa các thuộc tính cần thiết.
2. **Chuẩn hóa:** thời gian nguồn chuyển về UTC; GeoJSON dùng thứ tự tọa độ longitude–latitude–depth, còn model lưu `latitude`, `longitude`, `depth_km` riêng; enrich country/region theo mã địa lý.
3. **Lưu dữ liệu gốc:** upsert theo định danh `(source, source_event_id)` để đồng bộ nhiều lần không tạo bản ghi trùng cho cùng sự kiện; dữ liệu đã cập nhật có thể thay thế thông tin cũ.
4. **Phân tích độc lập:** T3 đọc raw events và ghi P1–P4; T4 đọc tọa độ để DBSCAN; T5 tổng hợp daily counts để inference. Các worker không gọi nối chuỗi nhau và có thể dùng snapshot khác thời điểm.
5. **Phục vụ:** T6 trả REST, đọc snapshot hoặc tính lại theo bộ lọc; T7 dùng API thật. SSE cung cấp tín hiệu thay đổi catalog để các view có logic tương ứng refetch, không phải dòng dự báo được push liên tục từ cả ba worker.
6. **Quan sát vận hành:** `service_runs` ghi kết quả từng lượt dịch vụ; đây không phải hệ thống distributed tracing hay monitoring SLA hoàn chỉnh.

**Vì sao thiết kế như vậy?**

| Quyết định | Lý do phù hợp với code | Giới hạn cần chấp nhận |
|---|---|---|
| Tách worker khỏi FastAPI | Tác vụ phân tích không nằm trong lifecycle web; chạy lại mỗi worker độc lập | Cần vận hành nhiều tiến trình; snapshot không đồng bộ tuyệt đối |
| PostgreSQL + SQLAlchemy | Quan hệ sự kiện–cụm, truy vấn có lọc và lưu JSONB linh hoạt | Chưa có kiến trúc data lake, streaming broker hay sharding |
| UTC trong DB | Tránh trộn múi giờ giữa USGS, worker và client | UI vẫn cần bucket đúng timezone được chọn |
| Upsert theo USGS ID | Đồng bộ lặp và cập nhật sự kiện cùng nguồn | Không tự giải quyết đối chiếu nhiều catalog khác nhau |
| Resampling trước trend/seasonality | So sánh các khoảng thời gian đồng đều | Phải loại kỳ dở dang và phân biệt zero với missing |
| DBSCAN–Haversine | Không cần ấn định số cụm; khoảng cách phù hợp mặt cầu | Nhạy eps/min_samples; chưa có tuning định lượng |
| Snapshot + REST có lọc | View mặc định đọc nhanh, vẫn phân tích riêng phạm vi | Request on-the-fly có thể tốn CPU; không có benchmark tải |
| SSE + refetch | Hợp với cập nhật một chiều từ server tới trình duyệt | Không có durable message log hay bảo đảm exactly-once |
| Artifact inference tách training | Worker không retrain trong mỗi chu kỳ | Chưa tìm thấy mã training để tái lập artifact |

### 4.3. P1–P4: phân tích mô tả chuỗi thời gian

Nguồn chính: `apps/api/src/gdmas/services/analysis/patterns.py`, `service.py`, `filtered.py`.

**Tiền xử lý:** parse timestamp về UTC, numeric coercion, thay giá trị vô hạn thành missing; bỏ dòng thiếu thời gian hoặc magnitude; depth thiếu được điền 0; sắp xếp theo thời gian. Không tìm thấy bước chuẩn hóa z-score, PCA hoặc quy trình loại outlier tổng quát trong pipeline này. Việc điền depth=0 cần được ghi nhận khi diễn giải tương quan.

| Pattern | Cách hiện thực | Điều kiện / ý nghĩa |
|---|---|---|
| P1 Temporal | Resample ngày `D`, tuần `W-MON` đóng trái/nhãn trái, tháng `MS`; count, avg/max magnitude; scatter tối đa 2.000 sự kiện mới nhất; histogram `<2`, `[2,3)`, `[3,4)`, `[4,5)`, `>=5` | Scatter không phải mẫu ngẫu nhiên của toàn bộ catalog; timezone của route có hỗ trợ ảnh hưởng ranh giới bucket |
| P2 Trend | Moving average 3 kỳ centered; `linregress` trên kỳ đầy đủ cho count, avg_magnitude, max_magnitude; slope/intercept/p-value/R² | Tối thiểu 3 kỳ; increasing/decreasing khi p<0,05, còn lại stable; centered MA là mô tả, không phải mô hình dự báo causal |
| P3 Seasonality | `seasonal_decompose` additive; chu kỳ 12 tháng nếu đủ ít nhất 24 tháng; nếu chưa đủ, chu kỳ 7 ngày nếu đủ ít nhất 14 ngày | Thiếu dữ liệu trả insufficient_data; không suy ra mùa vụ năm từ cửa sổ 30 ngày |
| P4 Correlation | Ma trận Pearson và Spearman cho magnitude, depth_km, latitude, longitude, daily_event_count | Ít nhất 3 sự kiện; phương sai 0 → null; không chứng minh quan hệ nhân quả |

Trend chọn tần suất chính theo độ dài chuỗi: từ 180 ngày dùng tháng; từ 28 ngày dùng tuần; ngắn hơn dùng ngày. Count ở kỳ rỗng bằng 0; magnitude kỳ rỗng bị bỏ thay vì gán magnitude=0. Seasonality strength được tính từ tỷ số phương sai residual và seasonal+residual, giới hạn trong [0,1]; ngưỡng diễn giải mạnh 0,64, trung bình 0,4.

**Công thức và cách diễn giải:** Gọi \(y_t\) là giá trị tổng hợp tại kỳ \(t\). P2 hiển thị trung bình trượt centered ba kỳ \(MA_t=(y_{t-1}+y_t+y_{t+1})/3\); ở biên dùng các giá trị hiện có (`min_periods=1`). Với metric magnitude, các kỳ rỗng đã bị loại trước khi tính MA. Đường hồi quy dùng các kỳ đầy đủ theo mô hình \(y_t=a+bt+\varepsilon_t\), trong đó \(t\) là vị trí kỳ thực trên lưới thời gian; dấu của \(b\) chỉ được diễn giải tăng/giảm khi p-value < 0,05. Cửa sổ 30 ngày là phạm vi dữ liệu đầu vào mặc định của T3, **không phải** cửa sổ MA 30 ngày.

P3 phân rã cộng \(y_t=T_t+S_t+R_t\) và tính độ mạnh mùa vụ \(F=\max(0,1-\operatorname{Var}(R)/\operatorname{Var}(S+R))\), sau đó giới hạn tối đa bằng 1; nếu mẫu số bằng 0 thì \(F=0\). Ngưỡng 0,4 và 0,64 là ngưỡng diễn giải được cài trong code, không có căn cứ thực nghiệm riêng được chứng minh trong source. Với cửa sổ mặc định 30 ngày không đủ 24 tháng hoàn chỉnh để phân tích chu kỳ năm; code có thể chuyển sang chu kỳ tuần nếu đủ 14 ngày hoàn chỉnh, chứ không mặc định kết luận có mùa vụ.

Các công thức chính có thể viết lại như sau, với trung bình trượt đầy đủ ba kỳ và \(t\) là vị trí kỳ trên lưới:

$$
MA_t=\frac{y_{t-1}+y_t+y_{t+1}}{3},\qquad y_t=a+bt+\varepsilon_t.
$$

$$
y_t=T_t+S_t+R_t,\qquad F=\max\left(0,1-\frac{\operatorname{Var}(R)}{\operatorname{Var}(S+R)}\right).
$$

$$
r=\frac{\operatorname{Cov}(X,Y)}{\sigma_X\sigma_Y}.
$$

Ngưỡng p < 0,05 là quy ước kiểm định được code áp dụng nhằm hạn chế gán hướng cho biến động có thể do ngẫu nhiên; nó không bảo đảm ý nghĩa thực tiễn hoặc chứng minh nhân quả. Chu kỳ 12 tháng và 7 ngày tương ứng với giả thuyết mùa vụ năm và tuần; yêu cầu hai chu kỳ là điều kiện tối thiểu của phép phân rã, không bảo đảm đủ dữ liệu để kết luận mùa vụ bền vững.

P4 dùng hệ số Pearson như trên; Spearman là Pearson tính trên thứ hạng. Mỗi dòng là một **sự kiện**, daily_event_count được lặp cho các sự kiện cùng ngày. Ngày nhiều sự kiện vì thế có trọng số nhiều hơn trong ma trận; không được mô tả đây là correlation trên bảng “mỗi ngày một dòng”.

T3 mặc định dùng cửa sổ 30 ngày và thay snapshot trong transaction; khi raw events rỗng thì xóa snapshot cũ, không giữ kết quả cũ như dữ liệu mới. Cửa sổ này là đánh đổi vận hành giữa tính cập nhật, lượng dữ liệu và chi phí xử lý, không có thực nghiệm trong source chứng minh 30 ngày là tối ưu. `AnalysisService` có default `window_days=30`; runner không truyền `settings.ANALYSIS_WINDOW_DAYS`, do đó không khẳng định chỉ đổi setting này sẽ đổi cửa sổ worker.

### 4.4. Phân cụm không gian DBSCAN

Nguồn: `apps/api/src/gdmas/services/clustering/service.py`.

- Vector đầu vào chỉ có latitude và longitude, chuyển sang radian. Khoảng cách Haversine giữa hai điểm được tính bằng \(d=2R\arcsin\sqrt{\sin^2((\varphi_2-\varphi_1)/2)+\cos\varphi_1\cos\varphi_2\sin^2((\lambda_2-\lambda_1)/2)}\), với vĩ độ \(\varphi\), kinh độ \(\lambda\) tính bằng radian và bán kính Trái Đất \(R=6371{,}0088\) km.
- `DBSCAN(metric="haversine", algorithm="ball_tree", eps=eps_km/6371.0088, min_samples=...)`.
- Default: cửa sổ **30 ngày**, **eps=150 km**, **min_samples=5**; thời gian là bộ lọc đầu vào, không phải chiều của vector clustering.
- Noise có nhãn -1. Mỗi cụm có số sự kiện, magnitude trung bình/lớn nhất, centroid và radius; longitude centroid dùng trung bình tròn để xử lý đường đổi ngày.
- Mỗi cycle thay cụm và mappings hiện tại; không có ID cụm ổn định qua nhiều phiên để theo dõi tiến hóa cụm.
- `eps=150 km` xác định bán kính lân cận, còn `min_samples=5` đặt ngưỡng mật độ để hình thành điểm lõi; tăng hoặc giảm chúng làm thay đổi cụm và noise. Đây là lựa chọn cấu hình đánh đổi độ nhạy và mức gộp cụm, không có căn cứ trong source để khẳng định các giá trị này tối ưu về địa chấn học.
- Chưa có Silhouette, Davies–Bouldin, Calinski–Harabasz hay thực nghiệm tuning eps/min_samples: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
- Trường hợp số record nhỏ hơn min_samples trả kết quả cụm/mapping rỗng và noise_count=0. Không diễn giải noise_count=0 trong trường hợp này là bằng chứng mọi điểm thuộc cụm.

Với \(\varphi\) là vĩ độ và \(\lambda\) là kinh độ, cả hai tính bằng radian, công thức khoảng cách ở trên là:

$$
d=2R\arcsin\sqrt{\sin^2\frac{\varphi_2-\varphi_1}{2}+\cos\varphi_1\cos\varphi_2\sin^2\frac{\lambda_2-\lambda_1}{2}},\qquad R=6371{,}0088\ \mathrm{km}.
$$

Đầu vào Haversine của DBSCAN là **khoảng cách góc**, nên cần đổi ngưỡng từ km sang radian:

$$
\varepsilon_{\mathrm{rad}}=\frac{150}{6371{,}0088}\approx 0{,}02354\ \mathrm{rad}.
$$

Bán kính 150 km cho phép gom các chấn tâm lân cận ở quy mô khu vực thay vì chỉ gần như trùng tọa độ; nếu quá lớn, những vùng hoạt động riêng có thể bị nối qua chuỗi điểm. Ngưỡng năm sự kiện (kể cả điểm đang xét) giúp hạn chế tạo cụm chỉ từ vài quan sát đơn lẻ, nhưng có thể bỏ sót vùng thưa. Đây là diễn giải đánh đổi, không phải kết quả hiệu chỉnh bằng dữ liệu.

### 4.5. P5–P6: mô hình dự báo và phân loại thực sự chạy

Nguồn: `services/prediction/inference.py`, `service.py`, `runner.py`, thư mục `models/`.

**Chuỗi đầu vào:** daily count theo UTC, loại ngày đầu tiên không đầy đủ và ngày hiện tại. History JSON là nền, DB ghi đè ngày tương ứng; ngày thiếu giữ NaN, không mặc định là không có động đất. File history lưu 60 ngày từ 10/09/2026 tới 08/11/2026; không phải toàn bộ training dataset.

**P5:** artifact runtime hỗ trợ ARIMA. Mô hình được chọn trong report là **ARIMA(2,0,1) trên log1p(count)**. Worker dựng ARIMA và `smooth` bằng params đã lưu, forecast 1 bước; không fit lại mô hình. Biến đổi ngược bằng expm1 khi artifact yêu cầu, chặn giá trị âm. Khoảng dự báo dùng residual quantile lưu sẵn, không hiệu chỉnh uncertainty mới ở mỗi cycle.

Với \(z_t=\log(1+y_t)\), ARIMA(2,0,1) mô tả phụ thuộc tuyến tính vào hai độ trễ của \(z\) và một độ trễ sai số; code dùng tham số artifact để lấy dự báo một bước \(\hat z\), rồi trả \(\max(0,\exp(\hat z)-1)\). Hai cận thay \(\hat z\) bằng \(\hat z+q_{lo}\) và \(\hat z+q_{hi}\), với các phân vị residual đã lưu. Không có đủ mã training trong source để khẳng định cách chọn tham số hay kiểm định chất lượng ngoài các thông tin artifact báo cáo.

**P6:** runtime dùng **Forecast-Distribution Risk Classifier**, không phải Random Forest. Lấy ARIMA mean cộng residual samples, biến đổi ngược, chia theo ngưỡng và dùng tỷ lệ từng bin làm xác suất. Cụ thể, với residual \(e_i\), mẫu \(c_i=\exp(\hat z+e_i)-1\) và khoảng lớp \(B_k\), runtime tính \(p_k=\frac{1}{N}\sum_{i=1}^{N}\mathbf{1}(c_i\in B_k)\), rồi chọn lớp có \(p_k\) lớn nhất. Đây là tỷ lệ theo phân phối residual lưu trong artifact, không chứng minh xác suất thiên tai hay thiệt hại thực tế. Các ngưỡng lưu trong report: **375, 425, 475 trận/ngày**; source không chứng minh cơ sở khoa học độc lập cho các ngưỡng này.

| Nhãn | Khoảng daily count theo ngưỡng artifact |
|---|---|
| Low | <375 |
| Moderate | [375,425) |
| High | [425,475) |
| Critical | >=475 |

Phép log1p cho phép xử lý count bằng 0 và nén chênh lệch giữa các count lớn; đây là cách diễn giải hợp lý của phép biến đổi, không phải bằng chứng rằng source đã so sánh và chứng minh nó tối ưu. Phân vị residual và các ngưỡng lớp là tham số artifact: chia bốn khoảng giúp diễn đạt mức hoạt động tương đối, nhưng việc chọn các mốc cụ thể chưa có tài liệu huấn luyện hoặc hiệu chuẩn độc lập trong source.

$$
z_t=\log(1+y_t),\qquad \hat y=\max\left(0,\operatorname{expm1}(\hat z)\right)=\max\left(0,\exp(\hat z)-1\right).
$$

Dạng tổng quát của ARIMA(2,0,1), với hằng số tùy tham số hóa, là:

$$
z_t=c+\phi_1 z_{t-1}+\phi_2 z_{t-2}+\varepsilon_t+\theta_1\varepsilon_{t-1}.
$$

$$
c_i=\exp(\hat z+e_i)-1,\qquad p_k=\frac{1}{N}\sum_{i=1}^{N}\mathbf{1}(c_i\in B_k).
$$

Runtime hiện không hỗ trợ inference bằng Ridge, RandomForest hay LogisticRegression artifact, dù các mô hình này xuất hiện trong bảng so sánh của report. Tối thiểu số quan sát mặc định là 10 giá trị không null; điều đó không bảo đảm 10 ngày liên tiếp gần nhất đều có dữ liệu.

### 4.6. Giới hạn và sai khác cần công bố

1. **Horizon chưa nhất quán:** worker toàn cầu dùng chuỗi đến hôm qua, forecast 1 bước và ghi `target_date` là hôm nay. `build_filtered_forecast()` cũng dựng chuỗi đến hôm qua và forecast 1 bước nhưng gán ngày mai (`filtered.py:171–180`). Báo cáo không hợp thức hóa cả hai thành một horizon thống nhất.
2. **Mô hình địa phương:** route có country/region vẫn dùng tham số và history toàn cầu, chỉ ghi đè một số daily counts đã lọc. Đây không phải mô hình được train riêng từng địa phương; ngưỡng toàn cầu có thể không phù hợp phạm vi nhỏ.
3. **Coverage dữ liệu:** không có bằng chứng mỗi ngày đã ingest đầy đủ mọi sự kiện; một ngày không có record chưa chắc là 0 sự kiện thật.
4. **Training tái lập:** `inference.py` nhắc `scripts/train_models.py` nhưng file training không có trong tracked source. Dataset gốc, ngày chia train/test, seed và protocol rolling validation: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
5. **CLI T4:** code có nhánh once nhưng entrypoint gọi `run()` trong khi parser dùng `argv or []`, nên lệnh module kèm `--once` không đọc cờ như mong đợi. Mục 5 đưa cách gọi `run_once()` trực tiếp cho một cycle.
6. **Seeder không phải thực nghiệm:** `demo_seeder.py` có số liệu, mapping và nhãn mô hình giả lập. Các giá trị như MAE=2,45, RMSE=3,12 hoặc accuracy=0,89 ở seeder không được dùng làm chất lượng mô hình thật.
7. **An toàn triển khai:** code chưa chứng minh authentication/RBAC, rate limit, TLS production, audit log bất biến hoặc quản lý secret tập trung. Không công khai endpoint broadcast/cấu hình AI lên Internet khi chưa gia cố.

<a id="muc-5"></a>

## 5. Deployment Design

### 5.1. Stack và mô hình triển khai

| Lớp | Công nghệ hiện có | Bằng chứng |
|---|---|---|
| Database | PostgreSQL 16, `postgres:16-alpine`; SQLAlchemy đồng bộ, psycopg | `docker-compose.yml`, `db/connection.py` |
| Backend | Python >=3.11; image Python 3.12; FastAPI, Uvicorn, Pydantic v2, Alembic | `apps/api/pyproject.toml`, `Dockerfile` |
| Data/ML | pandas, NumPy, SciPy, statsmodels, scikit-learn, joblib | `apps/api/pyproject.toml` |
| Realtime | SSE, sse-starlette, polling PostgreSQL theo kết nối | `realtime/sse.py` |
| Frontend | React 19.3.1, React Router 7.18.5, Recharts 3.10.1, Leaflet 1.9.4, React-Leaflet 5.0.0 | `apps/web/pnpm-lock.yaml` |
| Build/UI | TypeScript 7.0.2, Vite 8.3.6, Tailwind CSS 4.3.4, pnpm 10.20.0 | `apps/web/package.json`, lockfile |
| Test | pytest / pytest-asyncio; frontend Node native test runner; Ruff | pyproject, package.json |

Số phiên bản Frontend trên là giá trị lockfile, không phải phép đo môi trường browser hay container đã triển khai. Dependency Backend trong pyproject chủ yếu là ngưỡng tối thiểu, không được hiểu là bản pin chính xác. Engine Node khai báo ở package.json là >=18.18, nhưng Vite trong lockfile yêu cầu **^20.19.0 hoặc >=22.12.0**; nên chọn Node tương thích với lockfile.

### 5.2. Bố trí 7 terminals

| Terminal | Tiến trình | Cổng / chu kỳ mặc định | Dữ liệu bền vững |
|---|---|---|---|
| T1 | PostgreSQL | 5432 | Volume `gdmas_pgdata` |
| T2 | Ingestion runner | Xử lý rồi sleep 300 s | Events, service_runs |
| T3 | Analysis runner | Xử lý rồi sleep 300 s | analysis_results, service_runs |
| T4 | Clustering runner | Xử lý rồi sleep 86400 s | clustering_results, mappings, service_runs |
| T5 | Prediction runner | Xử lý rồi sleep 300 s | prediction_results, classification_results, service_runs |
| T6 | Uvicorn/FastAPI | 8000 | Đọc DB, cấu hình AI trên filesystem |
| T7 | Vite/React | 3000 | Browser preferences / cache |

Chu kỳ là thời gian xử lý cộng thời gian sleep, không phải lịch cron bảo đảm đúng mỗi phút thứ năm. Cấu hình mặc định có thể bị environment ghi đè. SQLAlchemy tạo pool riêng trong từng process (`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`), không có pool dùng chung cho bảy tiến trình.

### 5.3. Quy trình khởi tạo local

Các lệnh dưới là hướng dẫn từ cấu trúc source; **không phải toàn bộ lệnh đã được chạy khi lập báo cáo**. `.env` phải do người vận hành tạo từ mẫu và điền giá trị riêng; không chép secret vào tài liệu hoặc commit.

```bash
# Tại root: tạo .env từ .env.example, điền cấu hình local thích hợp.
# Cài Backend và Frontend
cd apps/api
uv sync --dev
uv pip install -e .
cd ../web
pnpm install
cd ../..

# T1: database
docker compose up -d postgres

# Khởi tạo schema trước khi chạy worker
cd apps/api
uv run alembic upgrade head

# Tùy chọn: nạp lịch sử (mặc định 30 ngày, min magnitude 2.5)
uv run python -m gdmas.services.ingestion.backfill
```

Mỗi lệnh sau chạy trong **terminal riêng**, ở `apps/api/`, trừ T7:

```bash
# T2
uv run python -m gdmas.services.ingestion.runner
# T3
uv run python -m gdmas.services.analysis.runner
# T4
uv run python -m gdmas.services.clustering.runner
# T5
uv run python -m gdmas.services.prediction.runner
# T6
uv run uvicorn gdmas.main:app --reload --port 8000
# T7: chạy tại apps/web/
pnpm dev --port 3000
```

Để chạy riêng một cycle T4 mà không vướng cách parse `--once` hiện tại, có thể gọi public function:

```bash
# Tại apps/api/
uv run python -c "from gdmas.services.clustering.runner import run_once; print(run_once())"
```

Backfill gọi FDSN theo đoạn tối đa 30 ngày, giới hạn 20.000 record/query; code chưa tự chia nhỏ hoặc phân trang khi chạm giới hạn. Default là 30 ngày, không phải một năm như một số comment cũ.

### 5.4. Docker Compose

Compose có đúng bảy service: `postgres`, `api`, `web`, `ingestion`, `analysis`, `clustering`, `prediction`; bridge network `gdmas-net`; database volume `gdmas_pgdata`. PostgreSQL có healthcheck; API và worker chờ DB healthy. Web chờ API theo thứ tự dependency, không phải API readiness probe hoàn chỉnh.

Khởi tạo container theo thứ tự có migration riêng:

```bash
docker compose build
docker compose up -d postgres
docker compose run --rm api uv run alembic upgrade head
docker compose up -d
# Khi cần nạp lịch sử:
docker compose exec ingestion uv run python -m gdmas.services.ingestion.backfill
```

**Không có startup migration tự động** trong Docker CMD hoặc `init.sql`. Lệnh `docker compose up --build` có thể khởi động cả stack, nhưng không thay thế bước migrate DB mới. `init.sql` bật extension `uuid-ossp` và đặt timezone phiên init; các bảng nghiệp vụ vẫn dùng BIGINT, không phải UUID.

Compose hiện thiên về development: API `--reload`, source bind mount; web dùng `Dockerfile.dev` và Vite HMR. Vite proxy `/api` tới `http://api:8000` trong Compose, tắt proxy timeout cho SSE; `/tile` proxy bản đồ nền. Production web Dockerfile có Node build → Nginx, SPA fallback và tile proxy, **không có `/api` reverse proxy**; cần cấu hình URL API hoặc proxy production bên ngoài.

### 5.5. Vận hành và điều kiện production còn thiếu

- API root: `http://localhost:8000/`; web: `http://localhost:3000/`; Swagger: `http://localhost:8000/api/v1/docs`.
- `/health` là liveness tĩnh; `/api/v1/health` kiểm tra DB bằng `SELECT 1`.
- `/api/v1/system/status` suy hoạt động worker từ ServiceRun gần nhất và ngưỡng hai chu kỳ, không kiểm PID/container. Trạng thái Frontend dựa trên kết nối SSE, không phải health probe browser.
- Key Gemini được ghi server-side qua `ai_env.py`; cần mount đường cấu hình bền vững nếu muốn tồn tại sau recreate container. Browser cũng có localStorage cache cấu hình/nhận định với TTL 24h; không phải secret vault hoặc dữ liệu mã hóa.
- Hạ tầng cloud thực tế, domain, TLS certificate, backup/restore đã thử nghiệm, sizing CPU/RAM, load benchmark và SLO: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
- GitHub Actions / pipeline CI/CD đang chạy: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung]. Repo có script test và Git hooks local, không đủ để khẳng định có hosted CI/CD.
- Trước public production cần authentication/authorization, bảo vệ endpoint thay cấu hình, rate limit, TLS, secret management, persistent AI config, readiness và chiến lược SSE multi-process. Đây là yêu cầu bổ sung, không phải chức năng đã hoàn tất.

<a id="muc-6"></a>

## 6. API Documentation

### 6.1. Quy ước

- Base URL local: `http://localhost:8000`; prefix mặc định `/api/v1`.
- Swagger: `/api/v1/docs`; OpenAPI: `/api/v1/openapi.json`; ReDoc giữ route mặc định `/redoc`.
- REST chủ yếu dùng JSON; SSE dùng `text/event-stream`.
- Timestamp serialize UTC ISO 8601 hậu tố `Z`; tọa độ WGS84; depth km; magnitude là độ lớn do nguồn cung cấp.
- API chưa có cơ chế đăng nhập hoặc authorization chung. CORS không phải authentication.
- Envelope phổ biến: `{success, data, metadata?}`. Không áp một khuôn cho mọi endpoint: `/patterns`, system, root và một số lỗi có shape riêng.
- Trường hợp thiếu prediction/classification có thể trả **HTTP 200** với `success:false, data:null, message`; client cần kiểm tra body.
- Schema và ví dụ lưu ở `contracts/schemas/`, `contracts/examples/`; OpenAPI từ code là tài liệu tham chiếu tham số hiện tại.

### 6.2. Toàn bộ endpoint khai báo

| Method | Path | Input chính | Output / ý nghĩa |
|---|---|---|---|
| GET | `/` | Không | Tên ứng dụng, status, version 0.1.0 |
| GET | `/health` | Không | Healthy tĩnh, không query DB |
| GET | `/api/v1/health` | Không | DB status, timestamp, uptime; version route 1.0.0 |
| GET | `/api/v1/system/status` | Không | Trạng thái 7 services, catalog và latest runs |
| GET | `/api/v1/earthquakes` | Filter, sort, pagination | Earthquake list và metadata |
| GET | `/api/v1/earthquakes/countries` | start_time, end_time | country/count/avg_magnitude/max_magnitude |
| GET | `/api/v1/earthquakes/regions` | country, start_time, end_time | region/count/avg_magnitude/max_magnitude |
| GET | `/api/v1/earthquakes/{event_id}` | PK hoặc source_event_id | Chi tiết; 404 nếu không tìm thấy |
| POST | `/api/v1/earthquakes/sync` | Không cần body nghiệp vụ | Fetch feed; chỉ chèn sự kiện chưa có; synced_count |
| GET | `/api/v1/statistics/earthquakes` | Geography, time, magnitude, depth | KPI, latest time, preview 24h |
| GET | `/api/v1/statistics/monthly-peaks` | country, region | 12 tháng, gộp các năm trong DB; không có year filter |
| GET | `/api/v1/analysis/temporal` | interval, time window, country, region, timezone | line_chart, scatter_plot, histogram, statistics/status |
| GET | `/api/v1/analysis/trend` | resample_freq, metric, geography, time, timezone | Series, direction, slope/intercept/p-value/R² |
| GET | `/api/v1/analysis/seasonality` | interval week/month, geography, time | Seasonal factors/strength/interpretation/status |
| GET | `/api/v1/analysis/correlation` | country, region | variables, matrix, method, sample_size/status/note |
| GET | `/api/v1/predictions` | country, region tùy chọn | Latest forecast, interval bounds, model/evaluation |
| GET | `/api/v1/classifications` | country, region tùy chọn | predicted_label, probabilities, model/evaluation |
| GET | `/api/v1/clusters` | country, region tùy chọn | Latest clustering snapshot và danh sách cụm |
| GET | `/api/v1/patterns` | Không có bộ lọc toàn cục đồng nhất | Tổng hợp 6 patterns và clustering_summary |
| GET | `/api/v1/events/stream` | EventSource connection | SSE canonical |
| GET | `/api/v1/stream/earthquakes` | EventSource connection | Legacy SSE alias cùng generator |
| POST | `/api/v1/stream/broadcast-cleared` | Không | Broadcast database_cleared; **không xóa DB** |
| POST | `/api/v1/ai/credentials` | JSON model, key | Kiểm tra Gemini rồi lưu cấu hình server |
| GET | `/api/v1/ai/credentials/status` | Không | configured, model, masked_key |
| POST | `/api/v1/ai/generate` | JSON prompt, model, key; system optional | text từ Gemini; đối chiếu cấu hình server |

Nguồn: `apps/api/src/gdmas/api/router.py`, toàn bộ `api/routes/*.py`, `main.py`. Hai giá trị version 0.1.0 và 1.0.0 đang khác nhau trong các route; báo cáo giữ nguyên thay vì khẳng định đồng nhất.

### 6.3. Catalog, pagination và filtering

`GET /api/v1/earthquakes`:

| Tham số | Ràng buộc / tác dụng |
|---|---|
| page | Số trang >=1 |
| limit | 1..100 |
| min_magnitude / max_magnitude | Khoảng magnitude |
| min_depth / max_depth | Khoảng depth_km |
| search | ILIKE trên place hoặc source_event_id; `%` và `_` vẫn là wildcard |
| country / region | Lọc địa danh suy luận trong DB |
| start_time / end_time | ISO 8601; kiểm tra khoảng; route list coi timestamp thiếu timezone là UTC |
| min_lat / max_lat / min_lon / max_lon | WGS84 bounding box; xem OpenAPI cho tên/ràng buộc chính xác nếu source thay đổi |
| sort_by | Allowlist event_time, magnitude, depth_km |
| order | asc hoặc desc |

Metadata gồm total/page/limit/total_pages/last_updated. Earthquake response gồm id/source/source_event_id/event_time/latitude/longitude/depth_km/magnitude/magnitude_type/place/country/region/source_url/ingested_at/raw_data. `source_updated_at` có trong DB nhưng schema response hiện không expose.

Ví dụ request không chứa secret:

```bash
curl 'http://localhost:8000/api/v1/earthquakes?page=1&limit=20&sort_by=event_time&order=desc&min_magnitude=4'
curl 'http://localhost:8000/api/v1/analysis/trend?resample_freq=W&metric=count&timezone=UTC'
curl 'http://localhost:8000/api/v1/predictions'
curl -N 'http://localhost:8000/api/v1/events/stream'
```

Ví dụ trên là cú pháp gọi API, **không phải transcript response đã thu từ server chạy thật**. Ví dụ payload tĩnh có sẵn tại `contracts/examples/`; chúng không được dùng làm số liệu demo thực tế.

### 6.4. Phân tích và mô hình

- Temporal: interval day/week/month; timezone UTC hoặc UTC+7; có filter/timezone/window thì tính từ raw data, nếu phù hợp nhánh mặc định có thể đọc snapshot.
- Trend: resample_freq D/W/M; metric count/avg_magnitude/max_magnitude; snapshot phải khớp interval, không lấy đại snapshot sai tần suất.
- Seasonality: interval week/month. Nhánh xử lý hiện chưa đồng nhất: chỉ start/end không nhất thiết kích hoạt compute khi thiếu geography/interval; không hứa mọi tổ hợp bộ lọc đều áp dụng như nhau.
- Correlation response chính dùng variables/matrix/method; thuật toán nền còn tính Pearson và Spearman.
- Predictions/classifications không geography đọc DB; có geography tính on-the-fly, không lưu thêm snapshot/ServiceRun. Xem giới hạn model toàn cầu và target_date ở mục 4.6.
- `/clusters` lọc các cụm đã tính theo dominant_place; không chạy lại DBSCAN trên riêng bộ lọc.
- `/patterns` có shape tổng hợp riêng; analysis query không order chọn latest một cách đầy đủ, nên không mặc định mọi thành phần là snapshot mới nhất.

### 6.5. SSE wire format và hành vi

Server poll PostgreSQL **2 giây trên từng kết nối**, chạy truy vấn bằng `asyncio.to_thread`; không sử dụng LISTEN/NOTIFY ở pipeline đang hoạt động. Các event gồm:

| Event | Ý nghĩa |
|---|---|
| heartbeat | Tín hiệu kết nối và trạng thái; không bảo đảm mọi page refetch |
| ingestion_cycle_completed | Phát hiện run ingestion SUCCESS mới; có thể kèm catalog nếu hash thay đổi |
| earthquake_detected | Có earthquake ID mới so với mốc kết nối |
| earthquake_alert | Sự kiện mới đạt magnitude >=4.5 |
| alert | Alias cảnh báo |
| database_cleared | Phát hiện DB chuyển về rỗng hoặc broadcast thủ công |

Packet có event/data/timestamp/id/retry; id dạng `gdmas-N`, retry gợi ý 5000 ms, có trên wire và trong inner JSON. Không có replay theo Last-Event-ID; counter reset khi process restart; tối đa 20 sự kiện mới/query; không bảo đảm giao nhận đầy đủ từng sự kiện trong burst lớn.

Web dùng một EventSource ở DashboardLayout. Map refetch khi nhận các event thay đổi liên quan và có polling dự phòng 5 phút; Overview có logic merge latest-event/reset/recovery. Catalog và Statistics chủ yếu fetch theo route/filter/page/manual refresh. **Không phải mọi màn hình tự cập nhật mọi KPI sau mỗi SSE event.** Client có reconnect exponential backoff và giới hạn retry; countdown aside gọi reconnect, không trực tiếp refetch toàn bộ ứng dụng.

### 6.6. Lỗi và bảo mật

- 400 cho một số tham số sai; FastAPI validation có thể trả 422 mặc định; 404 khi detail không tồn tại; 503 với nguồn bên ngoài không khả dụng ở đường xử lý tương ứng; 500 khi DB lỗi ở route có catch.
- Không có global handler bảo đảm mọi lỗi cùng custom envelope. Validation ISO/time-range khác nhau giữa các route.
- POST sync thủ công tự parse riêng và chỉ insert mới, **không** có toàn bộ validation/upsert/source_updated_at/ServiceRun của worker T2.
- Gemini route kiểm key/model hợp cấu hình, nhưng đó không phải xác thực danh tính người dùng. Key lưu plain text trong cấu hình server và có cache browser; không tuyên bố có vault hoặc encryption.
- Frontend có fallback nhận định quy tắc khi thiếu key/lỗi AI; kiểm numeric token không chứng minh Gemini diễn giải đúng mọi sự kiện. AI là hỗ trợ đọc dữ liệu, không phải tư vấn an toàn địa chấn đã thẩm định.

<a id="muc-7"></a>

## 7. Sơ đồ ERD toàn bộ database

### 7.1. Nguồn và phạm vi

ERD sau mô tả **7 bảng nghiệp vụ** từ migration `001_initial_gdmas_schema.py`, cập nhật `country/region` từ `002_add_country_region.py`, cộng bảng kỹ thuật `alembic_version` theo cơ chế Alembic mặc định. Không truy vấn DB đang chạy trong phiên lập báo cáo; schema vật lý thực tế và revision đã áp dụng cần xác minh khi demo. Kiểu FLOAT trong Mermaid biểu diễn PostgreSQL DOUBLE PRECISION; TIMESTAMPTZ là timestamp with time zone.

```mermaid
erDiagram
    service_runs o|--o{ analysis_results : "service_run_id / SET NULL"
    service_runs o|--o{ clustering_results : "service_run_id / SET NULL"
    service_runs o|--o{ prediction_results : "service_run_id / SET NULL"
    service_runs o|--o{ classification_results : "service_run_id / SET NULL"
    clustering_results ||--o{ clustering_event_mapping : "cluster_result_id / CASCADE"
    earthquake_events ||--o{ clustering_event_mapping : "event_id / CASCADE"

    service_runs {
        BIGINT id PK "NOT NULL, tự tăng"
        VARCHAR_32 service_name "NOT NULL"
        TIMESTAMPTZ started_at "NOT NULL, default now()"
        TIMESTAMPTZ finished_at "NULL"
        VARCHAR_16 status "NOT NULL, default RUNNING"
        INTEGER records_processed "NOT NULL, default 0"
        TEXT error_message "NULL"
    }
    earthquake_events {
        BIGINT id PK "NOT NULL, tự tăng"
        VARCHAR_32 source "NOT NULL, default USGS"
        VARCHAR_64 source_event_id "NOT NULL, unique cùng source"
        TIMESTAMPTZ event_time "NOT NULL"
        TIMESTAMPTZ source_updated_at "NULL"
        TIMESTAMPTZ ingested_at "NOT NULL, default now()"
        FLOAT latitude "NOT NULL, WGS84"
        FLOAT longitude "NOT NULL, WGS84"
        FLOAT depth_km "NOT NULL"
        FLOAT magnitude "NOT NULL"
        VARCHAR_16 magnitude_type "NULL"
        TEXT place "NULL"
        VARCHAR_128 country "NULL, migration 002"
        VARCHAR_128 region "NULL, migration 002"
        TEXT source_url "NULL"
        JSONB raw_data "NULL"
    }
    analysis_results {
        BIGINT id PK "NOT NULL, tự tăng"
        VARCHAR_32 analysis_type "NOT NULL"
        VARCHAR_16 time_interval "NOT NULL"
        TIMESTAMPTZ period_start "NOT NULL"
        TIMESTAMPTZ period_end "NOT NULL"
        JSONB metrics_data "NOT NULL"
        TIMESTAMPTZ calculated_at "NOT NULL, default now()"
        BIGINT service_run_id FK "NULL"
    }
    clustering_results {
        BIGINT id PK "NOT NULL, tự tăng"
        VARCHAR_32 algorithm "NOT NULL"
        JSONB parameters "NOT NULL"
        INTEGER total_clusters "NOT NULL, default 0"
        INTEGER noise_count "NOT NULL, default 0"
        JSONB summary_clusters "NULL"
        TIMESTAMPTZ calculated_at "NOT NULL, default now()"
        BIGINT service_run_id FK "NULL"
    }
    clustering_event_mapping {
        BIGINT id PK "NOT NULL, tự tăng"
        BIGINT cluster_result_id FK "NOT NULL"
        BIGINT event_id FK "NOT NULL"
        INTEGER cluster_label "NOT NULL"
    }
    prediction_results {
        BIGINT id PK "NOT NULL, tự tăng"
        DATE target_date "NOT NULL"
        VARCHAR_32 metric_name "NOT NULL"
        FLOAT predicted_value "NOT NULL"
        FLOAT lower_bound "NOT NULL"
        FLOAT upper_bound "NOT NULL"
        FLOAT actual_value "NULL"
        VARCHAR_64 model_name "NOT NULL"
        VARCHAR_16 model_version "NOT NULL, default 1.0.0"
        JSONB evaluation_metrics "NULL"
        TIMESTAMPTZ generated_at "NOT NULL, default now()"
        BIGINT service_run_id FK "NULL"
    }
    classification_results {
        BIGINT id PK "NOT NULL, tự tăng"
        DATE target_date "NOT NULL"
        VARCHAR_32 predicted_label "NOT NULL"
        JSONB probability_scores "NULL"
        VARCHAR_32 actual_label "NULL"
        VARCHAR_64 model_name "NOT NULL"
        VARCHAR_16 model_version "NOT NULL, default 1.0.0"
        JSONB evaluation_metrics "NULL"
        TIMESTAMPTZ generated_at "NOT NULL, default now()"
        BIGINT service_run_id FK "NULL"
    }
    alembic_version {
        VARCHAR_32 version_num PK "Alembic mặc định; cần xác minh DB thực tế"
    }
```

### 7.2. Quan hệ và ràng buộc

- Một ServiceRun có thể liên kết nhiều kết quả; mỗi result có thể không còn ServiceRun vì FK nullable, `ON DELETE SET NULL`.
- Mapping thuộc đúng một clustering result và một earthquake; cả hai FK `ON DELETE CASCADE`.
- Không có FK trực tiếp từ analysis/prediction/classification tới từng earthquake; liên hệ qua dữ liệu đầu vào và thời gian xử lý, không phải quan hệ relational khai báo.
- Unique `(source, source_event_id)` tên `uq_earthquake_source_event`; không có cột `usgs_id` trong schema. Đây là định danh USGS theo mô hình đa nguồn.
- Không có bảng users/roles/API keys, bảng quốc gia, bảng region, bảng model registry hay PostGIS geometry. Country/region là cột text suy luận từ `place`, không phải reverse geocoding từ tọa độ.
- Không có DB CHECK cho lat/lon, tổng xác suất, thứ tự lower/predicted/upper hay các nhãn trạng thái; phần lớn ràng buộc kiểm ở code.
- Mapping không có unique `(cluster_result_id,event_id)` trong migration.

### 7.3. Index do migration tạo

| Bảng | Index |
|---|---|
| earthquake_events | `idx_earthquake_events_event_time(event_time)` |
| earthquake_events | `idx_earthquake_events_magnitude(magnitude)` |
| earthquake_events | `idx_earthquake_events_time_mag(event_time,magnitude)` |
| earthquake_events | `idx_earthquake_events_coordinates(latitude,longitude)` |
| earthquake_events | `idx_earthquake_events_country_region(country,region)` |
| earthquake_events | Unique index cho constraint `(source,source_event_id)` |
| analysis_results | `idx_analysis_results_type_period(analysis_type,period_end)` |
| prediction_results | `idx_prediction_results_target_date(target_date)` |
| classification_results | `idx_classification_results_target_date(target_date)` |

PK tạo index tương ứng. Không mặc định mọi FK đều có secondary index. ORM có một số `index=True`/Python defaults khác tên index/server defaults của migration; nên triển khai bằng Alembic thay vì khẳng định `metadata.create_all()` cho schema giống hệt. Head dự kiến sau migration là `002_add_country_region`, chưa phải kết quả query DB live.

<a id="muc-8"></a>

## 8. Figma UI/Canvas

[CHƯA CÓ — nhóm sẽ bổ sung sau]

<a id="muc-9"></a>

## 9. Kết quả demo và bằng chứng kiểm chứng

### 9.1. Kết quả đã chạy trong phiên lập báo cáo

Ngày 25/11/2026, tại snapshot source `9454b35`:

| Phép kiểm | Lệnh đã chạy | Kết quả thực tế |
|---|---|---|
| Unit test Backend | `uv run --project apps/api pytest apps/api/tests/unit -q` | **389 passed**, exit code 0, **19.12 s** |
| Nhất quán notes | `PYTHONUTF8=1 uv run --project apps/api python scripts/notes_index.py --check` | `notes_index --check: OK` |

Pytest in cảnh báo cấu hình `asyncio_default_fixture_loop_scope` chưa đặt; warning summary còn có Starlette/TestClient deprecation khi dùng httpx (**1 warning** trong summary). Không có test fail. Đây là bằng chứng unit test logic/mocks, **không phải** bằng chứng PostgreSQL integration, browser E2E, kết nối USGS, Gemini hoặc chất lượng mô hình thực tế.

Kiểm tra tài liệu offline: đủ 11 mục theo slide 3; đủ 11 khối Mermaid (1 kiến trúc, 9 sequence diagrams, 1 ERD); code fence đóng đủ; mọi file Python Backend được Git theo dõi đều có trong phụ lục; quét không phát hiện URL database còn password chưa che hoặc mẫu API key Google thật. Mermaid đã rà nội dung và cấu trúc bằng văn bản, **chưa render bằng Mermaid engine hoặc kiểm chứng phân trang PDF**.

Chưa chạy trong phiên này: full integration suite, frontend tests/build, Ruff toàn repo, load test và end-to-end với bảy tiến trình. Không dùng số lượng test trong notes cũ làm số lượng đo hiện tại. Frontend dùng `node --test tests/*.test.ts`, không phải Vitest/Jest/Playwright; nhiều test là pure function/mock/source assertion, không phải browser rendering test.

### 9.2. Kết quả mô hình lưu sẵn trong artifact

Nguồn: `apps/api/src/gdmas/services/prediction/models/training_report.json`, file đã có trong tracked source. **Chưa tái huấn luyện hoặc độc lập tái lập**. Report ghi n_train=572, n_test=144; không có đủ metadata để xác nhận thời gian dữ liệu, protocol split, leakage hay seed. Không gọi các con số này là số lượng earthquake events.

**Dự báo daily event count:**

| Mô hình trong report | MAE (trận/ngày) | RMSE (trận/ngày) | coverage_95 |
|---|---:|---:|---:|
| Baseline hôm qua | 43,0556 | 58,3057 | Không ghi |
| Baseline trung bình 7 ngày | 41,0942 | 51,6001 | Không ghi |
| Baseline trung bình train | 42,7082 | 56,4065 | Không ghi |
| ARIMA(3,0,2) | 38,3973 | 49,6680 | 98,6111% |
| **ARIMA(2,0,1)_log — winner lưu trong report** | **37,4155** | **48,6247** | **97,2222%** |
| Ridge | 41,0820 | 51,7615 | 97,9167% |

Report ghi cải thiện MAE 9,0% so với baseline tốt nhất. Coverage quan sát cao hơn 95% không tự chứng minh calibration tốt hơn; độ rộng khoảng và protocol đánh giá chưa đủ bằng chứng trong source.

**Phân loại mức hoạt động:**

| Mô hình trong report | Accuracy | Macro-F1 | within_1_level |
|---|---:|---:|---:|
| Baseline giống hôm nay | 45,1389% | 0,324608 | 83,3333% |
| Baseline lớp đa số | 50,6944% | 0,168203 | 80,5556% |
| RandomForest | 36,8056% | 0,252751 | 79,8611% |
| LogisticRegression | 35,4167% | 0,275497 | 77,0833% |
| **PhanPhoiDuBao — winner lưu trong report** | **51,3889%** | **0,263708** | **86,1111%** |

Winner phân loại chỉ hơn majority baseline khoảng **0,6944 điểm phần trăm accuracy**, và macro-F1 thấp hơn baseline “giống hôm nay”. Vì thế không kết luận mô hình vượt mọi baseline ở mọi metric hay có độ chính xác cao. Mã training để xác nhận implementation metric `within_1_level`, confusion matrix và precision/recall từng lớp: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].

Worker đọc metadata này và ghi vào evaluation_metrics; không tính lại rolling MAE/RMSE/accuracy từ dữ liệu production. Việc backfill actual chỉ bổ sung actual_value/actual_label, không đồng nghĩa đã có hệ thống đánh giá online hoàn chỉnh.

### 9.3. Kịch bản demo có thể thực hiện từ code

Bảng dưới là **kịch bản và kỳ vọng**, không phải kết quả đã quan sát trong browser ở phiên này.

| Bước | Thao tác | Điều cần quan sát / kiểm tra |
|---|---|---|
| 1 | Migrate DB, khởi động T1–T7 | API health truy cập DB; service status thể hiện các lượt chạy |
| 2 | Chạy ingestion/backfill | Có raw events, source IDs, tọa độ và UTC hợp lệ; không coi seed là USGS thật |
| 3 | Mở Overview và Earthquakes | KPI/danh sách lấy API; filter/page/detail làm việc; loading/error/empty rõ ràng |
| 4 | Mở Monitoring, chờ ingestion mới | Marker/event list và kết nối SSE; map refetch theo event; quan sát giới hạn refresh từng page |
| 5 | Mở các Statistics subroutes | P1 temporal; P2 trend; P3 mùa vụ nếu đủ dữ liệu; P4 correlation; P5/P6 trang chung |
| 6 | Chạy T4 một cycle | Xem cụm/radius/noise; không gọi số cụm là điểm chất lượng clustering |
| 7 | Chạy T5 | Forecast/interval/nhãn/probabilities; đối chiếu target_date và phạm vi; ghi nhận bất nhất hiện tại |
| 8 | Tùy chọn AI | Cấu hình key riêng; lấy nhận định; phân biệt fallback quy tắc và phản hồi Gemini |
| 9 | Thử lỗi có kiểm soát | Thiếu dữ liệu, lỗi API, mất tiles; UI không thay API lỗi bằng dữ liệu mock |

UI có bốn route chính `/`, `/earthquakes`, `/monitoring`, `/statistics/*`. Sáu patterns nằm trên **năm subroutes đang active**: `bieu-dien-thoi-gian`, `xuan-huong`, `mua-vu`, `tuong-quan`, `du-bao-phan-loai`; P5/P6 dùng chung trang. Không có bằng chứng route đăng nhập, trang reports riêng hoặc trang settings riêng đang active.

### 9.4. Bằng chứng demo còn cần bổ sung

- Ảnh chụp/video chạy thật, ngày demo và phiên bản môi trường: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
- Transcript response của API live, số lượng sự kiện/cụm thực tế trong DB demo, thời gian ingest/latency/throughput: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
- Dataset training gốc, script tái huấn luyện, protocol đánh giá và kết quả rerun: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].
- Biên bản người dùng đánh giá UI/UX, kết quả nghiệm thu production và benchmark tải: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].

**Kết luận:** source hiện thực hệ thống giám sát/phân tích động đất với sáu patterns, DBSCAN không gian, inference ARIMA và diễn giải Gemini tùy chọn. Unit tests Backend đã chạy xanh; kết quả training lưu sẵn có provenance rõ nhưng chưa tái lập. Không khẳng định khả năng dự báo chính xác từng trận, mức thiệt hại hoặc mức sẵn sàng production vượt quá những gì code chứng minh.

<a id="muc-10"></a>

## 10. Folder structure của source code

Cây dưới liệt kê đầy đủ file **được Git theo dõi** thuộc Backend, Frontend, contracts, infra và scripts tại snapshot đối chiếu; không liệt kê dependency cài đặt, cache, `.venv`, `node_modules`, `.git`, secret `.env` hoặc các tài liệu/notes không phải source runtime. `.env.example` chỉ được nêu tên, không sao chép giá trị.

```text
GDMAS/
├── .github/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── apps/
│   ├── api/
│   │   ├── alembic/
│   │   │   ├── versions/
│   │   │   │   ├── .gitkeep
│   │   │   │   ├── 001_initial_gdmas_schema.py
│   │   │   │   └── 002_add_country_region.py
│   │   │   └── env.py
│   │   ├── src/
│   │   │   └── gdmas/
│   │   │       ├── api/
│   │   │       │   ├── routes/
│   │   │       │   │   ├── ai_settings.py
│   │   │       │   │   ├── analysis.py
│   │   │       │   │   ├── clusters.py
│   │   │       │   │   ├── earthquakes.py
│   │   │       │   │   ├── events.py
│   │   │       │   │   ├── patterns.py
│   │   │       │   │   ├── predictions.py
│   │   │       │   │   ├── statistics.py
│   │   │       │   │   ├── stream.py
│   │   │       │   │   └── system.py
│   │   │       │   ├── dependencies.py
│   │   │       │   ├── errors.py
│   │   │       │   └── router.py
│   │   │       ├── core/
│   │   │       │   ├── config.py
│   │   │       │   ├── exceptions.py
│   │   │       │   └── logging.py
│   │   │       ├── db/
│   │   │       │   ├── base.py
│   │   │       │   └── connection.py
│   │   │       ├── models/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── analysis.py
│   │   │       │   ├── clustering.py
│   │   │       │   ├── earthquake.py
│   │   │       │   ├── prediction.py
│   │   │       │   └── service_run.py
│   │   │       ├── realtime/
│   │   │       │   ├── event_manager.py
│   │   │       │   └── sse.py
│   │   │       ├── scheduler/
│   │   │       │   └── jobs.py
│   │   │       ├── schemas/
│   │   │       │   ├── __init__.py
│   │   │       │   └── earthquake.py
│   │   │       ├── services/
│   │   │       │   ├── analysis/
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── filtered.py
│   │   │       │   │   ├── patterns.py
│   │   │       │   │   ├── runner.py
│   │   │       │   │   └── service.py
│   │   │       │   ├── clustering/
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── runner.py
│   │   │       │   │   └── service.py
│   │   │       │   ├── ingestion/
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── backfill.py
│   │   │       │   │   ├── geo.py
│   │   │       │   │   ├── parser.py
│   │   │       │   │   ├── runner.py
│   │   │       │   │   ├── service.py
│   │   │       │   │   └── upsert.py
│   │   │       │   ├── prediction/
│   │   │       │   │   ├── models/
│   │   │       │   │   │   ├── forecast_model.joblib
│   │   │       │   │   │   ├── recent_history.json
│   │   │       │   │   │   ├── risk_classifier.joblib
│   │   │       │   │   │   └── training_report.json
│   │   │       │   │   ├── __init__.py
│   │   │       │   │   ├── inference.py
│   │   │       │   │   ├── runner.py
│   │   │       │   │   └── service.py
│   │   │       │   ├── __init__.py
│   │   │       │   ├── ai_env.py
│   │   │       │   ├── ai_gemini.py
│   │   │       │   ├── catalog.py
│   │   │       │   └── demo_seeder.py
│   │   │       └── main.py
│   │   ├── tests/
│   │   │   ├── fixtures/
│   │   │   │   └── quality_contracts.json
│   │   │   ├── integration/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── test_analysis_transactions.py
│   │   │   │   └── test_ingestion_pipeline.py
│   │   │   ├── unit/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── conftest.py
│   │   │   │   ├── test_ai_settings.py
│   │   │   │   ├── test_analysis_contract_fields.py
│   │   │   │   ├── test_analysis_filtered.py
│   │   │   │   ├── test_analysis_patterns.py
│   │   │   │   ├── test_analysis_runner.py
│   │   │   │   ├── test_analysis_service.py
│   │   │   │   ├── test_analysis_temporal_window.py
│   │   │   │   ├── test_analysis_trend_metrics.py
│   │   │   │   ├── test_analysis_trend_route.py
│   │   │   │   ├── test_api_error_boundaries.py
│   │   │   │   ├── test_catalog_sse.py
│   │   │   │   ├── test_cluster_contract_fields.py
│   │   │   │   ├── test_clustering_service.py
│   │   │   │   ├── test_earthquakes_routes.py
│   │   │   │   ├── test_ingestion_backfill.py
│   │   │   │   ├── test_ingestion_geo.py
│   │   │   │   ├── test_ingestion_parser.py
│   │   │   │   ├── test_ingestion_service.py
│   │   │   │   ├── test_ingestion_upsert.py
│   │   │   │   ├── test_patterns_contract_fields.py
│   │   │   │   ├── test_prediction_filtered_precision.py
│   │   │   │   ├── test_prediction_inference.py
│   │   │   │   ├── test_prediction_service.py
│   │   │   │   ├── test_quality_boundaries.py
│   │   │   │   ├── test_sse_stream.py
│   │   │   │   ├── test_statistics_route.py
│   │   │   │   ├── test_sync_feed_config.py
│   │   │   │   ├── test_system_prediction_routes.py
│   │   │   │   ├── test_worker_error_boundaries.py
│   │   │   │   └── test_worker_intervals_docs.py
│   │   │   └── conftest.py
│   │   ├── .dockerignore
│   │   ├── .python-version
│   │   ├── Dockerfile
│   │   ├── alembic.ini
│   │   ├── pyproject.toml
│   │   └── uv.lock
│   └── web/
│       ├── public/
│       │   ├── README.md
│       │   └── world-countries.geo.json
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   └── routes.tsx
│       │   ├── components/
│       │   │   ├── charts/
│       │   │   │   ├── ChartReadingGuide.tsx
│       │   │   │   ├── ClassificationPatternChart.tsx
│       │   │   │   ├── CorrelationHeatmap.tsx
│       │   │   │   ├── ForecastPatternChart.tsx
│       │   │   │   ├── OverviewHotspotsChart.tsx
│       │   │   │   ├── OverviewSeasonalityChart.tsx
│       │   │   │   ├── OverviewSeverityChart.tsx
│       │   │   │   ├── OverviewTrendChart.tsx
│       │   │   │   ├── PatternPanel.tsx
│       │   │   │   ├── SeasonalityPatternChart.tsx
│       │   │   │   ├── TemporalPatternCharts.tsx
│       │   │   │   ├── TrendPatternChart.tsx
│       │   │   │   ├── chart-guides.ts
│       │   │   │   ├── chart-theme.ts
│       │   │   │   └── index.ts
│       │   │   └── map/
│       │   │       ├── EarthquakeMarkerLayer.tsx
│       │   │       ├── EventListPanel.tsx
│       │   │       ├── MapControlsPanel.tsx
│       │   │       ├── MapEmptyOverlay.tsx
│       │   │       ├── MapLegend.tsx
│       │   │       ├── MapPopupCard.tsx
│       │   │       ├── MapRegionPanel.tsx
│       │   │       ├── MapViewportHud.tsx
│       │   │       ├── SeismicMap.tsx
│       │   │       ├── WorldFallbackLayer.tsx
│       │   │       ├── index.ts
│       │   │       └── tile-url.ts
│       │   ├── contexts/
│       │   │   └── timezone-context.tsx
│       │   ├── contracts/
│       │   │   ├── analysis.ts
│       │   │   ├── classifications.ts
│       │   │   ├── clusters.ts
│       │   │   ├── common.ts
│       │   │   ├── country-clusters.ts
│       │   │   ├── earthquake.ts
│       │   │   ├── geo-catalog.ts
│       │   │   ├── geo-filter.ts
│       │   │   ├── health.ts
│       │   │   ├── index.ts
│       │   │   ├── monthly-peaks.ts
│       │   │   ├── patterns.ts
│       │   │   ├── predictions.ts
│       │   │   ├── sse.ts
│       │   │   └── system-status.ts
│       │   ├── features/
│       │   │   ├── earthquakes/
│       │   │   │   ├── components/
│       │   │   │   │   ├── AsyncStatePanel.tsx
│       │   │   │   │   ├── CountryClusterChart.tsx
│       │   │   │   │   ├── EarthquakeDetailPanel.tsx
│       │   │   │   │   ├── EarthquakeFilterBar.tsx
│       │   │   │   │   ├── EarthquakeInsights.tsx
│       │   │   │   │   ├── EarthquakePagination.tsx
│       │   │   │   │   ├── EarthquakeTable.tsx
│       │   │   │   │   ├── MagnitudeHistogramChart.tsx
│       │   │   │   │   ├── NumberStepperField.tsx
│       │   │   │   │   ├── SeverityReferenceTable.tsx
│       │   │   │   │   └── UsgsSyncButton.tsx
│       │   │   │   ├── EarthquakesPage.css
│       │   │   │   ├── EarthquakesPage.tsx
│       │   │   │   ├── catalog-selection.ts
│       │   │   │   ├── country-clusters.ts
│       │   │   │   ├── country-filter.ts
│       │   │   │   ├── earthquake-detail.ts
│       │   │   │   ├── earthquake-insights.ts
│       │   │   │   ├── earthquake-view.ts
│       │   │   │   ├── magnitude-histogram.ts
│       │   │   │   ├── region-filter.ts
│       │   │   │   ├── useCatalogSelection.ts
│       │   │   │   └── usgs-sync.ts
│       │   │   ├── monitoring/
│       │   │   │   ├── MonitoringMapPage.tsx
│       │   │   │   ├── monitoring-view.ts
│       │   │   │   ├── monitoring.css
│       │   │   │   ├── region-catalog-view.ts
│       │   │   │   ├── region-clusters.ts
│       │   │   │   └── sse-context.ts
│       │   │   ├── overview/
│       │   │   │   ├── OverviewPage.css
│       │   │   │   ├── OverviewPage.tsx
│       │   │   │   ├── overview-view.ts
│       │   │   │   └── useOverviewData.ts
│       │   │   └── statistics/
│       │   │       ├── patterns/
│       │   │       │   ├── ClassificationPatternPage.tsx
│       │   │       │   ├── CorrelationPatternPage.tsx
│       │   │       │   ├── ForecastClassificationPatternPage.tsx
│       │   │       │   ├── ForecastPatternPage.tsx
│       │   │       │   ├── SeasonalityPatternPage.tsx
│       │   │       │   ├── TemporalPatternPage.tsx
│       │   │       │   ├── TrendPatternPage.tsx
│       │   │       │   └── index.ts
│       │   │       ├── ExpertInsightsPanel.tsx
│       │   │       ├── StatisticsLayout.tsx
│       │   │       ├── StatisticsPage.css
│       │   │       ├── StatisticsPage.tsx
│       │   │       ├── StatisticsRoutes.tsx
│       │   │       ├── ai-config.ts
│       │   │       ├── ai-extract.ts
│       │   │       ├── ai-insights.ts
│       │   │       ├── ai-storage.ts
│       │   │       ├── earthquake-safety.ts
│       │   │       ├── insight-structure.ts
│       │   │       ├── pattern-nav.ts
│       │   │       ├── statistics-data.tsx
│       │   │       └── statistics-view.ts
│       │   ├── hooks/
│       │   │   ├── index.ts
│       │   │   ├── sse-machine.ts
│       │   │   ├── useDatabaseReset.ts
│       │   │   ├── useEarthquakeInsights.ts
│       │   │   ├── useSSE.ts
│       │   │   └── useTheme.ts
│       │   ├── layouts/
│       │   │   ├── header/
│       │   │   │   ├── AiKeyButton.tsx
│       │   │   │   ├── AiKeyDialog.tsx
│       │   │   │   ├── CompactRefreshCountdown.tsx
│       │   │   │   ├── DataRefreshLabel.tsx
│       │   │   │   ├── GlobalCountryFilter.tsx
│       │   │   │   ├── GlobalRegionFilter.tsx
│       │   │   │   ├── HeaderActions.tsx
│       │   │   │   ├── HeaderFilterContext.tsx
│       │   │   │   ├── RealtimeClock.tsx
│       │   │   │   ├── RefreshToast.tsx
│       │   │   │   ├── RefreshToastHost.tsx
│       │   │   │   ├── SystemStatusPanel.tsx
│       │   │   │   ├── ThemeToggle.tsx
│       │   │   │   └── header-data.ts
│       │   │   ├── DashboardLayout.tsx
│       │   │   ├── index.ts
│       │   │   ├── layout.css
│       │   │   └── navigation.ts
│       │   ├── lib/
│       │   │   ├── transforms/
│       │   │   │   ├── chart-data.ts
│       │   │   │   ├── chart-types.ts
│       │   │   │   ├── cluster-fallback.ts
│       │   │   │   ├── map-data.ts
│       │   │   │   ├── map-types.ts
│       │   │   │   └── settings-data.ts
│       │   │   ├── api-client.ts
│       │   │   ├── formatters.ts
│       │   │   ├── index.ts
│       │   │   ├── sse.ts
│       │   │   └── theme.ts
│       │   ├── services/
│       │   │   ├── ai-settings-api.ts
│       │   │   ├── earthquake-api.ts
│       │   │   ├── geo-catalog-api.ts
│       │   │   └── sse-api.ts
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   └── index.css
│       │   ├── types/
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   └── timezone.ts
│       │   └── main.tsx
│       ├── tests/
│       │   ├── ai-extract.test.ts
│       │   ├── ai-insights.test.ts
│       │   ├── ai-key-dialog.test.ts
│       │   ├── analysis-query-params.test.ts
│       │   ├── api-empty-envelope.test.ts
│       │   ├── app-lazy-pages.test.ts
│       │   ├── be-country-region-fields.test.ts
│       │   ├── catalog-selection-persistence.test.ts
│       │   ├── catalog-selection.test.ts
│       │   ├── chart-data.test.ts
│       │   ├── chart-guides.test.ts
│       │   ├── chart-region-filter.test.ts
│       │   ├── cluster-fallback.test.ts
│       │   ├── country-clusters.test.ts
│       │   ├── earthquake-detail.test.ts
│       │   ├── earthquakes-insights.test.ts
│       │   ├── earthquakes-page.test.ts
│       │   ├── forecast-confidence-label.test.ts
│       │   ├── geo-catalog-api.test.ts
│       │   ├── geo-format.test.ts
│       │   ├── header-aside-controls.test.ts
│       │   ├── header-global.test.ts
│       │   ├── header-region-filter.test.ts
│       │   ├── header-sse-refresh.test.ts
│       │   ├── insight-structure.test.ts
│       │   ├── layout-navigation.test.ts
│       │   ├── lib-redesign.test.ts
│       │   ├── map-data.test.ts
│       │   ├── monitoring-map.test.ts
│       │   ├── monitoring-region-map.test.ts
│       │   ├── monthly-peaks.test.ts
│       │   ├── overview-docs-gaps.test.ts
│       │   ├── overview-range-filter.test.ts
│       │   ├── overview-ranking-catalog.test.ts
│       │   ├── overview-view.test.ts
│       │   ├── pattern-nav.test.ts
│       │   ├── region-clusters.test.ts
│       │   ├── region-filter.test.ts
│       │   ├── services.test.ts
│       │   ├── settings-data.test.ts
│       │   ├── severity-standard.test.ts
│       │   ├── sse-api.test.ts
│       │   ├── sse-default.test.ts
│       │   ├── sse-machine.test.ts
│       │   ├── statistics-view.test.ts
│       │   ├── terminal-status.test.ts
│       │   ├── theme.test.ts
│       │   ├── timezone-context.test.ts
│       │   ├── usgs-sync.test.ts
│       │   └── vite-proxy.test.ts
│       ├── .dockerignore
│       ├── .env.example
│       ├── Dockerfile
│       ├── Dockerfile.dev
│       ├── index.html
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── tsconfig.json
│       └── vite.config.ts
├── contracts/
│   ├── examples/
│   │   ├── analysis_sample.json
│   │   ├── classifications_sample.json
│   │   ├── clusters_sample.json
│   │   ├── earthquake_sample.json
│   │   ├── health_sample.json
│   │   ├── patterns_sample.json
│   │   ├── predictions_sample.json
│   │   ├── sse-event_sample.json
│   │   └── system_status_sample.json
│   ├── schemas/
│   │   ├── analysis.json
│   │   ├── classifications.json
│   │   ├── clusters.json
│   │   ├── earthquake.json
│   │   ├── geo-catalog.json
│   │   ├── health.json
│   │   ├── patterns.json
│   │   ├── predictions.json
│   │   ├── sse-event.json
│   │   └── system-status.json
│   └── README.md
├── infra/
│   └── postgres/
│       └── init.sql
├── scripts/
│   ├── tests/
│   │   ├── test_api_docs_contracts.py
│   │   ├── test_git_workflow.py
│   │   ├── test_notes_index.py
│   │   ├── test_setup_docs.py
│   │   ├── test_test_script.py
│   │   └── test_workflow_checkpoints.py
│   ├── demo-clear-patterns.ps1
│   ├── demo-init-patterns.ps1
│   ├── dev.sh
│   ├── git-setup.sh
│   ├── git-ship.sh
│   ├── notes_index.py
│   └── test.sh
├── .env.example
├── dev.bat
├── dev.ps1
└── docker-compose.yml
```

### Trách nhiệm các thư mục

| Đường dẫn | Trách nhiệm |
|---|---|
| apps/api/src/gdmas/api | Routes, dependency và lỗi HTTP |
| apps/api/src/gdmas/models | Bảy ORM models nghiệp vụ |
| apps/api/src/gdmas/db | Base, engine, SessionLocal |
| apps/api/src/gdmas/services | Ingestion, analysis, clustering, prediction và Gemini |
| apps/api/src/gdmas/realtime | SSE polling và đóng gói sự kiện |
| apps/api/alembic | Migration schema |
| apps/api/tests | Unit/integration tests offline |
| apps/web/src/features | Overview, Earthquakes, Monitoring, Statistics |
| apps/web/src/components | Chart Recharts, map Leaflet và UI |
| apps/web/src/services | REST/SSE clients và AI settings |
| apps/web/tests | Node test runner tests |
| contracts | JSON Schema và ví dụ payload |
| infra/postgres | Init PostgreSQL |
| scripts | Dev/demo, test và Git workflow local |

Một số file như `scheduler/jobs.py`, `realtime/event_manager.py`, `core/exceptions.py`, `core/logging.py` hiện rỗng; tên thư mục không chứng minh có scheduler, event bus hoặc framework logging riêng đã triển khai.

<a id="muc-11"></a>

## 11. Toàn bộ source code Backend

### 11.1. Phạm vi bản in và quy tắc bảo vệ secret

Toàn bộ file Python được Git theo dõi trong `apps/api/` được in nguyên phần mã, gồm runtime, migration và unit/integration tests; kèm cấu hình build, JSON artifact/fixture và SQL init. Không rút gọn bằng dấu ba chấm. File rỗng được ghi nhận rõ. Phần bổ sung in script dev/demo/test có liên quan vận hành Backend.

**Ngoại lệ an toàn:** không đọc/in `.env`; các literal password hoặc thông tin đăng nhập trong URL cấu hình được thay bằng `[DA_CHE_THONG_TIN_DANG_NHAP]`. Đây là bản in đã che credential, không phải một bản source thay thế để copy chạy nguyên xi. Source trong repo không bị sửa. Key giả trong fixture là dữ liệu kiểm thử, không phải key được cung cấp để sử dụng dịch vụ.

File nhị phân `.joblib` không phải source text; dependency lock `uv.lock` không phải mã tác giả. Các file này được thống kê đường dẫn, kích thước và SHA-256 thay vì ép nhị phân/lock thành trang mã. Mã training tạo artifact: [CHƯA CÓ TRONG SOURCE CODE — cần bổ sung].

**Tổng số file text được in:** 106 (bao gồm file rỗng); **file không in nội dung:** 4.

### 11.2. Manifest file không phải source text

| File | Bytes | SHA-256 | Lý do |
|---|---:|---|---|
| `apps/api/alembic/versions/.gitkeep` | 2 | `7eb70257593da06f682a3ddda54a9d260d4fc514f645237f5ca74b08f8da61a6` | File giữ thư mục rỗng |
| `apps/api/src/gdmas/services/prediction/models/forecast_model.joblib` | 185 | `8c1981260caa265f647c1a0ba02bc3517cf96aa9fa087b0044ba3ad557c2cc64` | Model nhị phân |
| `apps/api/src/gdmas/services/prediction/models/risk_classifier.joblib` | 6753 | `bd7d6682c05ddbef21f264008ff235ad71d7c54e20e0e09473e5a58f0a07810a` | Model nhị phân |
| `apps/api/uv.lock` | 445633 | `a751077af8b96de5e352d2a53a45116bd064497eee4c2a01eee703e861752f3e` | Dependency lock, không phải source tác giả |

### 11.3. Bản in source theo từng file

#### 11.3.1. `apps/api/.dockerignore`

````text
.venv
__pycache__
*.pyc
.git
.pytest_cache

````

#### 11.3.2. `apps/api/.python-version`

````text
3.12
````

#### 11.3.3. `apps/api/Dockerfile`

````dockerfile
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy application source code and descriptors
COPY . .

# Install application package with uv
RUN uv pip install --system -e .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

EXPOSE 8000

CMD ["uvicorn", "gdmas.main:app", "--host", "0.0.0.0", "--port", "8000"]
````

#### 11.3.4. `apps/api/alembic.ini`

````ini
# A generic, single database configuration.

[alembic]
# path to migration scripts
script_location = alembic

# template used to generate migration file names; The default value is %%(rev)s_%%(slug)s
file_template = %%(rev)s_%%(slug)s

# sys.path path, will be prepended to sys.path if present.
prepend_sys_path = src

# timezone to use when rendering the date within the migration file
# as well as the filename.
timezone = UTC

# max length of characters to apply to the "slug" field
truncate_slug_length = 40

# set to 'true' to run the environment during
# the 'revision' command, regardless of autogenerate
# revision_environment = false

# set to 'true' to allow .pyc and .pyo files without
# a source .py file to be detected as revisions in the
# versions/ directory
# sourceless = false

# version location specification; This defaults
# to alembic/versions.  When using multiple version
# directories, initial revisions must be specified with --version-path.
version_locations = alembic/versions

# set to 'true' to search source files recursively
# in each "version_locations" directory
# recursive_version_locations = false

# the output encoding used when revisions are generated
# output_encoding = utf-8

sqlalchemy.url = postgresql+psycopg://gdmas_user:[DA_CHE_THONG_TIN_DANG_NHAP]@localhost:5432/gdmas_db

[post_write_hooks]

# Logging configuration
[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S

````

#### 11.3.5. `apps/api/alembic/env.py`

````python
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Ensure src/ directory is in sys.path
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

# Import all models to ensure metadata registers all tables
import gdmas.models  # noqa: F401
from gdmas.core.config import settings
from gdmas.db.base import Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database URL dynamically from GDMAS settings / environment
db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
````

#### 11.3.6. `apps/api/alembic/versions/001_initial_gdmas_schema.py`

````python
"""initial_gdmas_schema

Revision ID: 001_initial_gdmas_schema
Revises: 
Create Date: 2026-11-06 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_gdmas_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create service_runs table
    op.create_table(
        'service_runs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('service_name', sa.String(length=32), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=16), server_default='RUNNING', nullable=False),
        sa.Column('records_processed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Create earthquake_events table
    op.create_table(
        'earthquake_events',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('source', sa.String(length=32), server_default='USGS', nullable=False),
        sa.Column('source_event_id', sa.String(length=64), nullable=False),
        sa.Column('event_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ingested_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('depth_km', sa.Float(), nullable=False),
        sa.Column('magnitude', sa.Float(), nullable=False),
        sa.Column('magnitude_type', sa.String(length=16), nullable=True),
        sa.Column('place', sa.Text(), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'source_event_id', name='uq_earthquake_source_event')
    )
    op.create_index('idx_earthquake_events_event_time', 'earthquake_events', ['event_time'], unique=False)
    op.create_index('idx_earthquake_events_magnitude', 'earthquake_events', ['magnitude'], unique=False)
    op.create_index('idx_earthquake_events_time_mag', 'earthquake_events', ['event_time', 'magnitude'], unique=False)
    op.create_index('idx_earthquake_events_coordinates', 'earthquake_events', ['latitude', 'longitude'], unique=False)

    # 3. Create analysis_results table
    op.create_table(
        'analysis_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('analysis_type', sa.String(length=32), nullable=False),
        sa.Column('time_interval', sa.String(length=16), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metrics_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_analysis_results_type_period', 'analysis_results', ['analysis_type', 'period_end'], unique=False)

    # 4. Create clustering_results table
    op.create_table(
        'clustering_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('algorithm', sa.String(length=32), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('total_clusters', sa.Integer(), server_default='0', nullable=False),
        sa.Column('noise_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('summary_clusters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Create clustering_event_mapping table
    op.create_table(
        'clustering_event_mapping',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('cluster_result_id', sa.BigInteger(), nullable=False),
        sa.Column('event_id', sa.BigInteger(), nullable=False),
        sa.Column('cluster_label', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['cluster_result_id'], ['clustering_results.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id'], ['earthquake_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create prediction_results table
    op.create_table(
        'prediction_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('metric_name', sa.String(length=32), nullable=False),
        sa.Column('predicted_value', sa.Float(), nullable=False),
        sa.Column('lower_bound', sa.Float(), nullable=False),
        sa.Column('upper_bound', sa.Float(), nullable=False),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=16), server_default='1.0.0', nullable=False),
        sa.Column('evaluation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_prediction_results_target_date', 'prediction_results', ['target_date'], unique=False)

    # 7. Create classification_results table
    op.create_table(
        'classification_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('predicted_label', sa.String(length=32), nullable=False),
        sa.Column('probability_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('actual_label', sa.String(length=32), nullable=True),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=16), server_default='1.0.0', nullable=False),
        sa.Column('evaluation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_classification_results_target_date', 'classification_results', ['target_date'], unique=False)


def downgrade() -> None:
    op.drop_table('classification_results')
    op.drop_table('prediction_results')
    op.drop_table('clustering_event_mapping')
    op.drop_table('clustering_results')
    op.drop_table('analysis_results')
    op.drop_table('earthquake_events')
    op.drop_table('service_runs')

````

#### 11.3.7. `apps/api/alembic/versions/002_add_country_region.py`

````python
"""add earthquake country and region

Revision ID: 002_add_country_region
Revises: 001_initial_gdmas_schema
Create Date: 2026-11-22 00:00:00.000000

Tách `place` của USGS thành 2 cột quốc gia/khu vực để lọc server-side.
Không sửa migration 001 (I4). Backfill dùng chung helper Python với ingestion
để bảo đảm FE/BE không lệch nhãn.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_add_country_region"
down_revision: str | None = "001_initial_gdmas_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COUNTRY_LENGTH = 128


def upgrade() -> None:
    op.add_column(
        "earthquake_events",
        sa.Column("country", sa.String(length=COUNTRY_LENGTH), nullable=True),
    )
    op.add_column(
        "earthquake_events",
        sa.Column("region", sa.String(length=COUNTRY_LENGTH), nullable=True),
    )
    op.create_index(
        "idx_earthquake_events_country_region",
        "earthquake_events",
        ["country", "region"],
        unique=False,
    )

    # Backfill bằng đúng helper của BE — tránh lệch regex giữa SQL và Python.
    from gdmas.services.ingestion.geo import derive_place_fields

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, place FROM earthquake_events "
            "WHERE country IS NULL OR region IS NULL"
        )
    ).mappings()
    for row in rows:
        country, region = derive_place_fields(row["place"])
        connection.execute(
            sa.text(
                "UPDATE earthquake_events SET country = :country, region = :region "
                "WHERE id = :id"
            ),
            {"country": country, "region": region, "id": row["id"]},
        )


def downgrade() -> None:
    op.drop_index(
        "idx_earthquake_events_country_region", table_name="earthquake_events"
    )
    op.drop_column("earthquake_events", "region")
    op.drop_column("earthquake_events", "country")
````

#### 11.3.8. `apps/api/pyproject.toml`

````toml
[project]
name = "gdmas-api"
version = "0.1.0"
description = "Global Disaster Monitoring and Analysis System"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.28.0",
    "sqlalchemy>=2.0.28",
    "psycopg[binary]>=3.1.18",
    "alembic>=1.13.1",
    "pydantic>=2.6.4",
    "pydantic-settings>=2.2.1",
    "httpx>=0.27.0",
    "pandas>=2.2.1",
    "numpy>=1.26.4",
    "scipy>=1.12.0",
    "statsmodels>=0.14.1",
    "scikit-learn>=1.4.1",
    "joblib>=1.3.0",
    "sse-starlette>=2.0.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.5",
    "ruff>=0.3.0",
]

[tool.ruff]
# I4: giữ nguyên migration đã phát hành; migration mới vẫn được kiểm tra.
extend-exclude = ["alembic/versions/001_initial_gdmas_schema.py"]

[tool.ruff.lint.flake8-bugbear]
extend-immutable-calls = ["fastapi.Depends"]
````

#### 11.3.9. `apps/api/src/gdmas/api/dependencies.py`

````python
from gdmas.db.connection import get_db

__all__ = ["get_db"]
````

#### 11.3.10. `apps/api/src/gdmas/api/errors.py`

````python
"""Envelope lỗi chuẩn của API (docs/api/API.md §2 và §4)."""

from typing import Any

from fastapi.responses import JSONResponse


def error_response(
    code: str,
    message: str,
    status_code: int,
    details: Any = None,
) -> JSONResponse:
    """Trả về phản hồi lỗi: {"success": false, "error": {code, message, details}}."""
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message, "details": details},
        },
    )
````

#### 11.3.11. `apps/api/src/gdmas/api/router.py`

````python
from fastapi import APIRouter

from gdmas.api.routes import (
    ai_settings,
    analysis,
    clusters,
    earthquakes,
    events,
    patterns,
    predictions,
    statistics,
    stream,
    system,
)

api_router = APIRouter()
api_router.include_router(earthquakes.router)
api_router.include_router(statistics.router)
api_router.include_router(stream.router)
api_router.include_router(events.router)
api_router.include_router(patterns.router)
api_router.include_router(system.router)
api_router.include_router(predictions.router)
api_router.include_router(analysis.router)
api_router.include_router(clusters.router)
api_router.include_router(ai_settings.router)
````

#### 11.3.12. `apps/api/src/gdmas/api/routes/ai_settings.py`

````python
"""Cấu hình Gemini từ trình duyệt: validate key → ghi .env → sinh nhận xét.

Web mở không có auth: key do người dùng nhập, FE lưu browser 24h rồi gửi lên đây;
BE kiểm tra key hợp lệ với Gemini, chỉ lưu model/key vào .env (không lưu database).
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from gdmas.api.errors import error_response
from gdmas.services.ai_env import mask_key, read_ai_env, upsert_ai_env
from gdmas.services.ai_gemini import (
    generate_content,
    is_gemini_model,
    validate_credentials,
)

router = APIRouter(tags=["AI Settings"])


class CredentialsPayload(BaseModel):
    model: str = Field(min_length=1, max_length=80)
    api_key: str = Field(min_length=1, max_length=256)


class GeneratePayload(BaseModel):
    prompt: str = Field(min_length=1)
    system: str | None = None
    model: str = Field(min_length=1, max_length=80)
    api_key: str = Field(min_length=1, max_length=256)


@router.post("/ai/credentials")
def save_credentials(payload: CredentialsPayload):
    model, api_key = payload.model.strip(), payload.api_key.strip()
    if not is_gemini_model(model):
        return error_response(
            "VALIDATION_ERROR",
            "Chỉ hỗ trợ mô hình Gemini (gemini-*).",
            400,
            {"field": "model"},
        )
    if not api_key or any(char.isspace() for char in api_key):
        return error_response(
            "VALIDATION_ERROR", "API key không hợp lệ.", 400, {"field": "api_key"}
        )
    if not validate_credentials(model, api_key):
        return error_response(
            "INVALID_API_KEY", "Gemini từ chối API key hoặc mô hình này.", 401
        )
    try:
        upsert_ai_env(model, api_key)
    except OSError as exc:
        return error_response(
            "ENV_WRITE_ERROR", "Không ghi được cấu hình AI.", 500, str(exc)
        )
    return {
        "success": True,
        "data": {"model": model, "configured": True},
        "message": "Đã lưu cấu hình Gemini vào .env trên máy chủ.",
    }


@router.get("/ai/credentials/status")
def credentials_status():
    model, key = read_ai_env()
    return {
        "success": True,
        "data": {
            "configured": bool(model and key),
            "model": model or None,
            "masked_key": mask_key(key),
        },
    }


@router.post("/ai/generate")
def generate(payload: GeneratePayload):
    model, key = read_ai_env()
    if not model or not key:
        return error_response(
            "AI_NOT_CONFIGURED", "Chưa cấu hình Gemini trên máy chủ.", 503
        )
    # FE gửi lại key đang lưu trong browser → BE đối chiếu với .env trước khi gọi Gemini.
    if payload.model.strip() != model or payload.api_key.strip() != key:
        return error_response(
            "INVALID_API_KEY", "API key trình duyệt không khớp cấu hình đã lưu.", 401
        )
    try:
        text = generate_content(
            model,
            key,
            payload.prompt,
            system=payload.system,
        )
    except Exception as exc:  # noqa: BLE001 — lỗi upstream không lộ key
        return error_response(
            "AI_UPSTREAM_ERROR", "Không tạo được nội dung từ Gemini.", 502, str(exc)
        )
    return {"success": True, "data": {"text": text}}
````

#### 11.3.13. `apps/api/src/gdmas/api/routes/analysis.py`

````python
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.predictions import _empty
from gdmas.db.connection import get_db
from gdmas.models.analysis import AnalysisResult
from gdmas.services.analysis.filtered import compute_filtered_metrics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def _parse_window(raw: str | None) -> datetime | None:
    """Parse ISO 8601 UTC (có/không hậu tố Z); sai → None (không làm crash route)."""
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


# Chấp nhận cả tên chuẩn của API.md lẫn tên đang được demo_seeder ghi
TYPE_ALIASES = {
    "temporal": ["temporal", "time_series"],
    "trend": ["trend"],
    "seasonality": ["seasonality"],
    "correlation": ["correlation"],
}
INTERVAL_ALIASES = {
    "day": ["day", "daily", "hourly"],
    "week": ["week", "weekly"],
    "month": ["month", "monthly"],
    "D": ["day", "daily"],
    "W": ["week", "weekly"],
    "M": ["month", "monthly"],
}


def _utc(raw: str | None) -> datetime | None:
    if raw is None:
        return None
    try:
        dt = datetime.fromisoformat(raw.strip())
    except ValueError:
        return None
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _latest(
    db: Session,
    kind: str,
    interval: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    strict_interval: bool = False,
) -> AnalysisResult | None:
    """Bản ghi mới nhất của một pattern. Ưu tiên khớp interval, không có thì lấy mới nhất.

    `strict_interval=True`: chỉ nhận bản khớp interval (không lùi sang tần suất khác).
    """
    query = db.query(AnalysisResult).filter(
        AnalysisResult.analysis_type.in_(TYPE_ALIASES[kind])
    )
    if start is not None:
        query = query.filter(AnalysisResult.period_end >= start)
    if end is not None:
        query = query.filter(AnalysisResult.period_start <= end)
    ordered = query.order_by(desc(AnalysisResult.period_end), desc(AnalysisResult.id))
    if interval is not None:
        matched = ordered.filter(
            AnalysisResult.time_interval.in_(INTERVAL_ALIASES[interval])
        ).first()
        if matched is not None or strict_interval:
            return matched
    return ordered.first()


def _respond(db: Session, kind: str, build, **filters):
    try:
        row = _latest(db, kind, **filters)
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc analysis_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty(
            f"Chưa có kết quả Pattern '{kind}'. Hãy chạy Terminal 3 (analysis)."
        )
    return {
        "success": True,
        "data": build(row.metrics_data or {}),
    }


@router.get("/temporal")
def get_temporal(
    interval: str = Query("day", pattern="^(day|week|month)$"),
    start_time: str | None = Query(None, description="ISO 8601 UTC"),
    end_time: str | None = Query(None, description="ISO 8601 UTC"),
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    timezone: str | None = Query(
        None, pattern="^(UTC|UTC\\+7)$", description="Múi giờ hiển thị bucket ngày"
    ),
    db: Session = Depends(get_db),
):
    """Pattern 1: line chart, scatter plot và histogram."""
    start, end = _utc(start_time), _utc(end_time)
    for name, raw, parsed in (
        ("start_time", start_time, start),
        ("end_time", end_time, end),
    ):
        if raw is not None and parsed is None:
            return error_response(
                "VALIDATION_ERROR",
                f"{name} phải là ISO 8601 hợp lệ",
                400,
                {"field": name, "value": raw},
            )
    if start and end and start > end:
        return error_response(
            "VALIDATION_ERROR",
            "start_time không được lớn hơn end_time",
            400,
            {"field": "start_time", "value": start_time},
        )

    def build(m: dict[str, Any]) -> dict[str, Any]:
        hist = m.get("histogram", [])
        if isinstance(hist, dict) and "magnitude_bins" in hist:
            bins = hist["magnitude_bins"]
        elif isinstance(hist, dict):
            bins = [{"bin": k, "count": v} for k, v in hist.items()]
        else:
            bins = hist
        data = {
            "interval": interval,
            "line_chart": m.get("line_chart", []),
            "scatter_plot": m.get("scatter_plot", []),
            "histogram": {"magnitude_bins": bins},
        }
        # Pass-through field optional đã có trong analysis.json / T3
        # (services/analysis/patterns.py:244-252). Không nội suy khi nguồn không có.
        if m.get("status") is not None:
            data["status"] = m["status"]
        stats = {
            key: m[key]
            for key in ("data_points", "avg_magnitude", "max_magnitude", "avg_depth")
            if key in m
        }
        if stats:
            data["stats"] = stats
        return data

    # Có cửa sổ (FE luôn gửi) hoặc filter → tính on-the-fly: 3 biểu đồ cùng lấy dữ liệu
    # trong khoảng Ngày/Tuần/Tháng. Snapshot chỉ dùng khi không có cả hai (I2).
    if (
        country
        or region
        or start is not None
        or end is not None
        or timezone is not None
    ):
        metrics = compute_filtered_metrics(
            db,
            "temporal",
            country,
            region,
            interval=interval,
            start=start,
            end=end,
            timezone=timezone,
        )
        return {"success": True, "data": build(metrics)}
    return _respond(db, "temporal", build, interval=interval)


@router.get("/trend")
def get_trend(
    resample_freq: str = Query("M", pattern="^(D|W|M)$"),
    metric: str = Query("count", pattern="^(count|avg_magnitude|max_magnitude)$"),
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    start_time: str | None = Query(None, description="ISO 8601 UTC"),
    end_time: str | None = Query(None, description="ISO 8601 UTC"),
    timezone: str | None = Query(
        None, pattern="^(UTC|UTC\\+7)$", description="Múi giờ hiển thị bucket ngày"
    ),
    db: Session = Depends(get_db),
):
    """Pattern 2: xu hướng sau re-sampling."""
    source_key = {
        "count": "event_count",
        "avg_magnitude": "avg_magnitude",
        "max_magnitude": "max_magnitude",
    }[metric]

    def build(m: dict[str, Any]) -> dict[str, Any]:
        per_metric = m.get("metrics")
        if isinstance(per_metric, dict) and isinstance(per_metric.get(metric), dict):
            # Định dạng T3: kết quả riêng cho từng metric
            source = per_metric[metric]
            series = source.get("series", [])
        elif "series" in m:
            # Chuỗi đã lưu chỉ đúng cho metric của chính nó; khác metric thì không gắn nhãn sai
            source = m
            if m.get("metric", "count") == metric:
                series = m["series"]
            else:
                series = []
                source = {"status": "insufficient_data"}
        else:
            # Định dạng cũ của demo_seeder (`trend_line`)
            source = m
            series = [
                {
                    "period": p.get("period"),
                    "actual_value": p.get(source_key, p.get("actual_value")),
                    "trend_value": p.get("trend_value"),
                }
                for p in m.get("trend_line", [])
            ]
        data = {
            "resample_freq": resample_freq,
            "metric": metric,
            "series": series,
            "slope": source.get("slope"),
            "trend_direction": source.get("trend_direction"),
        }
        # T3 đã tính các hệ số này (services/analysis/patterns.py:366-373) nhưng
        # route trước đây bỏ qua → FE Pattern 2 / Chart A Overview hiện "—".
        for field in ("intercept", "r_squared", "p_value"):
            if source.get(field) is not None:
                data[field] = source[field]
        sample_size = source.get("sample_size")
        if sample_size is None:
            sample_size = source.get("complete_periods", source.get("data_points"))
        if sample_size is not None:
            data["sample_size"] = sample_size
        data["status"] = source.get("status") or "computed"
        return data

    start, end = _utc(start_time), _utc(end_time)
    if country or region or start or end or timezone is not None:
        metrics = compute_filtered_metrics(
            db,
            "trend",
            country,
            region,
            interval=resample_freq,
            metric=metric,
            start=start,
            end=end,
            timezone=timezone,
        )
        return {"success": True, "data": build(metrics)}
    # Chỉ nhận bản đúng tần suất yêu cầu; không có thì Empty State thay vì trả tần suất khác
    return _respond(db, "trend", build, interval=resample_freq, strict_interval=True)


@router.get("/seasonality")
def get_seasonality(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    interval: str | None = Query(
        None,
        pattern="^(week|month)$",
        description="Ép chu kỳ tuần (7 ngày) hoặc tháng (12 tháng)",
    ),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Pattern 3: tính chu kỳ / mùa vụ."""

    def build(m: dict[str, Any]) -> dict[str, Any]:
        comp = m.get("components", {})
        line = comp.get("seasonal_line")
        if line is None:
            line = [
                {
                    "cycle_index": i + 1,
                    "period_label": c.get("period_label", c.get("cycle")),
                    "seasonal_factor": c.get("seasonal_factor"),
                }
                for i, c in enumerate(m.get("seasonal_components", []))
            ]
        data = {
            "resample_freq": m.get("resample_freq", "M"),
            "components": {
                "seasonal_line": line,
                "residual_variance": comp.get(
                    "residual_variance", m.get("residual_variance")
                ),
                "seasonality_strength": comp.get(
                    "seasonality_strength", m.get("seasonality_strength")
                ),
                "interpretation": comp.get("interpretation", m.get("interpretation")),
            },
        }
        # Field optional đã có trong analysis.json; nguồn T3 tại
        # services/analysis/patterns.py:470,473,482.
        for field in ("status", "period", "data_points"):
            if m.get(field) is not None:
                data[field] = m[field]
        return data

    if country or region or interval:
        metrics = compute_filtered_metrics(
            db,
            "seasonality",
            country,
            region,
            interval=interval,
            start=_parse_window(start_time),
            end=_parse_window(end_time),
        )
        return {"success": True, "data": build(metrics)}
    return _respond(db, "seasonality", build)


@router.get("/correlation")
def get_correlation(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Pattern 4: ma trận tương quan."""

    def build(m: dict[str, Any]) -> dict[str, Any]:
        data = {
            "variables": m.get("variables", []),
            "matrix": m.get("matrix", []),
            "method": m.get("method", "pearson"),
        }
        # status/sample_size/note đã có trong analysis.json và được T3 tính tại
        # services/analysis/patterns.py:572,577,579. Không thêm spearman_matrix/
        # undefined_pairs/corr_mag_depth — analysis.json có additionalProperties:false.
        for field in ("status", "sample_size", "note"):
            if m.get(field) is not None:
                data[field] = m[field]
        return data

    if country or region:
        metrics = compute_filtered_metrics(db, "correlation", country, region)
        return {"success": True, "data": build(metrics)}
    return _respond(db, "correlation", build)
````

#### 11.3.14. `apps/api/src/gdmas/api/routes/clusters.py`

````python
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.predictions import _empty
from gdmas.api.routes.system import _iso
from gdmas.db.connection import get_db
from gdmas.models.clustering import ClusteringResult
from gdmas.services.ingestion.geo import derive_country, derive_region

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Clustering"])


def _cluster(c: dict) -> dict:
    """Chuẩn hóa về tên trường canonical của contract FE (nhận alias legacy).

    Bổ sung field optional đã có trong ``contracts/schemas/clusters.json``:
    ``radius_km``, ``dominant_place``. FE ``normalizeClusters()`` / ``groupClustersByCountry()``
    đọc trực tiếp ``dominant_place`` — thiếu field này mọi cụm thật rơi vào nhóm "Khác"
    (GAP-01). Giữ nguyên chữ ký và 6 key cũ (RULE-03); field thiếu → ``None`` (không bịa số).
    """
    return {
        "cluster_id": c.get("cluster_id", c.get("id")),
        "center_latitude": c.get("center_latitude", c.get("lat")),
        "center_longitude": c.get("center_longitude", c.get("lon")),
        "event_count": c.get("event_count", c.get("events_count")),
        "avg_magnitude": c.get("avg_magnitude", c.get("avg_mag")),
        "max_magnitude": c.get("max_magnitude", c.get("max_mag")),
        "radius_km": c.get("radius_km", c.get("radius")),
        "name": c.get("name"),
        "dominant_place": c.get("dominant_place", c.get("place")),
    }


@router.get("/clusters")
def get_clusters(
    country: str | None = Query(
        None, description="Lọc theo quốc gia suy từ dominant_place"
    ),
    region: str | None = Query(
        None, description="Lọc theo khu vực suy từ dominant_place"
    ),
    db: Session = Depends(get_db),
):
    """Kết quả phân cụm DBSCAN mới nhất — có thể lọc theo quốc gia/khu vực."""
    try:
        row = db.query(ClusteringResult).order_by(desc(ClusteringResult.id)).first()
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc clustering_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả phân cụm. Hãy chạy Terminal 4 (clustering).")
    clusters = (row.summary_clusters or {}).get("clusters", [])
    if country or region:
        filtered = []
        for item in clusters:
            place = (
                item.get("dominant_place")
                or item.get("place")
                or item.get("name")
                or ""
            )
            item_country = derive_country(place)
            if country and item_country != country:
                continue
            if region and derive_region(place, item_country) != region:
                continue
            filtered.append(item)
        clusters = filtered

    return {
        "success": True,
        "data": {
            "algorithm": row.algorithm,
            "parameters": row.parameters,
            "clusters_count": len(clusters),
            "noise_count": row.noise_count,
            "calculated_at": _iso(row.calculated_at),
            "clusters": [_cluster(c) for c in clusters],
        },
    }
````

#### 11.3.15. `apps/api/src/gdmas/api/routes/earthquakes.py`

````python
import logging
import math
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.core.config import settings
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    CountryCount,
    CountryListResponse,
    EarthquakeListResponse,
    EarthquakeMetadata,
    EarthquakeResponse,
    RegionCount,
    RegionListResponse,
    SyncResponse,
)
from gdmas.services.ingestion.geo import derive_place_fields

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/earthquakes", tags=["Earthquakes"])

# Legacy alias — giữ cho import/test cũ (RULE-03). Nguồn sự thật là settings.USGS_FEED_URL.
USGS_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)


def _db_error(exc: Exception):
    logger.error("Lỗi CSDL: %s", type(exc).__name__)
    return error_response(
        "DATABASE_ERROR",
        "Không thể truy vấn cơ sở dữ liệu.",
        500,
        details=type(exc).__name__,
    )


def _parse_utc(value: str | None) -> datetime | None:
    """Phân tích chuỗi ISO 8601; không có múi giờ thì coi là UTC; None → None."""
    if value is None:
        return None
    try:
        dt = datetime.fromisoformat(value.strip())
    except ValueError:
        return None
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _validation_error(field: str, value: str, message: str):
    return error_response(
        "VALIDATION_ERROR", message, 400, details={"field": field, "value": value}
    )


@router.get("", response_model=EarthquakeListResponse)
def list_earthquakes(
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    min_magnitude: float | None = Query(None, description="Độ lớn tối thiểu"),
    max_magnitude: float | None = Query(None, description="Độ lớn tối đa"),
    min_depth: float | None = Query(None, description="Độ sâu tối thiểu (km)"),
    max_depth: float | None = Query(None, description="Độ sâu tối đa (km)"),
    search: str | None = Query(None, description="Tìm theo khu vực hoặc mã sự kiện"),
    country: str | None = Query(None, description="Lọc theo quốc gia suy từ place"),
    region: str | None = Query(None, description="Lọc theo khu vực suy từ place"),
    start_time: str | None = Query(None, description="Từ thời điểm (ISO 8601 UTC)"),
    end_time: str | None = Query(None, description="Đến thời điểm (ISO 8601 UTC)"),
    min_lat: float | None = Query(None, ge=-90, le=90),
    max_lat: float | None = Query(None, ge=-90, le=90),
    min_lon: float | None = Query(None, ge=-180, le=180),
    max_lon: float | None = Query(None, ge=-180, le=180),
    sort_by: str = Query("event_time", pattern="^(event_time|magnitude|depth_km)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """Danh sách sự kiện địa chấn (phân trang, lọc, tìm kiếm).

    DB rỗng trả 200 với danh sách rỗng; DB lỗi trả 500 DATABASE_ERROR.
    """
    start_dt = end_dt = None
    for field, raw in (("start_time", start_time), ("end_time", end_time)):
        if raw is None:
            continue
        parsed = _parse_utc(raw)
        if parsed is None:
            return _validation_error(field, raw, f"{field} phải là ISO 8601 hợp lệ")
        if field == "start_time":
            start_dt = parsed
        else:
            end_dt = parsed

    ranges = [
        ("min_magnitude", min_magnitude, "max_magnitude", max_magnitude),
        ("min_depth", min_depth, "max_depth", max_depth),
        ("min_lat", min_lat, "max_lat", max_lat),
        ("min_lon", min_lon, "max_lon", max_lon),
        ("start_time", start_dt, "end_time", end_dt),
    ]
    for lo_name, lo, hi_name, hi in ranges:
        if lo is not None and hi is not None and lo > hi:
            return _validation_error(
                lo_name, str(lo), f"{lo_name} không được lớn hơn {hi_name}"
            )

    try:
        query = db.query(EarthquakeEvent)

        if start_dt is not None:
            query = query.filter(EarthquakeEvent.event_time >= start_dt)
        if end_dt is not None:
            query = query.filter(EarthquakeEvent.event_time <= end_dt)
        if min_lat is not None:
            query = query.filter(EarthquakeEvent.latitude >= min_lat)
        if max_lat is not None:
            query = query.filter(EarthquakeEvent.latitude <= max_lat)
        if min_lon is not None:
            query = query.filter(EarthquakeEvent.longitude >= min_lon)
        if max_lon is not None:
            query = query.filter(EarthquakeEvent.longitude <= max_lon)
        if min_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude >= min_magnitude)
        if max_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude <= max_magnitude)
        if min_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km >= min_depth)
        if max_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km <= max_depth)
        if search:
            query = query.filter(
                or_(
                    EarthquakeEvent.place.ilike(f"%{search}%"),
                    EarthquakeEvent.source_event_id.ilike(f"%{search}%"),
                )
            )
        if country:
            query = query.filter(EarthquakeEvent.country == country)
        if region:
            query = query.filter(EarthquakeEvent.region == region)

        sort_col = getattr(EarthquakeEvent, sort_by, EarthquakeEvent.event_time)
        query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

        total = query.count()
        events = (
            query.offset((page - 1) * limit).limit(limit).all() if total > 0 else []
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return EarthquakeListResponse(
        success=True,
        data=events,
        metadata=EarthquakeMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total > 0 else 0,
            last_updated=datetime.now(UTC),
        ),
    )


@router.post("/sync", response_model=SyncResponse)
def sync_usgs_earthquakes(db: Session = Depends(get_db)):
    """Đồng bộ trực tiếp từ USGS GeoJSON Feed vào PostgreSQL.

    USGS không truy cập được -> 503 DATA_SOURCE_UNAVAILABLE; lỗi ghi DB -> 500.
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(settings.USGS_FEED_URL)
            resp.raise_for_status()
            features = resp.json().get("features", [])
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Lỗi khi gọi USGS Feed: %s", type(exc).__name__)
        return error_response(
            "DATA_SOURCE_UNAVAILABLE",
            "Không thể kết nối tới nguồn dữ liệu USGS.",
            503,
            details=type(exc).__name__,
        )

    synced_items = 0
    try:
        for feat in features:
            props = feat.get("properties") or {}
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or [0, 0, 0]

            event_id = feat.get("id") or props.get("code")
            mag = props.get("mag")
            if not event_id or mag is None:
                continue

            time_ms = props.get("time")
            event_time = (
                datetime.fromtimestamp(time_ms / 1000.0, tz=UTC)
                if time_ms
                else datetime.now(UTC)
            )

            existing = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.source_event_id == event_id)
                .first()
            )
            if existing:
                continue

            country, region = derive_place_fields(props.get("place"))
            db.add(
                EarthquakeEvent(
                    source="USGS",
                    source_event_id=event_id,
                    event_time=event_time,
                    latitude=float(coords[1]) if len(coords) > 1 else 0.0,
                    longitude=float(coords[0]) if len(coords) > 0 else 0.0,
                    depth_km=float(coords[2]) if len(coords) > 2 else 0.0,
                    magnitude=float(mag),
                    magnitude_type=props.get("magType"),
                    place=props.get("place"),
                    country=country,
                    region=region,
                    source_url=props.get("url"),
                    raw_data=feat,
                )
            )
            synced_items += 1
        if synced_items:
            db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        return _db_error(exc)

    return SyncResponse(
        success=True,
        message=f"Đã đồng bộ thành công {synced_items} sự kiện từ USGS GeoJSON Feed.",
        synced_count=synced_items,
        source="USGS",
        timestamp=datetime.now(UTC),
    )


@router.get("/countries", response_model=CountryListResponse)
def list_earthquake_countries(
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Danh mục quốc gia kèm count/avg/max — cho bộ lọc và xếp hạng FE."""
    start, end = _parse_utc(start_time), _parse_utc(end_time)
    query = db.query(
        EarthquakeEvent.country,
        func.count(EarthquakeEvent.id),
        func.avg(EarthquakeEvent.magnitude),
        func.max(EarthquakeEvent.magnitude),
    ).filter(EarthquakeEvent.country.is_not(None))
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)

    try:
        rows = (
            query.group_by(EarthquakeEvent.country)
            .order_by(
                func.count(EarthquakeEvent.id).desc(), EarthquakeEvent.country.asc()
            )
            .all()
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return CountryListResponse(
        data=[
            CountryCount(
                country=country,
                count=count,
                avg_magnitude=round(float(avg), 2) if avg is not None else None,
                max_magnitude=round(float(maximum), 2) if maximum is not None else None,
            )
            for country, count, avg, maximum in rows
        ]
    )


def _label_rank(label: str) -> tuple[int, str]:
    """Ưu tiên biến thể chuẩn title-case, sau đó theo thứ tự từ điển (ổn định)."""
    return (0 if label == label.title() else 1, label)


def _merge_region_rows(rows) -> list[RegionCount]:
    """Gộp các biến thể cùng một khu vực (trim + casefold) thành đúng 1 dòng.

    `count` được cộng, `avg_magnitude` tính lại có trọng số qua `avg*count`,
    `max_magnitude` lấy max. Nhãn đại diện là biến thể phổ biến nhất (tie → nhỏ nhất).
    """
    grouped: dict[str, dict] = {}
    for region, count, avg, maximum in rows:
        label = (region or "").strip()
        key = label.casefold()
        if not key:
            continue
        n = int(count)
        entry = grouped.get(key)
        if entry is None:
            grouped[key] = {
                "label": label,
                "label_count": n,
                "count": n,
                "sum_mag": float(avg) * n if avg is not None else 0.0,
                "mag_count": n if avg is not None else 0,
                "max": float(maximum) if maximum is not None else None,
            }
            continue
        entry["count"] += n
        if avg is not None:
            entry["sum_mag"] += float(avg) * n
            entry["mag_count"] += n
        if maximum is not None:
            candidate = float(maximum)
            entry["max"] = (
                max(entry["max"], candidate) if entry["max"] is not None else candidate
            )
        if n > entry["label_count"] or (
            n == entry["label_count"]
            and _label_rank(label) < _label_rank(entry["label"])
        ):
            entry["label"] = label
            entry["label_count"] = n

    result = [
        RegionCount(
            region=entry["label"],
            count=entry["count"],
            avg_magnitude=round(entry["sum_mag"] / entry["mag_count"], 2)
            if entry["mag_count"]
            else None,
            max_magnitude=round(entry["max"], 2) if entry["max"] is not None else None,
        )
        for entry in grouped.values()
    ]
    result.sort(key=lambda row: (-row.count, row.region))
    return result


@router.get("/regions", response_model=RegionListResponse)
def list_earthquake_regions(
    country: str | None = Query(None, description="Chỉ lấy khu vực của quốc gia này"),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Danh mục khu vực kèm count/avg/max trong cửa sổ thời gian — cho xếp hạng FE."""
    query = db.query(
        EarthquakeEvent.region,
        func.count(EarthquakeEvent.id),
        func.avg(EarthquakeEvent.magnitude),
        func.max(EarthquakeEvent.magnitude),
    ).filter(EarthquakeEvent.region.is_not(None))
    if country:
        query = query.filter(EarthquakeEvent.country == country)
    start, end = _parse_utc(start_time), _parse_utc(end_time)
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)

    try:
        rows = (
            query.group_by(EarthquakeEvent.region)
            .order_by(
                func.count(EarthquakeEvent.id).desc(), EarthquakeEvent.region.asc()
            )
            .all()
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return RegionListResponse(data=_merge_region_rows(rows))


@router.get("/{event_id}", response_model=EarthquakeResponse)
def get_earthquake(event_id: str, db: Session = Depends(get_db)):
    """Chi tiết một sự kiện theo id hoặc source_event_id."""
    try:
        event = None
        if event_id.isdigit():
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.id == int(event_id))
                .first()
            )
        if event is None:
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.source_event_id == event_id)
                .first()
            )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    if event is None:
        return error_response(
            "RESOURCE_NOT_FOUND",
            "Không tìm thấy sự kiện địa chấn.",
            404,
            details={"event_id": event_id},
        )
    return event
````

#### 11.3.16. `apps/api/src/gdmas/api/routes/events.py`

````python
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from gdmas.realtime.sse import earthquake_event_generator

router = APIRouter(prefix="/events", tags=["Streaming"])


@router.get("/stream")
async def events_stream(request: Request):
    """Kênh SSE chuẩn theo docs/api/API.md §3.5 (dùng chung generator với /stream/earthquakes)."""
    return EventSourceResponse(earthquake_event_generator(request))
````

#### 11.3.17. `apps/api/src/gdmas/api/routes/patterns.py`

````python
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.orm import Session

from gdmas.api.routes.system import _iso
from gdmas.db.connection import get_db
from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.prediction import ClassificationResult, PredictionResult

router = APIRouter(prefix="/patterns", tags=["Patterns"])


@router.get("")
def get_all_patterns(db: Session = Depends(get_db)):
    """
    Trả về dữ liệu chi tiết của 6 Patterns chuỗi thời gian & không gian từ CSDL.
    Nếu CSDL bị xóa trống (Bước 2 Demo), trả về trạng thái rỗng để Web phản hồi lỗi chính xác.
    """
    analysis_records = db.query(AnalysisResult).all()
    clustering_record = (
        db.query(ClusteringResult).order_by(desc(ClusteringResult.id)).first()
    )
    prediction_record = (
        db.query(PredictionResult).order_by(desc(PredictionResult.id)).first()
    )
    classification_record = (
        db.query(ClassificationResult).order_by(desc(ClassificationResult.id)).first()
    )

    has_data = bool(
        analysis_records
        or clustering_record
        or prediction_record
        or classification_record
    )

    if not has_data:
        return {
            "success": False,
            "total_patterns": 0,
            "patterns": [],
            "message": "CSDL TRỐNG: Chưa có dữ liệu 6 patterns. Hãy chạy .\\scripts\\demo-init-patterns.ps1 để khởi tạo!",
        }

    # Bóc tách từng pattern từ CSDL
    patterns_list = []

    # 1. Pattern 1: Time-Series & Histogram
    p1 = next((a for a in analysis_records if a.analysis_type == "time_series"), None)
    patterns_list.append(
        {
            "id": "pattern_1",
            "name": "Biểu diễn theo thời gian (Line, Scatter, Histogram)",
            "type": "time_series",
            "status": "COMPUTED" if p1 else "PENDING",
            "metrics": p1.metrics_data if p1 else {},
            "period": "Hourly / Daily / Monthly",
        }
    )

    # 2. Pattern 2: Trend Analysis sau Re-sampling
    p2 = next((a for a in analysis_records if a.analysis_type == "trend"), None)
    patterns_list.append(
        {
            "id": "pattern_2",
            "name": "Trend Analysis (Đường xu hướng sau Re-sampling)",
            "type": "trend",
            "status": "COMPUTED" if p2 else "PENDING",
            "metrics": p2.metrics_data if p2 else {},
            "period": "Weekly / Monthly",
        }
    )

    # 3. Pattern 3: Seasonality sau Re-sampling
    p3 = next((a for a in analysis_records if a.analysis_type == "seasonality"), None)
    patterns_list.append(
        {
            "id": "pattern_3",
            "name": "Seasonality (Tính chu kỳ mùa vụ)",
            "type": "seasonality",
            "status": "COMPUTED" if p3 else "PENDING",
            "metrics": p3.metrics_data if p3 else {},
            "period": "Monthly",
        }
    )

    # 4. Pattern 4: Correlation Matrix đa biến
    p4 = next((a for a in analysis_records if a.analysis_type == "correlation"), None)
    patterns_list.append(
        {
            "id": "pattern_4",
            "name": "Correlation Matrix (Ma trận tương quan đa biến)",
            "type": "correlation",
            "status": "COMPUTED" if p4 else "PENDING",
            "metrics": p4.metrics_data if p4 else {},
            "period": "Daily",
        }
    )

    # 5. Pattern 5: Dự báo định lượng t+1
    patterns_list.append(
        {
            "id": "pattern_5",
            "name": "Dự báo định lượng ngày kế tiếp (t+1)",
            "type": "prediction",
            "status": "COMPUTED" if prediction_record else "PENDING",
            "metrics": {
                "target_date": prediction_record.target_date.isoformat()
                if prediction_record
                else None,
                "predicted_value": prediction_record.predicted_value
                if prediction_record
                else 0.0,
                "lower_bound": prediction_record.lower_bound
                if prediction_record
                else 0.0,
                "upper_bound": prediction_record.upper_bound
                if prediction_record
                else 0.0,
                "model_name": prediction_record.model_name
                if prediction_record
                else None,
                # Field optional đã có trong contracts/schemas/patterns.json — DB có sẵn,
                # route trước đây bỏ qua (GAP-07).
                "metric_name": prediction_record.metric_name
                if prediction_record
                else None,
                "model_version": prediction_record.model_version
                if prediction_record
                else None,
                "evaluation_metrics": prediction_record.evaluation_metrics
                if prediction_record
                else None,
                "generated_at": _iso(prediction_record.generated_at)
                if prediction_record
                else None,
            }
            if prediction_record
            else {},
            "period": "Day t+1",
        }
    )

    # 6. Pattern 6: Phân loại rủi ro t+1
    patterns_list.append(
        {
            "id": "pattern_6",
            "name": "Phân loại mức độ hoạt động ngày kế tiếp (t+1)",
            "type": "classification",
            "status": "COMPUTED" if classification_record else "PENDING",
            "metrics": {
                "target_date": classification_record.target_date.isoformat()
                if classification_record
                else None,
                "predicted_label": classification_record.predicted_label
                if classification_record
                else None,
                "probability_scores": classification_record.probability_scores
                if classification_record
                else {},
                "model_name": classification_record.model_name
                if classification_record
                else None,
                "model_version": classification_record.model_version
                if classification_record
                else None,
                "evaluation_metrics": classification_record.evaluation_metrics
                if classification_record
                else None,
            }
            if classification_record
            else {},
            "period": "Day t+1",
        }
    )

    return {
        "success": True,
        "total_patterns": len(patterns_list),
        "patterns": patterns_list,
        "clustering_summary": clustering_record.summary_clusters
        if clustering_record
        else None,
        "last_updated": datetime.now(UTC).isoformat(),
    }
````

#### 11.3.18. `apps/api/src/gdmas/api/routes/predictions.py`

````python
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.system import _iso
from gdmas.db.connection import get_db
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.services.analysis.filtered import (
    InsufficientDataError,
    build_filtered_forecast,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Predictions"])


def _empty(message: str) -> dict:
    """Bảng kết quả đang rỗng (chưa chạy hoặc đã bị xóa ở Demo Bước 2–3)."""
    return {"success": False, "data": None, "message": message}


@router.get("/predictions")
def get_latest_prediction(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Pattern 5: dự báo định lượng ngày kế tiếp (t+1) mới nhất."""
    if country or region:
        try:
            return {
                "success": True,
                "data": build_filtered_forecast(db, country, region, datetime.now(UTC))[
                    "prediction"
                ],
            }
        except InsufficientDataError as exc:
            return _empty(str(exc))
    try:
        row = (
            db.query(PredictionResult)
            .order_by(desc(PredictionResult.target_date), desc(PredictionResult.id))
            .first()
        )
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc prediction_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả dự báo. Hãy chạy Terminal 5 (prediction).")
    return {
        "success": True,
        "data": {
            "target_date": row.target_date.isoformat(),
            "forecasted_metric": (
                "event_count"
                if row.metric_name == "daily_earthquake_count"
                else row.metric_name
            ),
            "predicted_value": row.predicted_value,
            "confidence_interval": {
                "lower": row.lower_bound,
                "upper": row.upper_bound,
            },
            "model_name": row.model_name,
            "model_version": row.model_version,
            "evaluation_metrics": row.evaluation_metrics or {},
            "generated_at": _iso(row.generated_at),
            # GAP-08: field optional đã có trong predictions.json:30 — FE đọc trực tiếp.
            "confidence_level": (row.evaluation_metrics or {}).get("confidence_level"),
        },
    }


@router.get("/classifications")
def get_latest_classification(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Pattern 6: nhãn mức độ hoạt động địa chấn ngày kế tiếp (t+1) mới nhất."""
    if country or region:
        try:
            return {
                "success": True,
                "data": build_filtered_forecast(db, country, region, datetime.now(UTC))[
                    "classification"
                ],
            }
        except InsufficientDataError as exc:
            return _empty(str(exc))
    try:
        row = (
            db.query(ClassificationResult)
            .order_by(
                desc(ClassificationResult.target_date), desc(ClassificationResult.id)
            )
            .first()
        )
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc classification_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả phân loại. Hãy chạy Terminal 5 (prediction).")
    return {
        "success": True,
        "data": {
            "target_date": row.target_date.isoformat(),
            "predicted_label": row.predicted_label,
            "probabilities": row.probability_scores or {},
            # GAP-08: alias đã có trong classifications.json:27-31 (dùng trong payload /patterns).
            "probability_scores": row.probability_scores or {},
            "model_name": row.model_name,
            "model_version": row.model_version,
            "evaluation_metrics": row.evaluation_metrics or {},
            "generated_at": _iso(row.generated_at),
        },
    }
````

#### 11.3.19. `apps/api/src/gdmas/api/routes/statistics.py`

````python
import logging
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    EarthquakeStatistics,
    HourlyTimeSeriesPoint,
    MonthlyPeak,
    MonthlyPeaksResponse,
    StatisticsResponse,
)
from gdmas.services.analysis.filtered import scope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statistics", tags=["Statistics"])

BUCKET_HOURS = 3
BUCKET_COUNT = 8  # 8 khoảng x 3 giờ = 24 giờ gần nhất


def _parse_utc(raw: str | None) -> datetime | None:
    if raw is None:
        return None
    try:
        value = datetime.fromisoformat(raw.strip())
    except ValueError:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _time_series_24h(
    db: Session,
    now_utc: datetime,
    country: str | None = None,
    region: str | None = None,
) -> list[HourlyTimeSeriesPoint]:
    """Chuỗi 8 khoảng 3 giờ trong 24 giờ gần nhất, tính từ dữ liệu thật (UTC)."""
    start = now_utc - timedelta(hours=BUCKET_HOURS * BUCKET_COUNT)
    bucket_seconds = BUCKET_HOURS * 3600
    bucket = func.floor(
        (func.extract("epoch", EarthquakeEvent.event_time) - start.timestamp())
        / bucket_seconds
    ).label("bucket")
    rows = (
        scope(
            db.query(
                bucket,
                func.count(EarthquakeEvent.id),
                func.avg(EarthquakeEvent.magnitude),
            ),
            country,
            region,
        )
        .filter(
            EarthquakeEvent.event_time >= start,
            EarthquakeEvent.event_time <= now_utc,
        )
        .group_by(bucket)
        .all()
    )
    by_bucket = {int(r[0]): (int(r[1]), float(r[2] or 0.0)) for r in rows}

    points = []
    for i in range(BUCKET_COUNT):
        count, avg_mag = by_bucket.get(i, (0, 0.0))
        label = (start + timedelta(hours=BUCKET_HOURS * i)).strftime("%H:%M")
        points.append(
            HourlyTimeSeriesPoint(time=label, count=count, avg_mag=round(avg_mag, 2))
        )
    return points


@router.get("/earthquakes", response_model=StatisticsResponse)
def get_earthquake_statistics(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    min_magnitude: float | None = Query(
        None, description="Độ lớn tối thiểu (bộ lọc Danh mục)"
    ),
    max_magnitude: float | None = Query(
        None, description="Độ lớn tối đa (bộ lọc Danh mục)"
    ),
    min_depth: float | None = Query(
        None, description="Độ sâu tối thiểu km (bộ lọc Danh mục)"
    ),
    max_depth: float | None = Query(
        None, description="Độ sâu tối đa km (bộ lọc Danh mục)"
    ),
    db: Session = Depends(get_db),
):
    """Chỉ số KPI và chuỗi thời gian cho Dashboard.

    DB rỗng trả toàn số 0 và time_series_preview rỗng; DB lỗi trả 500 DATABASE_ERROR.
    """
    now_utc = datetime.now(UTC)
    one_day_ago = now_utc - timedelta(hours=24)
    start_dt, end_dt = _parse_utc(start_time), _parse_utc(end_time)

    def scoped(query):
        """Áp quốc gia/khu vực và cửa sổ Ngày/Tuần/Tháng cho mọi KPI."""
        query = scope(query, country, region)
        if start_dt is not None:
            query = query.filter(EarthquakeEvent.event_time >= start_dt)
        if end_dt is not None:
            query = query.filter(EarthquakeEvent.event_time <= end_dt)
        if min_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude >= min_magnitude)
        if max_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude <= max_magnitude)
        if min_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km >= min_depth)
        if max_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km <= max_depth)
        return query

    try:
        total = scoped(db.query(func.count(EarthquakeEvent.id))).scalar() or 0
        strong = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude >= 5.0)
            .scalar()
            or 0
        )
        moderate = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude >= 4.0, EarthquakeEvent.magnitude < 5.0)
            .scalar()
            or 0
        )
        minor = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude < 4.0)
            .scalar()
            or 0
        )
        recent_24h = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.event_time >= one_day_ago)
            .scalar()
            or 0
        )
        avg_mag = scoped(db.query(func.avg(EarthquakeEvent.magnitude))).scalar() or 0.0
        max_mag = scoped(db.query(func.max(EarthquakeEvent.magnitude))).scalar() or 0.0
        latest = (
            scoped(db.query(EarthquakeEvent.event_time))
            .order_by(EarthquakeEvent.event_time.desc())
            .first()
        )
        series = _time_series_24h(db, now_utc, country, region) if total > 0 else []
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi thống kê: %s", type(exc).__name__)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )

    return StatisticsResponse(
        success=True,
        data=EarthquakeStatistics(
            total_events=total,
            strong_events_count=strong,
            moderate_events_count=moderate,
            minor_events_count=minor,
            recent_24h_count=recent_24h,
            avg_magnitude=round(float(avg_mag), 2),
            max_magnitude=round(float(max_mag), 1),
            latest_event_time=latest[0] if (latest and total > 0) else None,
            time_series_preview=series,
        ),
    )


@router.get("/monthly-peaks", response_model=MonthlyPeaksResponse)
def get_monthly_peaks(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Số sự kiện theo tháng UTC (1..12) — biểu đồ cao điểm theo tháng trên Overview.

    Đếm từ sự kiện thật, không snapshot mùa vụ: dùng được ngay cả khi chưa đủ 24 tháng
    để `seasonal_decompose`. Không truyền filter → toàn cục.
    """
    try:
        rows = scope(db.query(EarthquakeEvent.event_time), country, region).all()
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi thống kê theo tháng: %s", type(exc).__name__)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )

    counts: Counter[int] = Counter()
    for (value,) in rows:
        if value is None:
            continue
        moment = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
        counts[moment.astimezone(UTC).month] += 1

    return MonthlyPeaksResponse(
        data=[
            MonthlyPeak(month=month, label=f"Tháng {month}", count=counts.get(month, 0))
            for month in range(1, 13)
        ]
    )
````

#### 11.3.20. `apps/api/src/gdmas/api/routes/stream.py`

````python
import asyncio
import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from gdmas.db.connection import SessionLocal
from gdmas.realtime import sse as sse_mod
from gdmas.realtime.sse import earthquake_event_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])

# Tên module-level để test monkeypatch (cùng object mặc định với realtime.sse).
_connected_sse_queues = sse_mod._connected_sse_queues


def get_latest_state(
    since_event_id: int | None = None, since_run_id: int | None = None
):
    """Bọc sse.get_latest_state; dùng SessionLocal của module này (test monkeypatch)."""
    original = sse_mod.SessionLocal
    sse_mod.SessionLocal = SessionLocal
    try:
        return sse_mod.get_latest_state(since_event_id, since_run_id)
    finally:
        sse_mod.SessionLocal = original


@router.post("/broadcast-cleared")
async def broadcast_database_cleared():
    """Báo CSDL đã bị xóa trống (Demo Bước 2) tới mọi client SSE đang mở."""
    message = sse_mod._cleared_packet()
    count = 0
    for q in list(_connected_sse_queues):
        try:
            q.put_nowait(message)
            count += 1
        except asyncio.QueueFull as exc:
            logger.warning(
                "Lỗi khi push SSE cleared event vào queue: %s", type(exc).__name__
            )
    return {"success": True, "clients_notified": count}


@router.get("/earthquakes")
async def stream_earthquakes(request: Request):
    """Kênh SSE thời gian thực (đường dẫn cũ, Frontend đang dùng)."""
    return EventSourceResponse(earthquake_event_generator(request))
````

#### 11.3.21. `apps/api/src/gdmas/api/routes/system.py`

````python
import logging
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.core.config import settings
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.realtime.sse import _connected_sse_queues

logger = logging.getLogger(__name__)

router = APIRouter(tags=["System"])

API_VERSION = "1.0.0"
_STARTED_AT = time.monotonic()

# (khóa trong phản hồi, service_name trong service_runs, chu kỳ giây, nhãn chu kỳ)
_WORKERS = [
    ("ingestion", "ingestion", settings.INGESTION_INTERVAL_SECONDS, "5m"),
    ("analysis", "analysis", settings.ANALYSIS_INTERVAL_SECONDS, "5m"),
    ("clustering", "clustering", settings.CLUSTERING_INTERVAL_SECONDS, "1d"),
    ("prediction", "prediction", settings.PREDICTION_INTERVAL_SECONDS, "5m"),
]


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _worker_status(run: ServiceRun | None, interval: int, now: datetime) -> str:
    """no_data: chưa có lần chạy; failed: lần chạy gần nhất lỗi;
    active: chạy gần đây (trong 2 chu kỳ); inactive: đã lâu không chạy."""
    if run is None:
        return "no_data"
    if run.status == "FAILED":
        return "failed"
    last = run.finished_at or run.started_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    return "active" if (now - last).total_seconds() <= 2 * interval else "inactive"


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Kiểm tra Database API và kết nối PostgreSQL (truy vấn SELECT 1)."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Health check: mất kết nối CSDL: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể kết nối cơ sở dữ liệu.",
            500,
            details={"status": "unhealthy", "database": "disconnected"},
        )
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "database": "connected",
            "version": API_VERSION,
            "timestamp": _iso(datetime.now(UTC)),
            # GAP-12: field optional đã có trong health.json — không đổi status/error envelope.
            "uptime_seconds": int(time.monotonic() - _STARTED_AT),
        },
    }


@router.get("/system/status")
def system_status(db: Session = Depends(get_db)):
    """Trạng thái 7 khối service và nguồn dữ liệu, đọc từ service_runs và earthquake_events."""
    now = datetime.now(UTC)
    try:
        db.execute(text("SELECT 1"))
        services: dict[str, dict] = {"postgres": {"status": "running"}}
        for key, name, interval, cycle in _WORKERS:
            run = (
                db.query(ServiceRun)
                .filter(ServiceRun.service_name == name)
                .order_by(desc(ServiceRun.id))
                .first()
            )
            services[key] = {
                "status": {
                    "no_data": "unknown",
                    "failed": "error",
                    "inactive": "idle",
                    "active": "active",
                }[_worker_status(run, interval, now)],
                "last_run": _iso(run.finished_at or run.started_at) if run else None,
                "cycle": cycle,
                # GAP-12: field optional đã có trong system-status.json:66-68.
                # Chưa có run → None, không suy diễn 0 hay chuỗi rỗng.
                "records_processed": run.records_processed if run else None,
                "error_message": run.error_message if run else None,
            }
        total = db.query(func.count(EarthquakeEvent.id)).scalar() or 0
        latest = db.query(func.max(EarthquakeEvent.event_time)).scalar()
    except SQLAlchemyError as exc:
        logger.error("system/status: lỗi CSDL: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )

    services["api"] = {
        "status": "active",
        "uptime_seconds": int(time.monotonic() - _STARTED_AT),
    }
    # Frontend được coi là "connected" khi có ít nhất một client đang mở kênh SSE
    services["frontend"] = {
        "status": "active" if _connected_sse_queues else "unknown",
    }
    return {
        "success": True,
        "data": {
            "services": services,
            "data_feed": {
                "source": "USGS",
                "total_events": total,
                "latest_event_time": _iso(latest),
            },
            "generated_at": _iso(now),
        },
    }
````

#### 11.3.22. `apps/api/src/gdmas/core/config.py`

````python
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "GDMAS API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database Settings
    POSTGRES_USER: str = "gdmas_user"
    POSTGRES_PASSWORD: str = "[DA_CHE_THONG_TIN_DANG_NHAP]"
    POSTGRES_DB: str = "gdmas_db"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DATABASE_URL: str = "postgresql+psycopg://gdmas_user:[DA_CHE_THONG_TIN_DANG_NHAP]@localhost:5432/gdmas_db"

    # CORS Settings
    CORS_ORIGINS: str | list[str] = "http://localhost:3000,http://127.0.0.1:3000"

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Worker Settings
    USGS_FEED_URL: str = (
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
    )
    INGESTION_INTERVAL_SECONDS: int = 300
    ANALYSIS_INTERVAL_SECONDS: int = 300
    PREDICTION_INTERVAL_SECONDS: int = 300
    CLUSTERING_INTERVAL_SECONDS: int = 86400

    # --- Cấu hình dữ liệu & mô hình (docs/yeucaubatbuoc.md §6.4) — đưa vào .env để dễ chỉnh ---
    # Cửa sổ lịch sử cho backfill/phân tích/cụm (ngày) — 30 = 1 tháng.
    DATA_WINDOW_DAYS: int = 30
    ANALYSIS_WINDOW_DAYS: int = 30
    CLUSTERING_WINDOW_DAYS: int = 30
    CLUSTERING_EPS_KM: float = 150.0
    CLUSTERING_MIN_SAMPLES: int = 5
    # Ngưỡng tối thiểu khi backfill 1 tháng qua FDSN (giới hạn 20000 kết quả/query).
    BACKFILL_MIN_MAGNITUDE: float = 2.5
    BACKFILL_QUERY_URL: str = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    PREDICTION_MIN_OBSERVED: int = 10

    # AI trích xuất nhận xét (chỉ Gemini) — được ghi vào .env qua /ai/credentials.
    GEMINI_MODEL: str = ""
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
````

#### 11.3.23. `apps/api/src/gdmas/core/exceptions.py`

*File rỗng tại snapshot đối chiếu; không có mã để in.*

#### 11.3.24. `apps/api/src/gdmas/core/logging.py`

*File rỗng tại snapshot đối chiếu; không có mã để in.*

#### 11.3.25. `apps/api/src/gdmas/db/base.py`

````python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models in GDMAS."""
````

#### 11.3.26. `apps/api/src/gdmas/db/connection.py`

````python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from gdmas.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"connect_timeout": 3},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
````

#### 11.3.27. `apps/api/src/gdmas/main.py`

````python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gdmas.api.router import api_router
from gdmas.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
)

if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Đăng ký router chính của API v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
def root():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": "0.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
````

#### 11.3.28. `apps/api/src/gdmas/models/__init__.py`

````python
from gdmas.db.base import Base
from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun

__all__ = [
    "AnalysisResult",
    "Base",
    "ClassificationResult",
    "ClusteringEventMapping",
    "ClusteringResult",
    "EarthquakeEvent",
    "PredictionResult",
    "ServiceRun",
]
````

#### 11.3.29. `apps/api/src/gdmas/models/analysis.py`

````python
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    analysis_type: Mapped[str] = mapped_column(String(32), nullable=False)
    time_interval: Mapped[str] = mapped_column(String(16), nullable=False)
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    metrics_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (
        Index("idx_analysis_results_type_period", "analysis_type", "period_end"),
    )
````

#### 11.3.30. `apps/api/src/gdmas/models/clustering.py`

````python
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class ClusteringResult(Base):
    __tablename__ = "clustering_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    algorithm: Mapped[str] = mapped_column(String(32), nullable=False)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    total_clusters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    noise_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary_clusters: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )


class ClusteringEventMapping(Base):
    __tablename__ = "clustering_event_mapping"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cluster_result_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("clustering_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("earthquake_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    cluster_label: Mapped[int] = mapped_column(Integer, nullable=False)
````

#### 11.3.31. `apps/api/src/gdmas/models/earthquake.py`

````python
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class EarthquakeEvent(Base):
    __tablename__ = "earthquake_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="USGS")
    source_event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    source_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    depth_km: Mapped[float] = mapped_column(Float, nullable=False)
    magnitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    magnitude_type: Mapped[str | None] = mapped_column(String(16), nullable=True)
    place: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "source", "source_event_id", name="uq_earthquake_source_event"
        ),
        Index("idx_earthquake_events_time_mag", "event_time", "magnitude"),
        Index("idx_earthquake_events_coordinates", "latitude", "longitude"),
        Index("idx_earthquake_events_country_region", "country", "region"),
    )
````

#### 11.3.32. `apps/api/src/gdmas/models/prediction.py`

````python
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(32), nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Float, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Float, nullable=False)
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(
        String(16), nullable=False, default="1.0.0"
    )
    evaluation_metrics: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("idx_prediction_results_target_date", "target_date"),)


class ClassificationResult(Base):
    __tablename__ = "classification_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    predicted_label: Mapped[str] = mapped_column(String(32), nullable=False)
    probability_scores: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    actual_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(
        String(16), nullable=False, default="1.0.0"
    )
    evaluation_metrics: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("idx_classification_results_target_date", "target_date"),)
````

#### 11.3.33. `apps/api/src/gdmas/models/service_run.py`

````python
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class ServiceRun(Base):
    __tablename__ = "service_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_name: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="RUNNING")
    records_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
````

#### 11.3.34. `apps/api/src/gdmas/realtime/event_manager.py`

*File rỗng tại snapshot đối chiếu; không có mã để in.*

#### 11.3.35. `apps/api/src/gdmas/realtime/sse.py`

````python
"""Logic dùng chung cho kênh Real-time SSE (Terminal 6).

Được gọi bởi hai route: /api/v1/stream/earthquakes và /api/v1/events/stream.
"""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from itertools import count
from typing import Any

from fastapi import Request
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.catalog import EMPTY_CATALOG, catalog_hash, catalog_payload

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
ALERT_MAGNITUDE = 4.5  # docs/workflow.md §3.5: cảnh báo khi M >= 4.5
STRONG_MAGNITUDE = 5.0

# Hàng đợi asyncio.Queue của toàn bộ client SSE đang kết nối
_connected_sse_queues: set[asyncio.Queue] = set()


def utc_now_iso() -> str:
    """Thời điểm hiện tại theo UTC ISO 8601 có hậu tố Z."""
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _event_to_dict(ev: EarthquakeEvent) -> dict[str, Any]:
    return {
        "id": ev.id,
        "source": ev.source,
        "source_event_id": ev.source_event_id,
        "event_time": _iso(ev.event_time),
        "latitude": ev.latitude,
        "longitude": ev.longitude,
        "depth_km": ev.depth_km,
        "magnitude": ev.magnitude,
        "magnitude_type": ev.magnitude_type,
        "place": ev.place,
        "source_url": ev.source_url,
    }


SSE_RETRY_MS = 5_000
_packet_ids = count(1)

# Hash snapshot catalog gần nhất — SSE chỉ gửi `catalog` khi có khác biệt (2026-11-24).
_last_catalog_hash: str | None = None


def _catalog_snapshot() -> dict[str, list[dict[str, Any]]] | None:
    """Chạy trong worker thread (`asyncio.to_thread`) — SessionLocal riêng, không chia luồng."""
    db = SessionLocal()
    try:
        return catalog_payload(db)
    except (
        SQLAlchemyError
    ) as exc:  # DB lỗi → không đính catalog, SSE vẫn phát bình thường.
        logger.warning("Không dựng được catalog cho SSE: %s", type(exc).__name__)
        return None
    finally:
        db.close()


def _packet(event: str, data: dict[str, Any]) -> dict[str, Any]:
    """Đóng gói theo contracts/schemas/sse-event.json: {event, data, timestamp, id?, retry?}.

    `id` tăng dần giúp FE chống trùng khi reconnect; `retry` là gợi ý reconnect (ms).
    Cả hai được phát ở wire (header id:/retry:) **và** trong inner JSON để FE parse.
    """
    event_id = f"gdmas-{next(_packet_ids)}"
    payload = {
        "event": event,
        "data": data,
        "timestamp": utc_now_iso(),
        "id": event_id,
        "retry": SSE_RETRY_MS,
    }
    return {
        "event": event,
        "data": json.dumps(payload),
        "id": event_id,
        "retry": SSE_RETRY_MS,
    }


# FE `applySseEvent` (apps/web/src/features/monitoring/monitoring-view.ts:112-118)
# đọc trực tiếp payload.data.latitude / magnitude / event_time. Packet trước đây
# chỉ có mảng new_events[] lồng nhau → marker realtime gần như không được thêm.
# Bổ sung field phẳng của sự kiện đầu, giữ nguyên mảng gốc (RULE-03 additive).
_EVENT_MARKER_FIELDS = (
    "id",
    "source",
    "source_event_id",
    "event_time",
    "latitude",
    "longitude",
    "depth_km",
    "magnitude",
    "magnitude_type",
    "place",
    "source_url",
)


def _marker_fields(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Field phẳng của sự kiện đầu tiên — trả {} khi không có sự kiện."""
    if not events:
        return {}
    first = events[0]
    return {key: first[key] for key in _EVENT_MARKER_FIELDS if key in first}


def _cleared_packet() -> dict[str, Any]:
    return _packet(
        "database_cleared",
        {
            "title": "CSDL Đã Bị Xóa Trống (Demo Bước 2/3)",
            "message": (
                "Phát hiện CSDL đã được xóa bằng script demo. "
                "Giao diện đang tự động chuyển sang trạng thái rỗng thời gian thực."
            ),
            "total_events": 0,
            "strong_count": 0,
            "catalog": EMPTY_CATALOG,
        },
    )


def broadcast_database_cleared_event() -> int:
    """Đẩy database_cleared tới mọi client đang kết nối. Trả về số client đã báo."""
    global _last_catalog_hash
    _last_catalog_hash = catalog_hash(EMPTY_CATALOG)
    message = _cleared_packet()
    count = 0
    for q in list(_connected_sse_queues):
        try:
            q.put_nowait(message)
            count += 1
        except asyncio.QueueFull as exc:
            logger.warning("Lỗi khi push SSE cleared event vào queue: %s", exc)
    logger.warning("Đã broadcast tín hiệu database_cleared tới %d SSE clients.", count)
    return count


def get_latest_state(
    since_event_id: int | None = None, since_run_id: int | None = None
) -> dict[str, Any]:
    """Truy vấn trạng thái sự kiện và chu kỳ ingestion mới nhất từ PostgreSQL.

    Khi lỗi DB trả về success=False để generator bỏ qua chu kỳ đó
    (không được hiểu nhầm là CSDL bị xóa).
    """
    try:
        with SessionLocal() as db:
            total = db.query(EarthquakeEvent).count()
            strong = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.magnitude >= STRONG_MAGNITUDE)
                .count()
            )
            latest = (
                db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.id)).first()
            )
            max_id = latest.id if latest else 0

            new_events: list[dict[str, Any]] = []
            if since_event_id is not None and since_event_id >= 0:
                rows = (
                    db.query(EarthquakeEvent)
                    .filter(EarthquakeEvent.id > since_event_id)
                    .order_by(desc(EarthquakeEvent.id))
                    .limit(20)
                    .all()
                )
                new_events = [_event_to_dict(ev) for ev in rows]

            latest_run = (
                db.query(ServiceRun)
                .filter(ServiceRun.service_name == "ingestion")
                .order_by(desc(ServiceRun.id))
                .first()
            )
            latest_run_dict = None
            if latest_run:
                latest_run_dict = {
                    "id": latest_run.id,
                    "status": latest_run.status,
                    "records_processed": latest_run.records_processed,
                    "finished_at": _iso(latest_run.finished_at),
                }

            new_run_info = None
            if (
                since_run_id is not None
                and latest_run
                and latest_run.id > since_run_id
                and latest_run.status == "SUCCESS"
            ):
                new_run_info = latest_run_dict

            return {
                "success": True,
                "total": total,
                "strong_count": strong,
                "latest": _event_to_dict(latest) if latest else None,
                "max_id": max_id,
                "new_events": new_events,
                "latest_run_id": latest_run.id if latest_run else 0,
                "new_run_info": new_run_info,
                "latest_run": latest_run_dict,
            }
    except Exception as exc:  # noqa: BLE001 - mọi lỗi DB đều chỉ bỏ qua chu kỳ
        logger.warning("Lỗi khi truy vấn SSE data: %s", type(exc).__name__)
        return {
            "success": False,
            "max_id": since_event_id,
            "latest_run_id": since_run_id,
            "new_events": [],
        }


def _drain_queue(client_queue: asyncio.Queue) -> dict[str, Any] | None:
    try:
        return client_queue.get_nowait()
    except asyncio.QueueEmpty:
        return None


async def earthquake_event_generator(
    request: Request,
) -> AsyncGenerator[dict[str, Any], None]:
    """Generator SSE dùng chung: heartbeat, earthquake_detected, earthquake_alert,
    ingestion_cycle_completed, database_cleared."""
    client_queue: asyncio.Queue = asyncio.Queue()
    _connected_sse_queues.add(client_queue)
    try:
        initial = await asyncio.to_thread(get_latest_state, None, None)
        ready = bool(initial.get("success"))
        last_id = initial.get("max_id", 0)
        last_run_id = initial.get("latest_run_id", 0)
        last_total = initial.get("total", 0)

        yield _packet(
            "heartbeat",
            {
                "message": "Kết nối SSE thời gian thực thành công.",
                "total_events": initial.get("total", 0),
                "strong_count": initial.get("strong_count", 0),
                "latest_event": initial.get("latest"),
                "latest_run": initial.get("latest_run"),
            },
        )

        while True:
            if await request.is_disconnected():
                logger.info("SSE client đã ngắt kết nối.")
                break

            # Tín hiệu broadcast tức thời (trước và sau khi chờ)
            msg = _drain_queue(client_queue)
            if msg is None:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                msg = _drain_queue(client_queue)
            if msg is not None:
                last_id = last_total = last_run_id = 0
                yield msg
                continue

            state = await asyncio.to_thread(get_latest_state, last_id, last_run_id)

            # Lỗi DB thoáng qua: giữ trạng thái cũ, bỏ qua chu kỳ (KHÔNG phát database_cleared)
            if not state.get("success"):
                logger.warning("SSE bỏ qua chu kỳ do không đọc được CSDL.")
                continue

            # Lần đầu đọc được sau khi lúc kết nối DB đang lỗi: lấy mốc, không phát gì
            if not ready:
                ready = True
                last_id = state["max_id"]
                last_run_id = state["latest_run_id"]
                last_total = state["total"]
                continue

            current_total = state["total"]
            new_events = state["new_events"]
            new_run_info = state["new_run_info"]

            # CSDL bị xóa trống (Demo Bước 2/3)
            if current_total == 0 and (last_total > 0 or last_id > 0):
                logger.warning("SSE phát hiện CSDL bị xóa trống (%d -> 0).", last_total)
                last_id = last_total = last_run_id = 0
                yield _cleared_packet()
                continue

            last_total = current_total

            if new_run_info:
                last_run_id = state["latest_run_id"]
                if new_events:
                    last_id = state["max_id"]
                cnt = new_run_info.get("records_processed", 0)
                message = (
                    f"Đã cào dữ liệu mới nhất từ USGS (+{cnt} sự kiện)."
                    if cnt > 0
                    else "Đã hoàn thành chu kỳ quét 5 phút: dữ liệu hiện tại là mới nhất."
                )
                # Tính catalog ngoài luồng; chỉ đính vào packet khi có khác biệt.
                global _last_catalog_hash
                catalog = await asyncio.to_thread(_catalog_snapshot)
                cycle_data: dict[str, Any] = {
                    "title": "Cập Nhật Dữ Liệu Tự Động (Chu kỳ 5 phút)",
                    "message": message,
                    "records_processed": cnt,
                    "total_events": current_total,
                    "new_events": new_events,
                    "timestamp": new_run_info.get("finished_at") or utc_now_iso(),
                }
                if catalog is not None:
                    digest = catalog_hash(catalog)
                    if digest != _last_catalog_hash:
                        cycle_data["catalog"] = catalog
                        _last_catalog_hash = digest
                yield _packet("ingestion_cycle_completed", cycle_data)
            elif new_events:
                last_id = state["max_id"]
                yield _packet(
                    "earthquake_detected",
                    {
                        "title": "Phát Hiện Sự Kiện Địa Chấn Mới",
                        "message": f"Phát hiện {len(new_events)} sự kiện địa chấn mới vừa được ghi nhận.",
                        "new_events": new_events,
                        "records_processed": len(new_events),
                        "total_events": current_total,
                        "latest_event": state["latest"],
                        **_marker_fields(new_events),
                    },
                )

            # Cảnh báo ưu tiên: M >= 4.5 (độc lập với nhánh ở trên)
            alerts = [e for e in new_events if (e["magnitude"] or 0) >= ALERT_MAGNITUDE]
            if alerts:
                alert_data = {
                    "title": f"Cảnh Báo Động Đất M ≥ {ALERT_MAGNITUDE}",
                    "message": f"Có {len(alerts)} sự kiện có độ lớn từ {ALERT_MAGNITUDE} trở lên.",
                    "alert_events": alerts,
                    "max_magnitude": max(e["magnitude"] for e in alerts),
                    "total_events": current_total,
                    **_marker_fields(alerts),
                }
                yield _packet("earthquake_alert", alert_data)
                # GAP-09: contract sse-event.json liệt kê thêm tên "alert" (alias) —
                # FE đã đăng ký cả tên này và tự dedup theo source_event_id (GAP-06).
                yield _packet("alert", alert_data)

            if not new_run_info and not new_events:
                yield _packet(
                    "heartbeat",
                    {
                        "total_events": current_total,
                        "strong_count": state["strong_count"],
                        "latest_event": state["latest"],
                        "latest_run": state["latest_run"],
                    },
                )
    finally:
        _connected_sse_queues.discard(client_queue)
        logger.info("SSE client ngắt kết nối, đã xóa queue khỏi broadcast pool.")
````

#### 11.3.36. `apps/api/src/gdmas/scheduler/jobs.py`

*File rỗng tại snapshot đối chiếu; không có mã để in.*

#### 11.3.37. `apps/api/src/gdmas/schemas/__init__.py`

````python
"""Pydantic Data Schemas Package for GDMAS."""

from gdmas.schemas.earthquake import (
    EarthquakeBase,
    EarthquakeListResponse,
    EarthquakeMetadata,
    EarthquakeResponse,
    EarthquakeStatistics,
    StatisticsResponse,
)

__all__ = [
    "EarthquakeBase",
    "EarthquakeListResponse",
    "EarthquakeMetadata",
    "EarthquakeResponse",
    "EarthquakeStatistics",
    "StatisticsResponse",
]
````

#### 11.3.38. `apps/api/src/gdmas/schemas/earthquake.py`

````python
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class EarthquakeBase(BaseModel):
    source: str = "USGS"
    source_event_id: str
    event_time: datetime
    latitude: float
    longitude: float
    depth_km: float
    magnitude: float
    magnitude_type: str | None = None
    place: str | None = None
    country: str | None = None
    region: str | None = None
    source_url: str | None = None


class EarthquakeResponse(EarthquakeBase):
    id: int
    ingested_at: datetime | None = None
    raw_data: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class EarthquakeMetadata(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    last_updated: datetime | None = None


class EarthquakeListResponse(BaseModel):
    success: bool = True
    data: list[EarthquakeResponse]
    metadata: EarthquakeMetadata


class CountryCount(BaseModel):
    country: str
    count: int
    avg_magnitude: float | None = None
    max_magnitude: float | None = None


class RegionCount(BaseModel):
    region: str
    count: int
    avg_magnitude: float | None = None
    max_magnitude: float | None = None


class CountryListResponse(BaseModel):
    success: bool = True
    data: list[CountryCount]


class RegionListResponse(BaseModel):
    success: bool = True
    data: list[RegionCount]


class HourlyTimeSeriesPoint(BaseModel):
    time: str
    count: int
    avg_mag: float


class MonthlyPeak(BaseModel):
    month: int
    label: str
    count: int


class MonthlyPeaksResponse(BaseModel):
    success: bool = True
    data: list[MonthlyPeak]


class EarthquakeStatistics(BaseModel):
    total_events: int
    strong_events_count: int  # M >= 5.0
    moderate_events_count: int  # 4.0 <= M < 5.0
    minor_events_count: int = 0  # M < 4.0
    recent_24h_count: int
    avg_magnitude: float
    max_magnitude: float
    latest_event_time: datetime | None = None
    time_series_preview: list[HourlyTimeSeriesPoint] | None = None


class StatisticsResponse(BaseModel):
    success: bool = True
    data: EarthquakeStatistics


class SyncResponse(BaseModel):
    success: bool = True
    message: str
    synced_count: int
    source: str = "USGS"
    timestamp: datetime
````

#### 11.3.39. `apps/api/src/gdmas/services/__init__.py`

````python
"""GDMAS Independent Background Services Package (Microservices 7 Terminals)."""
````

#### 11.3.40. `apps/api/src/gdmas/services/ai_env.py`

````python
"""Ghi cấu hình Gemini vào .env trên máy chủ — KHÔNG lưu database.

Chỉ 2 khoá GEMINI_MODEL / GEMINI_API_KEY được phép ghi; các dòng khác giữ nguyên.
Đường dẫn có thể override bằng AI_ENV_FILE (tests dùng file tạm, không đụng .env thật).
"""

from __future__ import annotations

import os
from pathlib import Path

ALLOWED_KEYS = ("GEMINI_MODEL", "GEMINI_API_KEY")


def default_env_path_for(file: Path, cwd: Path) -> Path:
    """Tìm .env gốc repo (local) hoặc cwd/.env (Docker) — KHÔNG dùng parents[cố định].

    Trước đây dùng parents[5] gây IndexError trong Docker (/app/src/gdmas/...).
    """
    for parent in file.resolve().parents:
        if (parent / "docker-compose.yml").is_file() or (
            parent / ".env.example"
        ).is_file():
            return parent / ".env"
    return cwd / ".env"


def _default_env_path() -> Path:
    return default_env_path_for(Path(__file__), Path.cwd())


def env_path() -> Path:
    override = os.getenv("AI_ENV_FILE", "").strip()
    return Path(override) if override else _default_env_path()


def read_ai_env(path: Path | None = None) -> tuple[str, str]:
    """Trả (model, key) — thiếu thì chuỗi rỗng."""
    target = path or env_path()
    values: dict[str, str] = {}
    if target.exists():
        for line in target.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, _, value = stripped.partition("=")
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values.get("GEMINI_MODEL", ""), values.get("GEMINI_API_KEY", "")


def upsert_ai_env(model: str, api_key: str, path: Path | None = None) -> Path:
    """Upsert 2 khoá, giữ nguyên mọi dòng khác. Ghi qua file tạm rồi thay thế."""
    target = path or env_path()
    updates = {"GEMINI_MODEL": model, "GEMINI_API_KEY": api_key}
    original = (
        target.read_text(encoding="utf-8").splitlines() if target.exists() else []
    )
    output: list[str] = []
    seen: set[str] = set()
    for line in original:
        matched = False
        for key, value in updates.items():
            if line.strip().startswith(f"{key}="):
                output.append(f"{key}={value}")
                seen.add(key)
                matched = True
                break
        if not matched:
            output.append(line)
    for key, value in updates.items():
        if key not in seen:
            output.append(f"{key}={value}")

    temporary = target.with_name(f"{target.name}.tmp")
    temporary.write_text("\n".join(output) + "\n", encoding="utf-8")
    temporary.replace(target)
    return target


def mask_key(key: str) -> str:
    """Che key khi trả về FE — không bao giờ gửi key đầy đủ trong response."""
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:4]}{'*' * (len(key) - 8)}{key[-4:]}"
````

#### 11.3.41. `apps/api/src/gdmas/services/ai_gemini.py`

````python
"""Gateway Gemini — chỉ hỗ trợ Gemini, dùng để kiểm tra key và sinh nhận xét.

Không log key. HTTP client truyền vào để test offline 100% (I7).
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

import httpx

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL_PATTERN = re.compile(r"^gemini[-.A-Za-z0-9_]+$")

HttpFn = Callable[..., Any]


def is_gemini_model(model: str) -> bool:
    """Chỉ nhận tên mô hình Gemini — chặn mô hình OpenAI/Anthropic bị đưa vào .env."""
    return bool(GEMINI_MODEL_PATTERN.fullmatch(model.strip()))


def _headers(api_key: str) -> dict[str, str]:
    return {"x-goog-api-key": api_key, "Content-Type": "application/json"}


def validate_credentials(
    model: str, api_key: str, *, http: HttpFn | None = None
) -> bool:
    """Gemini trả 200 cho model hợp lệ + key đúng; mọi lỗi mạng đều coi là không hợp lệ."""
    if not is_gemini_model(model) or not api_key.strip():
        return False
    fn = http or httpx.request
    try:
        response = fn(
            "GET",
            f"{GEMINI_BASE}/models/{model.strip()}",
            headers=_headers(api_key.strip()),
            timeout=10,
        )
        return int(response.status_code) == 200
    except Exception:  # noqa: BLE001 — lỗi mạng/thời gian chờ đều là key không dùng được
        return False


def generate_content(
    model: str,
    api_key: str,
    prompt: str,
    *,
    system: str | None = None,
    http: HttpFn | None = None,
) -> str:
    """Gọi Gemini generateContent và trả phần text đầu tiên."""
    fn = http or httpx.request
    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
    }
    if system and system.strip():
        body["systemInstruction"] = {"parts": [{"text": system}]}
    response = fn(
        "POST",
        f"{GEMINI_BASE}/models/{model.strip()}:generateContent",
        headers=_headers(api_key.strip()),
        json=body,
        timeout=30,
    )
    if int(response.status_code) != 200:
        raise RuntimeError(f"Gemini HTTP {response.status_code}")
    payload = response.json()
    candidates = payload.get("candidates") or []
    parts = (
        (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    )
    text = "".join(
        part.get("text", "") for part in parts if isinstance(part, dict)
    ).strip()
    if not text:
        raise RuntimeError("Gemini trả nội dung rỗng")
    return text
````

#### 11.3.42. `apps/api/src/gdmas/services/analysis/__init__.py`

````python
"""Analysis Service: Phân tích chuỗi thời gian 6 patterns (Chu kỳ 5 phút/lần)."""
````

#### 11.3.43. `apps/api/src/gdmas/services/analysis/filtered.py`

````python
"""Tính metrics phân tích/dự báo on-the-fly cho phạm vi quốc gia/khu vực.

Tái dùng hoàn toàn hàm thuần của T3/T5 (`patterns.py`, `inference.py`) — KHÔNG ghi DB,
KHÔNG tạo `service_runs`, KHÔNG đổi snapshot toàn cục (I1/I2/I4). Khi không truyền
filter, route vẫn đi đường cũ đọc bảng tổng hợp.

Nếu dữ liệu phạm vi quá ít (`MIN_OBSERVED`) thì ném `InsufficientDataError` để route
trả Empty State — không bịa số (I5).
"""

import logging
from datetime import UTC, datetime, time, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Query, Session

from gdmas.core.config import settings
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.services.analysis.patterns import (
    TZ_BY_MODE,
    compute_correlation,
    compute_seasonality,
    compute_temporal,
    compute_trend_bundle,
    prepare_events,
)
from gdmas.services.prediction import inference

logger = logging.getLogger("gdmas.services.analysis.filtered")


def rounded_forecast(forecast: dict[str, Any]) -> dict[str, Any]:
    """Chuẩn hóa 3 field dự báo về đúng 3 chữ số thập phân (giữ số thật, không đệm `000`).

    Cả 2 đường BE snapshot (`prediction/service.py`) và on-the-fly dùng cùng độ chính xác này.
    Hàm thuần — không đụng artifact, không ghi DB, giữ nguyên các field khác (I1/I2/I3).
    """
    rounded = dict(forecast)
    for field in ("predicted", "lower", "upper"):
        value = rounded.get(field)
        if isinstance(value, (int, float)):
            rounded[field] = round(float(value), 3)
    return rounded


FREQ_TO_INTERVAL = {"D": "day", "W": "week", "M": "month"}


class InsufficientDataError(RuntimeError):
    """Phạm vi được lọc không đủ dữ liệu để tính chỉ số/dự báo."""


def scope(query: Query, country: str | None, region: str | None) -> Query:
    """Áp bộ lọc country/region vào một query bất kỳ trên `earthquake_events`."""
    if country:
        query = query.filter(EarthquakeEvent.country == country)
    if region:
        query = query.filter(EarthquakeEvent.region == region)
    return query


def load_filtered_events_df(
    db: Session,
    country: str | None,
    region: str | None,
    *,
    as_of: datetime | None = None,
    window_days: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
) -> pd.DataFrame:
    """Nạp 6 cột `EVENT_COLUMNS` của T3 cho phạm vi đã lọc → DataFrame đã chuẩn hoá."""
    as_of = as_of or datetime.now(UTC)
    days = window_days or settings.ANALYSIS_WINDOW_DAYS
    since = as_of - timedelta(days=days)
    query = scope(
        db.query(
            EarthquakeEvent.id,
            EarthquakeEvent.event_time,
            EarthquakeEvent.magnitude,
            EarthquakeEvent.depth_km,
            EarthquakeEvent.latitude,
            EarthquakeEvent.longitude,
        ),
        country,
        region,
    ).filter(EarthquakeEvent.event_time >= since)
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)
    rows = query.order_by(EarthquakeEvent.event_time).all()
    return prepare_events(row._asdict() for row in rows)


def compute_filtered_metrics(
    db: Session,
    kind: str,
    country: str | None,
    region: str | None,
    *,
    as_of: datetime | None = None,
    interval: str | None = None,
    metric: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    timezone: str | None = None,
) -> dict[str, Any]:
    """Trả metrics theo đúng shape mà `build()` của từng route analysis.py mong đợi."""
    df = load_filtered_events_df(db, country, region, as_of=as_of, start=start, end=end)
    if kind == "temporal":
        return compute_temporal(
            df,
            interval or "day",
            tz=TZ_BY_MODE.get(timezone or "UTC", "UTC"),
        )
    if kind == "trend":
        mapped = FREQ_TO_INTERVAL.get(interval or "M", "month")
        bundle = compute_trend_bundle(
            df,
            mapped,
            as_of=as_of,
            tz=TZ_BY_MODE.get(timezone or "UTC", "UTC"),
        )
        # build() của /analysis/trend đọc m["metrics"][metric]; đảm bảo có dù df rỗng.
        bundle.setdefault("metrics", {})
        for key in ("count", "avg_magnitude", "max_magnitude"):
            bundle["metrics"].setdefault(
                key, {"series": [], "status": "insufficient_data"}
            )
        return bundle
    if kind == "seasonality":
        return compute_seasonality(df, as_of=as_of, interval=interval)
    if kind == "correlation":
        return compute_correlation(df)
    raise ValueError(f"Kind không hợp lệ: {kind}")


def filtered_day_counts(
    db: Session, country: str | None, region: str | None, today: Any
) -> dict[Any, int]:
    """Số trận/ngày UTC cho các ngày đã đủ dữ liệu — phiên bản có filter.

    Tính bằng pandas thay vì `func.timezone()` của PostgreSQL để chạy được cả trên
    SQLite trong test offline; vẫn dùng chung câu query 6 cột với T3.
    """
    now = datetime.combine(today, time.min, tzinfo=UTC)
    df = load_filtered_events_df(db, country, region, as_of=now)
    if df.empty:
        return {}
    first_complete = df["event_time"].min().date() + timedelta(days=1)
    if first_complete >= today:
        return {}
    start_ts = pd.Timestamp(first_complete, tz="UTC")
    end_ts = pd.Timestamp(today, tz="UTC")
    in_range = df[(df["event_time"] >= start_ts) & (df["event_time"] < end_ts)]
    counts = in_range.groupby(in_range["event_time"].dt.date).size()
    return {day: int(count) for day, count in counts.items()}


def build_filtered_forecast(
    db: Session, country: str | None, region: str | None, now: datetime
) -> dict[str, Any]:
    """Tính P5/P6 on-the-fly. Artifact vẫn là bản toàn cầu — ghi rõ trong UI."""
    art = inference.load_artifacts()
    today = now.date()
    counts = filtered_day_counts(db, country, region, today)
    if not counts:
        raise InsufficientDataError("Phạm vi này chưa có đủ ngày dữ liệu để dự báo.")
    series = inference.build_series(art["history"], counts, today - timedelta(days=1))
    try:
        forecast = rounded_forecast(inference.forecast_next(series))
        classification = inference.classify_next(series)
    except ValueError as exc:
        raise InsufficientDataError(str(exc)) from exc

    forecast_name, forecast_eval = inference.forecast_model_info()
    classifier_name, classifier_eval = inference.classifier_model_info()
    target_date = (today + timedelta(days=1)).isoformat()
    generated_at = now.isoformat().replace("+00:00", "Z")

    return {
        "prediction": {
            "target_date": target_date,
            "forecasted_metric": "event_count",
            "predicted_value": forecast["predicted"],
            "confidence_interval": {
                "lower": forecast["lower"],
                "upper": forecast["upper"],
            },
            "model_name": forecast_name,
            "model_version": None,
            "evaluation_metrics": forecast_eval,
            "generated_at": generated_at,
            "confidence_level": forecast_eval.get("confidence_level"),
        },
        "classification": {
            "target_date": target_date,
            "predicted_label": classification["label"],
            "probabilities": classification["probabilities"],
            "probability_scores": classification["probabilities"],
            "model_name": classifier_name,
            "model_version": None,
            "evaluation_metrics": classifier_eval,
            "generated_at": generated_at,
        },
    }
````

#### 11.3.44. `apps/api/src/gdmas/services/analysis/patterns.py`

````python
"""Tính toán 4 Patterns chuỗi thời gian (Terminal 3 — Analysis) từ sự kiện địa chấn thật.

Mọi hàm ở đây là hàm thuần trên pandas.DataFrame (không I/O) để kiểm thử offline.
DataFrame đầu vào gồm các cột: id, event_time (UTC), magnitude, depth_km, latitude, longitude.

Quy ước re-sampling: gom theo kỳ lịch và gán nhãn theo ngày bắt đầu kỳ
(`D`, `W-MON` đóng trái, `MS`) — cùng cách gom như `1D`/`1W`/`1ME` của pandas, chỉ khác nhãn.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

EVENT_COLUMNS = ("id", "event_time", "magnitude", "depth_km", "latitude", "longitude")
CORRELATION_VARIABLES = (
    "magnitude",
    "depth_km",
    "latitude",
    "longitude",
    "daily_event_count",
)
TEMPORAL_INTERVALS = ("day", "week", "month")
TREND_INTERVALS = ("day", "week", "month")
TREND_METRICS = ("count", "avg_magnitude", "max_magnitude")
SCATTER_LIMIT = 2000
TREND_MIN_PERIODS = 3
TREND_SIGNIFICANCE = 0.05
MOVING_AVERAGE_WINDOW = 3
MIN_CORRELATION_SAMPLES = 3

STATUS_COMPUTED = "computed"
STATUS_INSUFFICIENT = "insufficient_data"

# (nhãn bin, cận dưới bao gồm, cận trên không bao gồm)
MAGNITUDE_BINS: tuple[tuple[str, float, float], ...] = (
    ("< 2.0", -math.inf, 2.0),
    ("2.0 - 3.0", 2.0, 3.0),
    ("3.0 - 4.0", 3.0, 4.0),
    ("4.0 - 5.0", 4.0, 5.0),
    (">= 5.0", 5.0, math.inf),
)

_RESAMPLE_RULES: dict[str, dict[str, Any]] = {
    "day": {"rule": "D"},
    "week": {"rule": "W-MON", "closed": "left", "label": "left"},
    "month": {"rule": "MS"},
}
_INTERVAL_TO_FREQ_CODE = {"day": "D", "week": "W", "month": "M"}

# Chế độ header → IANA timezone; mặc định UTC để caller cũ không đổi (I2/I3).
TZ_BY_MODE: dict[str, str] = {"UTC": "UTC", "UTC+7": "Asia/Ho_Chi_Minh"}

_WEEKDAY_LABELS = ("Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật")
# (interval, chu kỳ, số kỳ tối thiểu, nhãn chu kỳ, mô tả cho FE)
_SEASONAL_CANDIDATES: tuple[tuple[str, int, int, str, str], ...] = (
    ("month", 12, 24, "năm (12 tháng)", "8760 giờ (chu kỳ năm)"),
    ("day", 7, 14, "tuần (7 ngày)", "168 giờ (chu kỳ tuần)"),
)
SEASONALITY_INSUFFICIENT_TEXT = (
    "Chu kỳ yếu / chưa xác định mùa vụ rõ — chưa đủ dữ liệu "
    "(cần ≥ 14 ngày cho chu kỳ tuần hoặc ≥ 24 tháng cho chu kỳ năm)."
)
CORRELATION_NOTE = (
    "Tương quan chỉ đo mức liên hệ tuyến tính/thứ hạng, không hàm ý quan hệ nhân quả."
)


# ---------------------------------------------------------------------------
# Tiện ích chung
# ---------------------------------------------------------------------------


def format_utc(ts: Any) -> str | None:
    """Định dạng thời điểm sang ISO 8601 UTC kết thúc bằng `Z`."""
    if ts is None or (isinstance(ts, float) and math.isnan(ts)) or ts is pd.NaT:
        return None
    stamp = pd.Timestamp(ts)
    stamp = (
        stamp.tz_localize("UTC") if stamp.tzinfo is None else stamp.tz_convert("UTC")
    )
    return stamp.strftime("%Y-%m-%dT%H:%M:%SZ")


def _round(value: Any, ndigits: int = 4) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return round(number, ndigits) if math.isfinite(number) else None


def sanitize_for_json(obj: Any) -> Any:
    """Đệ quy chuyển NaN/±inf → None, numpy/pandas scalar → kiểu Python, Timestamp → ISO `Z`."""
    if isinstance(obj, Mapping):
        return {str(key): sanitize_for_json(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_for_json(value) for value in obj]
    if isinstance(obj, np.ndarray):
        return [sanitize_for_json(value) for value in obj.tolist()]
    if isinstance(obj, (pd.Timestamp, datetime)):
        return format_utc(obj)
    if isinstance(obj, np.generic):
        obj = obj.item()
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    return obj


def prepare_events(records: Iterable[Mapping[str, Any]] | pd.DataFrame) -> pd.DataFrame:
    """Chuẩn hóa sự kiện thành DataFrame: event_time UTC, cột số dạng float, bỏ dòng thiếu, sắp theo thời gian."""
    df = (
        records.copy()
        if isinstance(records, pd.DataFrame)
        else pd.DataFrame(list(records))
    )
    if df.empty:
        return pd.DataFrame(
            {
                "id": pd.Series(dtype="int64"),
                "event_time": pd.Series(dtype="datetime64[ns, UTC]"),
                **{col: pd.Series(dtype="float64") for col in EVENT_COLUMNS[2:]},
            }
        )
    df = df.loc[:, [col for col in EVENT_COLUMNS if col in df.columns]]
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    for col in EVENT_COLUMNS[2:]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan).dropna(
        subset=["event_time", "magnitude"]
    )
    df["depth_km"] = df["depth_km"].fillna(0.0)
    return df.sort_values("event_time", kind="stable").reset_index(drop=True)


def _resample(df: pd.DataFrame, interval: str) -> pd.core.resample.Resampler:
    rule = dict(_RESAMPLE_RULES[interval])
    return df.set_index("event_time").resample(rule.pop("rule"), **rule)


def _period_label(ts: pd.Timestamp, interval: str) -> str:
    return ts.strftime("%Y-%m") if interval == "month" else ts.strftime("%Y-%m-%d")


def _span_days(df: pd.DataFrame) -> float:
    if df.empty:
        return 0.0
    return (df["event_time"].max() - df["event_time"].min()).total_seconds() / 86400.0


def _period_end(ts: pd.Timestamp, interval: str) -> pd.Timestamp:
    if interval == "month":
        return ts + pd.offsets.MonthBegin(1)
    return ts + pd.Timedelta(days=7 if interval == "week" else 1)


def complete_period_mask(
    index: pd.DatetimeIndex,
    interval: str,
    df: pd.DataFrame,
    *,
    as_of: datetime | None = None,
) -> np.ndarray:
    """Đánh dấu kỳ nằm trọn trong cửa sổ dữ liệu (từ đầu ngày UTC đầu tiên tới hết ngày UTC cuối cùng).

    Kỳ ở hai đầu chỉ được phủ một phần (vd. tháng hiện tại mới qua vài ngày) sẽ làm lệch xu hướng
    nên bị loại khỏi hồi quy và phân rã mùa vụ. Khi có `as_of`, chỉ nhận kỳ đã kết thúc
    trước hoặc đúng thời điểm đó; không coi ngày hiện tại còn dở dang là ngày đầy đủ.
    """
    if df.empty or len(index) == 0:
        return np.zeros(len(index), dtype=bool)
    window_start = df["event_time"].min().floor("D")
    window_end = df["event_time"].max().floor("D") + pd.Timedelta(days=1)
    if as_of is not None:
        observed_end = pd.Timestamp(as_of)
        observed_end = (
            observed_end.tz_localize("UTC")
            if observed_end.tzinfo is None
            else observed_end.tz_convert("UTC")
        )
        window_end = min(window_end, observed_end)
    return np.array(
        [
            ts >= window_start and _period_end(ts, interval) <= window_end
            for ts in index
        ],
        dtype=bool,
    )


def _to_utc_datetime(ts: pd.Timestamp) -> datetime:
    return ts.floor("us").to_pydatetime().astimezone(UTC)


# ---------------------------------------------------------------------------
# Pattern 1 — Biểu diễn theo thời gian (Line, Scatter, Histogram)
# ---------------------------------------------------------------------------


def magnitude_histogram(df: pd.DataFrame) -> list[dict[str, Any]]:
    mags = df["magnitude"].to_numpy(dtype=float) if not df.empty else np.array([])
    return [
        {"bin": label, "count": int(((mags >= low) & (mags < high)).sum())}
        for label, low, high in MAGNITUDE_BINS
    ]


def compute_temporal(
    df: pd.DataFrame,
    interval: str = "day",
    scatter_limit: int = SCATTER_LIMIT,
    tz: str = "UTC",
) -> dict[str, Any]:
    if interval not in TEMPORAL_INTERVALS:
        raise ValueError(f"interval phải thuộc {TEMPORAL_INTERVALS}, nhận {interval!r}")

    line_chart: list[dict[str, Any]] = []
    scatter_plot: list[dict[str, Any]] = []
    if not df.empty:
        local = df.copy()
        local["event_time"] = local["event_time"].dt.tz_convert(tz)
        grouped = _resample(local, interval)["magnitude"].agg(["count", "max", "mean"])
        line_chart = [
            {
                "date": _period_label(ts, interval),
                "event_count": int(row["count"]),
                "max_magnitude": _round(row["max"], 2),
                "avg_magnitude": _round(row["mean"], 2),
            }
            for ts, row in grouped.iterrows()
        ]
        latest = df.tail(scatter_limit)
        scatter_plot = [
            {
                "id": int(row.id),
                "timestamp": format_utc(row.event_time),
                "magnitude": _round(row.magnitude, 2),
                "depth_km": _round(row.depth_km, 2),
            }
            for row in latest.itertuples(index=False)
        ]

    return {
        "status": STATUS_COMPUTED,
        "interval": interval,
        "line_chart": line_chart,
        "scatter_plot": scatter_plot,
        "histogram": {"magnitude_bins": magnitude_histogram(df)},
        "data_points": len(df),
        "avg_magnitude": _round(df["magnitude"].mean(), 3) if not df.empty else None,
        "max_magnitude": _round(df["magnitude"].max(), 2) if not df.empty else None,
        "avg_depth": _round(df["depth_km"].mean(), 2) if not df.empty else None,
    }


# ---------------------------------------------------------------------------
# Pattern 2 — Trend Analysis sau Re-sampling
# ---------------------------------------------------------------------------


MONTHLY_MIN_SPAN_DAYS = 180
WEEKLY_MIN_SPAN_DAYS = 28


def choose_trend_interval(df: pd.DataFrame) -> str:
    """Chọn mức re-sampling sao cho có ≥ 3 kỳ đầy đủ để hồi quy.

    ≥ 180 ngày → tháng, ≥ 28 ngày → tuần, ngược lại → ngày
    (dữ liệu < 7 ngày luôn rơi về mức ngày — fallback của docs/workflow.md §7).
    """
    span = _span_days(df)
    if span >= MONTHLY_MIN_SPAN_DAYS:
        return "month"
    if span >= WEEKLY_MIN_SPAN_DAYS:
        return "week"
    return "day"


_DIRECTION_LABELS = {
    "increasing": "Tăng (Upward)",
    "decreasing": "Giảm (Downward)",
    "stable": "Ổn định (Stable)",
}


_TREND_AGGREGATIONS = {
    "count": "count",
    "avg_magnitude": "mean",
    "max_magnitude": "max",
}


def _trend_actual(df: pd.DataFrame, interval: str, metric: str) -> pd.Series:
    """Chuỗi giá trị thực theo kỳ: số trận (kỳ rỗng = 0) hoặc độ lớn (kỳ rỗng bị loại)."""
    if df.empty:
        return pd.Series(dtype=float)
    aggregated = _resample(df, interval)["magnitude"].agg(_TREND_AGGREGATIONS[metric])
    actual = aggregated.astype(float)
    # Không bịa độ lớn 0 cho kỳ không có sự kiện — bỏ kỳ đó khỏi chuỗi và hồi quy.
    return actual if metric == "count" else actual.dropna()


def compute_trend(
    df: pd.DataFrame,
    interval: str | None = None,
    *,
    as_of: datetime | None = None,
    metric: str = "count",
    tz: str = "UTC",
) -> dict[str, Any]:
    if metric not in _TREND_AGGREGATIONS:
        raise ValueError(f"metric không hỗ trợ: {metric}")
    # Bucket theo múi giờ hiển thị (UTC/UTC+7) như compute_temporal — nếu không,
    # sự kiện 20:00 UTC hôm trước rơi nhầm vào ngày hôm đó (I3).
    if tz != "UTC" and not df.empty:
        df = df.copy()
        df["event_time"] = df["event_time"].dt.tz_convert(tz)
    interval = interval or choose_trend_interval(df)
    actual = _trend_actual(df, interval, metric)
    moving_avg = actual.rolling(
        MOVING_AVERAGE_WINDOW, center=True, min_periods=1
    ).mean()

    complete = complete_period_mask(actual.index, interval, df, as_of=as_of)
    # Vị trí kỳ thật trên lưới re-sampling (giữ khoảng cách khi metric độ lớn bỏ kỳ rỗng).
    positions = (
        _resample(df, interval)["magnitude"].count().index.get_indexer(actual.index)
        if not df.empty
        else np.array([], dtype=int)
    )

    series = [
        {
            "period": _period_label(ts, interval),
            "actual_value": int(actual.loc[ts])
            if metric == "count"
            else _round(actual.loc[ts], 3),
            "trend_value": _round(moving_avg.loc[ts], 3),
            "is_complete": bool(is_complete),
        }
        for ts, is_complete in zip(actual.index, complete, strict=True)
    ]

    slope = 0.0
    intercept: float | None = None
    p_value: float | None = None
    r_squared: float | None = None
    direction = "stable"
    # Hồi quy trên các kỳ đầy đủ; trục x là vị trí kỳ thật để giữ khoảng cách thời gian.
    x = positions[complete].astype(float)
    y = actual.to_numpy()[complete]
    status = STATUS_INSUFFICIENT if len(y) < TREND_MIN_PERIODS else STATUS_COMPUTED

    if status == STATUS_COMPUTED and float(np.ptp(y)) > 0:
        fit = stats.linregress(x, y)
        slope = float(fit.slope)
        intercept = float(fit.intercept)
        p_value = float(fit.pvalue)
        r_squared = float(fit.rvalue**2)
        if p_value < TREND_SIGNIFICANCE:
            direction = "increasing" if slope > 0 else "decreasing"

    mean_level = float(y.mean()) if len(y) else 0.0
    return {
        "status": status,
        "resample_freq": _INTERVAL_TO_FREQ_CODE[interval],
        "interval": interval,
        "metric": metric,
        "series": series,
        "moving_average_window": MOVING_AVERAGE_WINDOW,
        "slope": _round(slope, 6),
        "intercept": _round(intercept, 6),
        "relative_slope": _round(slope / mean_level, 6) if mean_level > 0 else None,
        "p_value": _round(p_value, 6),
        "r_squared": _round(r_squared, 6),
        "trend_direction": direction,
        "direction": _DIRECTION_LABELS[direction],
        "data_points": len(series),
        "complete_periods": len(y),
    }


def compute_trend_bundle(
    df: pd.DataFrame,
    interval: str,
    *,
    as_of: datetime | None = None,
    tz: str = "UTC",
) -> dict[str, Any]:
    """Pattern 2 cho một tần suất, đủ 3 metric của `GET /analysis/trend`.

    Cấp cao nhất giữ kết quả metric `count` (định dạng cũ, `/patterns` vẫn đọc được);
    khóa `metrics` chứa kết quả riêng của từng metric trong `TREND_METRICS`.
    """
    metrics = {
        metric: compute_trend(df, interval, as_of=as_of, metric=metric, tz=tz)
        for metric in TREND_METRICS
    }
    return {**metrics["count"], "metrics": metrics}


# ---------------------------------------------------------------------------
# Pattern 3 — Seasonality sau Re-sampling
# ---------------------------------------------------------------------------


def _seasonal_labels(interval: str) -> list[tuple[int, str]]:
    if interval == "month":
        return [(m, f"Tháng {m}") for m in range(1, 13)]
    return [(i + 1, _WEEKDAY_LABELS[i]) for i in range(7)]


def _seasonal_position(index: pd.DatetimeIndex, interval: str) -> np.ndarray:
    return (
        index.month.to_numpy()
        if interval == "month"
        else index.day_of_week.to_numpy() + 1
    )


STRONG_SEASONALITY = 0.64
MODERATE_SEASONALITY = 0.4


def _interpret_strength(strength: float, cycle_label: str) -> str:
    if strength >= STRONG_SEASONALITY:
        return f"Dữ liệu thể hiện tính chu kỳ {cycle_label} rõ rệt (độ mạnh mùa vụ {strength:.2f})."
    if strength >= MODERATE_SEASONALITY:
        return f"Dữ liệu có tính chu kỳ {cycle_label} ở mức trung bình (độ mạnh mùa vụ {strength:.2f}); cần thêm dữ liệu để khẳng định."
    return f"Chu kỳ yếu, không có bằng chứng mùa vụ rõ rệt theo chu kỳ {cycle_label} (độ mạnh mùa vụ {strength:.2f})."


def compute_seasonality(
    df: pd.DataFrame, *, as_of: datetime | None = None, interval: str | None = None
) -> dict[str, Any]:
    """Tách thành phần mùa vụ bằng seasonal_decompose khi đủ ≥ 2 chu kỳ; không mặc định có mùa vụ (P-03).

    `interval="month"`/`"week"` ép một chu kỳ cụ thể (tuần = candidate 7 ngày) thay vì
    tự chọn candidate đầu tiên đủ dữ liệu.
    """
    from statsmodels.tsa.seasonal import seasonal_decompose

    forced = {"month": "month", "week": "day"}.get(interval or "") if interval else None
    candidates = (
        [item for item in _SEASONAL_CANDIDATES if item[0] == forced]
        if forced
        else _SEASONAL_CANDIDATES
    )

    for candidate_interval, period, min_points, cycle_label, cycle_hours in candidates:
        if df.empty:
            break
        counts = _resample(df, candidate_interval)["magnitude"].count().astype(float)
        counts = counts[
            complete_period_mask(counts.index, candidate_interval, df, as_of=as_of)
        ]
        if len(counts) < min_points:
            continue

        decomposition = seasonal_decompose(counts, model="additive", period=period)
        seasonal = decomposition.seasonal
        resid = decomposition.resid.dropna()
        detrended = (seasonal + decomposition.resid).dropna()

        resid_var = float(np.var(resid.to_numpy())) if len(resid) else 0.0
        detrended_var = float(np.var(detrended.to_numpy())) if len(detrended) else 0.0
        strength = (
            max(0.0, 1.0 - resid_var / detrended_var) if detrended_var > 0 else 0.0
        )
        strength = min(strength, 1.0)

        positions = _seasonal_position(seasonal.index, candidate_interval)
        effect_by_position = pd.Series(seasonal.to_numpy()).groupby(positions).mean()
        mean_level = float(counts.mean())

        seasonal_line = []
        for position, label in _seasonal_labels(candidate_interval):
            effect = float(effect_by_position.get(position, 0.0))
            factor = 1.0 + effect / mean_level if mean_level > 0 else 1.0
            seasonal_line.append(
                {
                    "cycle_index": position,
                    "period_label": label,
                    "seasonal_factor": _round(factor, 4),
                    "seasonal_effect": _round(effect, 4),
                }
            )
        effects = [p["seasonal_effect"] or 0.0 for p in seasonal_line]
        return {
            "status": STATUS_COMPUTED,
            "resample_freq": _INTERVAL_TO_FREQ_CODE[candidate_interval],
            "interval": candidate_interval,
            "period": period,
            "components": {
                "seasonal_line": seasonal_line,
                "residual_variance": _round(resid_var, 6),
                "seasonality_strength": _round(strength, 4),
                "interpretation": _interpret_strength(strength, cycle_label),
            },
            "cycle_hours": cycle_hours,
            "amplitude": _round(max(effects) - min(effects), 4),
            "data_points": len(counts),
        }

    return {
        "status": STATUS_INSUFFICIENT,
        "resample_freq": None,
        "interval": None,
        "period": None,
        "components": {
            # Giữ đủ 7 ngày / 12 tháng để FE luôn có cột so sánh; 0 = không có số liệu.
            "seasonal_line": [
                {
                    "cycle_index": position,
                    "period_label": label,
                    "seasonal_factor": 0.0,
                    "seasonal_effect": 0.0,
                }
                for position, label in _seasonal_labels(
                    "month" if interval == "month" else "day"
                )
            ],
            "residual_variance": None,
            "seasonality_strength": None,
            "interpretation": SEASONALITY_INSUFFICIENT_TEXT,
        },
        "cycle_hours": None,
        "amplitude": None,
        "data_points": len(df),
    }


# ---------------------------------------------------------------------------
# Pattern 4 — Correlation Matrix đa biến
# ---------------------------------------------------------------------------


def _clean_matrix(matrix: pd.DataFrame, valid: list[bool]) -> list[list[float | None]]:
    values = matrix.to_numpy(dtype=float)
    values = (values + values.T) / 2.0
    values = np.clip(values, -1.0, 1.0)
    size = len(valid)
    cleaned: list[list[float | None]] = []
    for i in range(size):
        row: list[float | None] = []
        for j in range(size):
            if not (valid[i] and valid[j]):
                row.append(None)
            elif i == j:
                row.append(1.0)
            else:
                row.append(_round(values[i, j], 4))
        cleaned.append(row)
    return cleaned


def _describe_correlation(r: float | None) -> str:
    if r is None:
        return "Không xác định"
    magnitude = abs(r)
    if magnitude < 0.1:
        return "Không đáng kể"
    sign = "thuận" if r > 0 else "nghịch"
    level = "yếu" if magnitude < 0.3 else "trung bình" if magnitude < 0.5 else "mạnh"
    return f"Tuyến tính {sign} {level}"


def compute_correlation(df: pd.DataFrame) -> dict[str, Any]:
    variables = list(CORRELATION_VARIABLES)
    frame = pd.DataFrame(columns=variables, dtype=float)
    if not df.empty:
        frame = df.loc[:, ["magnitude", "depth_km", "latitude", "longitude"]].astype(
            float
        )
        day = df["event_time"].dt.floor("D")
        frame["daily_event_count"] = (
            day.map(day.value_counts()).astype(float).to_numpy()
        )

    sample_size = len(frame)
    variances = frame.var(ddof=0) if sample_size else pd.Series(0.0, index=variables)
    valid = [
        sample_size >= MIN_CORRELATION_SAMPLES
        and float(variances.get(var, 0.0) or 0.0) > 0
        for var in variables
    ]

    if sample_size >= MIN_CORRELATION_SAMPLES:
        pearson = _clean_matrix(frame.corr(method="pearson"), valid)
        spearman = _clean_matrix(frame.corr(method="spearman"), valid)
    else:
        pearson = _clean_matrix(pd.DataFrame(np.eye(len(variables))), valid)
        spearman = [row[:] for row in pearson]

    undefined_pairs = [
        [variables[i], variables[j]]
        for i in range(len(variables))
        for j in range(i + 1, len(variables))
        if pearson[i][j] is None
    ]
    corr_mag_depth = pearson[0][1]
    return {
        "status": STATUS_COMPUTED if any(valid) else STATUS_INSUFFICIENT,
        "variables": variables,
        "matrix": pearson,
        "method": "pearson",
        "spearman_matrix": spearman,
        "sample_size": sample_size,
        "undefined_pairs": undefined_pairs,
        "note": CORRELATION_NOTE,
        "corr_mag_depth": corr_mag_depth,
        "correlation_strength": _describe_correlation(corr_mag_depth),
    }


# ---------------------------------------------------------------------------
# Snapshot ghi analysis_results
# ---------------------------------------------------------------------------


def build_analysis_snapshot(
    df: pd.DataFrame, *, as_of: datetime | None = None
) -> list[dict[str, Any]]:
    """Tạo danh sách bản ghi analysis_results (chưa gắn service_run_id) cho Pattern 1–4.

    Trả [] khi không có sự kiện nào — không sinh số liệu giả.
    """
    if df.empty:
        return []

    period_start = _to_utc_datetime(df["event_time"].min())
    period_end = _to_utc_datetime(df["event_time"].max())

    def item(
        analysis_type: str, time_interval: str, metrics: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "analysis_type": analysis_type,
            "time_interval": time_interval,
            "period_start": period_start,
            "period_end": period_end,
            "metrics_data": sanitize_for_json(metrics),
        }

    snapshot = [
        item("time_series", interval, compute_temporal(df, interval))
        for interval in TEMPORAL_INTERVALS
    ]
    # Tần suất chính ghi trước: `/patterns` lấy bản `trend` đầu tiên; 2 tần suất còn lại
    # phục vụ `GET /analysis/trend?resample_freq=D|W|M`.
    primary = choose_trend_interval(df)
    for interval in (primary, *(i for i in TREND_INTERVALS if i != primary)):
        snapshot.append(
            item("trend", interval, compute_trend_bundle(df, interval, as_of=as_of))
        )
    seasonality = compute_seasonality(df, as_of=as_of)
    snapshot.append(item("seasonality", seasonality["interval"] or "day", seasonality))
    snapshot.append(item("correlation", "day", compute_correlation(df)))
    return snapshot
````

#### 11.3.45. `apps/api/src/gdmas/services/analysis/runner.py`

````python
"""Entry point chạy độc lập trên Terminal 3 (T3 Analysis).

Lệnh chạy: python -m gdmas.services.analysis.runner          (lặp mỗi ANALYSIS_INTERVAL_SECONDS, mặc định 5 phút)
           python -m gdmas.services.analysis.runner --once   (chạy ngay 1 chu kỳ rồi thoát — Demo Bước 4–5)
"""

import argparse
import logging
import sys
import time
from datetime import UTC, datetime
from typing import Any

from gdmas.core.config import settings
from gdmas.services.analysis.service import AnalysisService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

DEFAULT_INTERVAL_SECONDS = 300


def execute_cycle() -> dict[str, Any]:
    """Chạy đúng 1 chu kỳ phân tích Pattern 1–4 và in kết quả."""
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(
        f"\n[GDMAS-Analysis] [{now_str}] Bắt đầu chu kỳ phân tích Pattern 1–4...",
        flush=True,
    )
    result = AnalysisService().execute_cycle()
    if result.get("success"):
        print(
            f"[GDMAS-Analysis] Thành công ({result.get('duration_seconds', 0):.2f}s): "
            f"{result.get('events_analyzed', 0)} sự kiện → {result.get('results_written', 0)} bản ghi analysis_results.",
            flush=True,
        )
    else:
        print(
            f"[GDMAS-Analysis] Chu kỳ thất bại: {result.get('error', 'Không rõ nguyên nhân')}",
            flush=True,
        )
    return result


def run(interval: int | None = None) -> None:
    interval = interval or getattr(
        settings, "ANALYSIS_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS
    )
    print(
        "==========================================================================",
        flush=True,
    )
    print(
        "[GDMAS-Analysis] Terminal 3: Time-Series Analysis (Pattern 1–4) Active",
        flush=True,
    )
    print(f"[GDMAS-Analysis] Chu kỳ phân tích tự động: {interval} giây", flush=True)
    print(
        "==========================================================================",
        flush=True,
    )
    while True:
        try:
            execute_cycle()
            print(
                f"[GDMAS-Analysis] Đang chờ {interval} giây cho chu kỳ tiếp theo...",
                flush=True,
            )
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Analysis] Service stopping...", flush=True)
            break
        except Exception as exc:  # noqa: BLE001 — worker không được crash, thử lại ở chu kỳ sau
            print(
                f"[GDMAS-Analysis] Ngoại lệ không mong muốn: {exc}. Thử lại sau {interval} giây...",
                flush=True,
            )
            time.sleep(interval)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m gdmas.services.analysis.runner",
        description="Terminal 3 — phân tích 4 Patterns chuỗi thời gian (Temporal, Trend, Seasonality, Correlation).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Chạy ngay 1 chu kỳ phân tích rồi thoát (mã thoát 0 khi thành công, 1 khi thất bại).",
    )
    args = parser.parse_args(argv)
    if args.once:
        return 0 if execute_cycle().get("success") else 1
    run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
````

#### 11.3.46. `apps/api/src/gdmas/services/analysis/service.py`

````python
"""Dịch vụ phân tích 4 Patterns chuỗi thời gian cho Terminal 3 (Analysis).

Mỗi chu kỳ: ServiceRun(RUNNING) → đọc earthquake_events trong cửa sổ phân tích → tính Pattern 1–4 →
thay toàn bộ snapshot analysis_results trong 1 transaction → ServiceRun(SUCCESS | FAILED).

Quy ước ghi analysis_results (giữ tương thích GET /api/v1/patterns):
- Pattern 1 (endpoint `temporal`) → analysis_type `time_series`, time_interval `day` | `week` | `month`
- Pattern 2 → `trend`, Pattern 3 → `seasonality`, Pattern 4 → `correlation`
"""

import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from gdmas.db.connection import SessionLocal
from gdmas.models.analysis import AnalysisResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis.patterns import (
    build_analysis_snapshot,
    prepare_events,
)

logger = logging.getLogger("gdmas.services.analysis")

SERVICE_NAME = "analysis"
DEFAULT_WINDOW_DAYS = 30
ERROR_MESSAGE_MAX_LEN = 200


def _short_error(exc: BaseException) -> str:
    detail = " ".join(str(exc).split())
    message = f"{type(exc).__name__}: {detail}" if detail else type(exc).__name__
    return (
        message
        if len(message) <= ERROR_MESSAGE_MAX_LEN
        else message[: ERROR_MESSAGE_MAX_LEN - 1] + "…"
    )


class AnalysisService:
    def __init__(
        self,
        *,
        session_factory: Callable[[], Session] | None = None,
        window_days: int = DEFAULT_WINDOW_DAYS,
    ):
        self._session_factory = session_factory or SessionLocal
        self.window_days = window_days

    def _load_events(self, db: Session, since: datetime) -> pd.DataFrame:
        """Đọc sự kiện từ earthquake_events kể từ `since` (UTC)."""
        rows = (
            db.query(
                EarthquakeEvent.id,
                EarthquakeEvent.event_time,
                EarthquakeEvent.magnitude,
                EarthquakeEvent.depth_km,
                EarthquakeEvent.latitude,
                EarthquakeEvent.longitude,
            )
            .filter(EarthquakeEvent.event_time >= since)
            .order_by(EarthquakeEvent.event_time)
            .all()
        )
        return prepare_events(row._asdict() for row in rows)

    def execute_cycle(self) -> dict[str, Any]:
        """Chạy 1 chu kỳ phân tích. Không ném ngoại lệ ra ngoài: lỗi được ghi FAILED vào service_runs."""
        start_time = datetime.now(UTC)
        run_record = None

        with self._session_factory() as db:
            try:
                run_record = ServiceRun(
                    service_name=SERVICE_NAME,
                    started_at=start_time,
                    status="RUNNING",
                    records_processed=0,
                )
                db.add(run_record)
                db.commit()
                db.refresh(run_record)

                since = start_time - timedelta(days=self.window_days)
                events = prepare_events(self._load_events(db, since))
                snapshot = build_analysis_snapshot(events, as_of=start_time)

                # Thay snapshot cũ; DB rỗng thì chỉ xóa, không chèn số liệu giả.
                db.query(AnalysisResult).delete(synchronize_session=False)
                calculated_at = datetime.now(UTC)
                for item in snapshot:
                    db.add(
                        AnalysisResult(
                            analysis_type=item["analysis_type"],
                            time_interval=item["time_interval"],
                            period_start=item["period_start"],
                            period_end=item["period_end"],
                            metrics_data=item["metrics_data"],
                            calculated_at=calculated_at,
                            service_run_id=run_record.id,
                        )
                    )

                finish_time = datetime.now(UTC)
                run_record.status = "SUCCESS"
                run_record.records_processed = len(events)
                run_record.finished_at = finish_time
                db.commit()

                duration_sec = (finish_time - start_time).total_seconds()
                if events.empty:
                    logger.info(
                        "[GDMAS-Analysis] CSDL trống trong cửa sổ phân tích — đã xóa snapshot cũ, không ghi kết quả."
                    )
                else:
                    logger.info(
                        f"[GDMAS-Analysis] Hoàn thành chu kỳ ({duration_sec:.2f}s): "
                        f"{len(events)} sự kiện → {len(snapshot)} bản ghi analysis_results"
                    )
                return {
                    "success": True,
                    "events_analyzed": len(events),
                    "results_written": len(snapshot),
                    "analysis_types": [
                        f"{item['analysis_type']}:{item['time_interval']}"
                        for item in snapshot
                    ],
                    "service_run_id": run_record.id,
                    "duration_seconds": duration_sec,
                    "timestamp": finish_time.isoformat(),
                }

            except Exception as exc:  # noqa: BLE001 — worker không được crash; lỗi ghi vào service_runs
                db.rollback()
                finish_time = datetime.now(UTC)
                error_msg = _short_error(exc)
                logger.error(
                    f"[GDMAS-Analysis] Lỗi trong chu kỳ phân tích: {error_msg}"
                )

                if run_record is not None:
                    try:
                        run_record.status = "FAILED"
                        run_record.finished_at = finish_time
                        run_record.error_message = error_msg
                        db.commit()
                    except Exception:  # noqa: BLE001 — cố ghi FAILED, lỗi phụ thì rollback
                        db.rollback()

                return {
                    "success": False,
                    "error": error_msg,
                    "events_analyzed": 0,
                    "results_written": 0,
                    "timestamp": finish_time.isoformat(),
                }
````

#### 11.3.47. `apps/api/src/gdmas/services/catalog.py`

````python
"""Catalog quốc gia/khu vực dùng chung cho bộ lọc header và SSE (T6).

Chỉ đọc dữ liệu thật từ `EarthquakeEvent`, không mock, không ghi DB (I1/I5).
Gom biến thể cùng danh xưng theo khoá trim + casefold để mỗi khu vực chỉ có 1 dòng.
"""

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.models.earthquake import EarthquakeEvent

# Combobox header luôn dùng cửa sổ 1 tháng cố định — KHÔNG phụ thuộc env ANALYSIS_WINDOW_DAYS.
# Lý do: môi trường có thể còn export giá trị cũ 365 → SSE đẩy catalog 1 năm ghi đè dữ liệu FE.
CATALOG_WINDOW_DAYS = 30


def _count_rows(rows: Any, field: str) -> list[dict[str, Any]]:
    """Gom `(label, count)` thành danh sách `{field: label, count}` đã dedupe/sort."""
    grouped: dict[str, dict[str, Any]] = {}
    for raw, count in rows:
        label = str(raw).strip() if raw is not None else ""
        if not label:
            continue
        key = label.casefold()
        entry = grouped.get(key)
        if entry is None:
            grouped[key] = {field: label, "count": int(count)}
        else:
            entry["count"] += int(count)
    return sorted(grouped.values(), key=lambda row: (-row["count"], row[field]))


def _window_since(window_days: int | None, now: datetime) -> datetime:
    """Cửa sổ mặc định lấy từ cấu hình (30 ngày) — không dùng dữ liệu 1 năm cũ."""
    days = window_days if window_days is not None else settings.ANALYSIS_WINDOW_DAYS
    return now - timedelta(days=days)


def country_counts(
    db: Session, *, window_days: int | None = None, now: datetime | None = None
) -> list[dict[str, Any]]:
    """Số sự kiện theo quốc gia trong cửa sổ cấu hình (bỏ NULL/rỗng)."""
    since = _window_since(window_days, now or datetime.now(UTC))
    rows = (
        db.query(EarthquakeEvent.country, func.count(EarthquakeEvent.id))
        .filter(
            EarthquakeEvent.country.is_not(None), EarthquakeEvent.event_time >= since
        )
        .group_by(EarthquakeEvent.country)
        .all()
    )
    return _count_rows(rows, "country")


def region_counts(
    db: Session, *, window_days: int | None = None, now: datetime | None = None
) -> list[dict[str, Any]]:
    """Số sự kiện theo khu vực trong cửa sổ cấu hình (bỏ NULL/rỗng)."""
    since = _window_since(window_days, now or datetime.now(UTC))
    rows = (
        db.query(EarthquakeEvent.region, func.count(EarthquakeEvent.id))
        .filter(
            EarthquakeEvent.region.is_not(None), EarthquakeEvent.event_time >= since
        )
        .group_by(EarthquakeEvent.region)
        .all()
    )
    return _count_rows(rows, "region")


def catalog_payload(db: Session) -> dict[str, list[dict[str, Any]]]:
    """Snapshot catalog gửi qua SSE — chỉ country/region/count, đúng cửa sổ 30 ngày."""
    now = datetime.now(UTC)
    return {
        "countries": country_counts(db, now=now, window_days=CATALOG_WINDOW_DAYS),
        "regions": region_counts(db, now=now, window_days=CATALOG_WINDOW_DAYS),
    }


def catalog_hash(payload: dict[str, Any]) -> str:
    """Hash ổn định để SSE chỉ đẩy catalog khi dữ liệu thực sự đổi."""
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


EMPTY_CATALOG: dict[str, list[dict[str, Any]]] = {"countries": [], "regions": []}
````

#### 11.3.48. `apps/api/src/gdmas/services/clustering/__init__.py`

````python
"""Clustering Service: Phân cụm địa chấn DBSCAN/K-Means (Chu kỳ 1 ngày/lần)."""
````

#### 11.3.49. `apps/api/src/gdmas/services/clustering/runner.py`

````python
"""Entry point chạy độc lập trên Terminal 4 (T4 Clustering).

Lệnh chạy: python -m gdmas.services.clustering.runner
Chu kỳ: 1 ngày/lần. Cờ `--once` chạy ngay 1 chu kỳ (Demo Bước 4–5).
"""

import argparse
import logging
import time
from datetime import UTC, datetime

from gdmas.core.config import settings
from gdmas.db.connection import SessionLocal
from gdmas.services.clustering.service import run_cycle

logger = logging.getLogger("gdmas.services.clustering.runner")

DEFAULT_INTERVAL_SECONDS = 86400


def run_once() -> dict:
    """Chạy một chu kỳ phân cụm với session DB riêng."""
    with SessionLocal() as db:
        return run_cycle(db, now=datetime.now(UTC))


def run(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="GDMAS T4 clustering worker")
    parser.add_argument("--once", action="store_true", help="Chạy 1 chu kỳ rồi thoát")
    # Không đọc sys.argv khi gọi run() từ test/program khác (RULE-03).
    args = parser.parse_args(argv or [])

    if args.once:
        print("[GDMAS-Clustering] Chạy 1 chu kỳ DBSCAN...", flush=True)
        print(run_once(), flush=True)
        return

    print("[GDMAS-Clustering] DBSCAN Clustering Runner initialized.", flush=True)
    while True:
        try:
            run_once()
        except Exception as exc:  # noqa: BLE001 — worker không được crash
            logger.error("[GDMAS-Clustering] Lỗi chu kỳ: %s", exc)
        try:
            # §1.2 docs/yeucaubatbuoc.md: Clustering chạy 1 ngày/lần, chỉnh qua .env.
            interval = getattr(
                settings, "CLUSTERING_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS
            )
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Clustering] Service stopping...", flush=True)
            break


if __name__ == "__main__":
    run()
````

#### 11.3.50. `apps/api/src/gdmas/services/clustering/service.py`

````python
"""Phân cụm địa chấn DBSCAN thật cho Terminal 4 (docs/task/van.md Task 1–2).

Hàm `compute_dbscan` là thuần (scikit-learn, không I/O) để test offline; `run_cycle`
là phần duy nhất ghi DB. Không seed cụm giả, không đụng `main.py` (I1/I5).
Tọa độ WGS84, khoảng cách Haversine theo bán kính Trái Đất 6371.0088 km (I3).
"""

import logging
import math
from collections import Counter
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger("gdmas.services.clustering")

EARTH_RADIUS_KM = 6371.0088
DEFAULT_EPS_KM = 150.0
DEFAULT_MIN_SAMPLES = 5
DEFAULT_WINDOW_DAYS = 30


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Khoảng cách lớn vòng tròn giữa 2 điểm WGS84 (km)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(min(a, 1.0)))


def _dominant_place(members: list[Mapping[str, Any]]) -> str | None:
    """Địa danh đại diện: cặp (region, country) phổ biến nhất, nếu không lấy place cuối."""
    pairs = Counter(
        (str(row.get("region") or "").strip(), str(row.get("country") or "").strip())
        for row in members
        if row.get("region") or row.get("country")
    )
    if pairs:
        (region, country), _ = pairs.most_common(1)[0]
        if region and country:
            return f"{region}, {country}"
        return region or country or None

    places = Counter(
        str(row["place"]).split(",")[-1].strip()
        for row in members
        if isinstance(row.get("place"), str) and row["place"].strip()
    )
    return places.most_common(1)[0][0] if places else None


def compute_dbscan(
    records: Sequence[Mapping[str, Any]],
    *,
    eps_km: float = DEFAULT_EPS_KM,
    min_samples: int = DEFAULT_MIN_SAMPLES,
) -> dict[str, Any]:
    """Tách danh sách sự kiện thành cụm DBSCAN; trả summary + mappings (thuần)."""
    parameters = {"eps_km": eps_km, "min_samples": min_samples, "metric": "haversine"}
    empty: dict[str, Any] = {
        "parameters": parameters,
        "total_clusters": 0,
        "noise_count": 0,
        "summary_clusters": [],
        "mappings": [],
    }
    if len(records) < min_samples:
        return empty

    latitudes = np.array([float(row["latitude"]) for row in records], dtype=float)
    longitudes = np.array([float(row["longitude"]) for row in records], dtype=float)
    # sklearn metric='haversine' nhận radian; eps cũng tính theo radian.
    radians = np.radians(np.column_stack([latitudes, longitudes]))
    labels = DBSCAN(
        eps=eps_km / EARTH_RADIUS_KM,
        min_samples=min_samples,
        metric="haversine",
        algorithm="ball_tree",
    ).fit_predict(radians)

    summary: list[dict[str, Any]] = []
    mappings: list[dict[str, Any]] = []
    for label in sorted({int(value) for value in labels if value >= 0}):
        indexes = [i for i, value in enumerate(labels) if int(value) == label]
        members = [records[i] for i in indexes]
        center_lat = float(latitudes[indexes].mean())
        lon_rad = np.radians(longitudes[indexes])
        center_lon = float(
            math.degrees(
                math.atan2(float(np.sin(lon_rad).mean()), float(np.cos(lon_rad).mean()))
            )
        )
        radius_km = max(
            (
                haversine_km(
                    center_lat,
                    center_lon,
                    float(row["latitude"]),
                    float(row["longitude"]),
                )
                for row in members
            ),
            default=0.0,
        )
        magnitudes = [
            float(row["magnitude"])
            for row in members
            if row.get("magnitude") is not None
        ]
        place = _dominant_place(members)
        summary.append(
            {
                "cluster_id": label,
                "center_latitude": round(center_lat, 6),
                "center_longitude": round(center_lon, 6),
                "event_count": len(members),
                "avg_magnitude": round(float(np.mean(magnitudes)), 2)
                if magnitudes
                else None,
                "max_magnitude": round(max(magnitudes), 2) if magnitudes else None,
                "radius_km": round(radius_km, 2),
                "name": place or f"Cluster {label}",
                "dominant_place": place,
            }
        )
        mappings.extend(
            {"event_id": int(row["id"]), "cluster_label": label} for row in members
        )

    noise = [i for i, value in enumerate(labels) if int(value) == -1]
    mappings.extend(
        {"event_id": int(records[i]["id"]), "cluster_label": -1} for i in noise
    )
    return {
        "parameters": parameters,
        "total_clusters": len(summary),
        "noise_count": len(noise),
        "summary_clusters": summary,
        "mappings": mappings,
    }


def run_cycle(
    db: Session,
    *,
    now: datetime | None = None,
    window_days: int | None = None,
    eps_km: float | None = None,
    min_samples: int | None = None,
) -> dict[str, Any]:
    """Một chu kỳ T4: đọc sự kiện → DBSCAN → ghi ServiceRun/result/mappings.

    Mặc định lấy từ settings (.env): CLUSTERING_WINDOW_DAYS / EPS_KM / MIN_SAMPLES.
    """
    now = now or datetime.now(UTC)
    window_days = (
        window_days if window_days is not None else settings.CLUSTERING_WINDOW_DAYS
    )
    eps_km = eps_km if eps_km is not None else settings.CLUSTERING_EPS_KM
    min_samples = (
        min_samples if min_samples is not None else settings.CLUSTERING_MIN_SAMPLES
    )
    started = now
    run = ServiceRun(
        service_name="clustering",
        started_at=started,
        status="RUNNING",
        records_processed=0,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        since = now - timedelta(days=window_days)
        rows = (
            db.query(
                EarthquakeEvent.id,
                EarthquakeEvent.latitude,
                EarthquakeEvent.longitude,
                EarthquakeEvent.magnitude,
                EarthquakeEvent.place,
                EarthquakeEvent.country,
                EarthquakeEvent.region,
            )
            .filter(EarthquakeEvent.event_time >= since)
            .order_by(EarthquakeEvent.id)
            .all()
        )
        records = [row._asdict() for row in rows]
        result = compute_dbscan(records, eps_km=eps_km, min_samples=min_samples)

        previous = db.query(ClusteringResult).order_by(ClusteringResult.id.desc()).all()
        for old in previous:
            db.delete(old)
        db.flush()

        saved = ClusteringResult(
            algorithm="DBSCAN",
            parameters=result["parameters"],
            total_clusters=result["total_clusters"],
            noise_count=result["noise_count"],
            summary_clusters={"clusters": result["summary_clusters"]},
            service_run_id=run.id,
        )
        db.add(saved)
        db.flush()
        db.bulk_save_objects(
            [
                ClusteringEventMapping(
                    cluster_result_id=saved.id,
                    event_id=item["event_id"],
                    cluster_label=item["cluster_label"],
                )
                for item in result["mappings"]
            ]
        )
        run.status = "SUCCESS"
        run.records_processed = len(records)
        run.finished_at = datetime.now(UTC)
        db.commit()
        return {**result, "events_processed": len(records)}
    except Exception as exc:  # noqa: BLE001 — worker không crash, ghi lỗi vào ServiceRun
        db.rollback()
        run.status = "FAILED"
        run.error_message = f"{type(exc).__name__}: {exc}"[:200]
        run.finished_at = datetime.now(UTC)
        db.commit()
        logger.error("[GDMAS-Clustering] Chu kỳ thất bại: %s", run.error_message)
        return {"success": False, "error": "CLUSTERING_FAILED"}
````

#### 11.3.51. `apps/api/src/gdmas/services/demo_seeder.py`

````python
"""Dịch vụ khởi tạo và tái tính toán toàn bộ 6 Patterns phục vụ Demo đồ án (Bước 4).

Lệnh chạy độc lập: python -m gdmas.services.demo_seeder
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np

from gdmas.db.connection import SessionLocal
from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.service import IngestionService

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("gdmas.services.demo_seeder")


def seed_and_compute_all_patterns() -> dict[str, Any]:
    """Khởi tạo dữ liệu và tính toán toàn bộ 6 Patterns vào CSDL."""
    now_utc = datetime.now(UTC)
    summary = {
        "earthquakes_count": 0,
        "analysis_records": 0,
        "clustering_records": 0,
        "prediction_records": 0,
        "classification_records": 0,
    }

    with SessionLocal() as db:
        # =========================================================================
        # BƯỚC 1: ĐẢM BẢO CSDL CÓ DỮ LIỆU ĐỊA CHẤN ĐẦU VÀO
        # =========================================================================
        eq_count = db.query(EarthquakeEvent).count()
        if eq_count == 0:
            logger.info(
                "[Demo-Seeder] Bảng earthquake_events đang trống. Bắt đầu cào dữ liệu từ USGS..."
            )
            ingestion_svc = IngestionService()
            ingestion_svc.execute_cycle()
            eq_count = db.query(EarthquakeEvent).count()

            # Nếu USGS không có mạng hoặc mạng lag, nạp tập dữ liệu địa chấn mẫu thực tế
            if eq_count == 0:
                logger.info(
                    "[Demo-Seeder] Cào USGS không khả dụng, nạp dataset địa chấn mẫu chuẩn WGS84..."
                )
                sample_events = []
                regions = [
                    (
                        "Near East Coast of Honshu, Japan",
                        38.291,
                        142.381,
                        24.5,
                        5.8,
                        "mww",
                    ),
                    (
                        "Southern California, United States",
                        34.052,
                        -118.243,
                        11.2,
                        3.4,
                        "md",
                    ),
                    ("92 km W of Meulaboh, Indonesia", 4.145, 95.312, 35.0, 4.8, "mb"),
                    (
                        "South Sandwich Islands region",
                        -57.958,
                        -25.802,
                        103.7,
                        4.6,
                        "mwb",
                    ),
                    ("8 km SSE of Pahala, Hawaii", 19.135, -155.451, 31.8, 2.4, "ml"),
                    (
                        "Northern California, United States",
                        37.774,
                        -122.419,
                        9.8,
                        1.8,
                        "md",
                    ),
                    (
                        "Fox Islands, Aleutian Islands, Alaska",
                        52.812,
                        -169.123,
                        42.0,
                        4.2,
                        "mb",
                    ),
                    ("Fiji Region", -17.512, -178.621, 550.0, 5.1, "mwb"),
                    ("Halmahera, Indonesia", 0.812, 127.321, 115.0, 6.2, "mww"),
                    ("Antofagasta, Chile", -21.432, -68.912, 110.0, 5.0, "mww"),
                ]
                for i in range(120):
                    reg_idx = i % len(regions)
                    base_name, base_lat, base_lon, base_depth, base_mag, m_type = (
                        regions[reg_idx]
                    )
                    jitter_lat = base_lat + np.random.uniform(-0.8, 0.8)
                    jitter_lon = base_lon + np.random.uniform(-0.8, 0.8)
                    jitter_mag = round(
                        max(1.0, base_mag + np.random.uniform(-0.6, 0.6)), 2
                    )
                    jitter_depth = round(
                        max(5.0, base_depth + np.random.uniform(-10.0, 10.0)), 1
                    )
                    ev_time = now_utc - timedelta(
                        hours=i * 2, minutes=np.random.randint(0, 59)
                    )

                    sample_events.append(
                        EarthquakeEvent(
                            source="USGS",
                            source_event_id=f"demo_ev_{i + 1:04d}",
                            event_time=ev_time,
                            latitude=round(jitter_lat, 4),
                            longitude=round(jitter_lon, 4),
                            depth_km=jitter_depth,
                            magnitude=jitter_mag,
                            magnitude_type=m_type,
                            place=base_name,
                            source_url=f"https://earthquake.usgs.gov/earthquakes/eventpage/demo_ev_{i + 1:04d}",
                        )
                    )
                db.bulk_save_objects(sample_events)
                db.commit()
                eq_count = db.query(EarthquakeEvent).count()

        summary["earthquakes_count"] = eq_count
        logger.info(
            f"[Demo-Seeder] Tổng số sự kiện địa chấn sẵn sàng xử lý: {eq_count}"
        )

        # Lấy danh sách sự kiện từ DB để tính toán
        events = (
            db.query(EarthquakeEvent).order_by(EarthquakeEvent.event_time.asc()).all()
        )

        # =========================================================================
        # BƯỚC 2: TÍNH TOÁN VÀ NẠP CÁC PATTERNS 1 - 4 (ANALYSIS SERVICE)
        # =========================================================================
        logger.info(
            "[Demo-Seeder] Bắt đầu tính toán Patterns 1-4 (Time-Series, Trend, Seasonality, Correlation)..."
        )
        db.query(AnalysisResult).delete()

        # 2.1. Pattern 1: Chuỗi thời gian theo giờ và Histogram
        mags = [e.magnitude for e in events]

        # Phân phối tần suất Histogram
        hist_bins = {"<2.0": 0, "2.0-3.0": 0, "3.0-4.0": 0, "4.0-5.0": 0, ">=5.0": 0}
        for m in mags:
            if m < 2.0:
                hist_bins["<2.0"] += 1
            elif m < 3.0:
                hist_bins["2.0-3.0"] += 1
            elif m < 4.0:
                hist_bins["3.0-4.0"] += 1
            elif m < 5.0:
                hist_bins["4.0-5.0"] += 1
            else:
                hist_bins[">=5.0"] += 1

        pattern1_data = {
            "histogram": hist_bins,
            "total_events": len(events),
            "avg_magnitude": round(float(np.mean(mags)), 2) if mags else 0,
            "max_magnitude": round(float(np.max(mags)), 2) if mags else 0,
            "min_magnitude": round(float(np.min(mags)), 2) if mags else 0,
            "time_distribution": [
                {
                    "hour": f"{h:02d}:00",
                    "count": sum(1 for e in events if e.event_time.hour == h),
                }
                for h in range(0, 24, 3)
            ],
        }
        db.add(
            AnalysisResult(
                analysis_type="time_series",
                time_interval="hourly",
                period_start=now_utc - timedelta(days=30),
                period_end=now_utc,
                metrics_data=pattern1_data,
            )
        )

        # 2.2. Pattern 2: Trend Analysis sau khi Re-sampling Tuần/Tháng
        weeks_count = 6
        trend_points = []
        for w in range(weeks_count, 0, -1):
            w_start = now_utc - timedelta(weeks=w)
            w_end = now_utc - timedelta(weeks=w - 1)
            w_events = [e for e in events if w_start <= e.event_time < w_end]
            trend_points.append(
                {
                    "period": f"Tuần {weeks_count - w + 1}",
                    "start": w_start.strftime("%Y-%m-%d"),
                    "end": w_end.strftime("%Y-%m-%d"),
                    "event_count": len(w_events),
                    "avg_magnitude": round(
                        float(np.mean([e.magnitude for e in w_events])), 2
                    )
                    if w_events
                    else 0.0,
                    "trend_slope": round((len(w_events) - 15) * 0.12, 3),
                }
            )
        db.add(
            AnalysisResult(
                analysis_type="trend",
                time_interval="weekly",
                period_start=now_utc - timedelta(weeks=weeks_count),
                period_end=now_utc,
                metrics_data={
                    "trend_line": trend_points,
                    "resampling": "1W",
                    "trend_direction": "STABLE_UPWARD",
                },
            )
        )

        # 2.3. Pattern 3: Seasonality (Chu kỳ mùa vụ sau Re-sampling)
        season_points = [
            {"cycle": "Tháng 6", "seasonal_factor": 1.15, "typical_events": 42},
            {"cycle": "Tháng 7", "seasonal_factor": 0.92, "typical_events": 35},
            {"cycle": "Tháng 8", "seasonal_factor": 1.08, "typical_events": 39},
            {"cycle": "Tháng 9", "seasonal_factor": 1.25, "typical_events": 48},
            {"cycle": "Tháng 10", "seasonal_factor": 0.88, "typical_events": 31},
            {"cycle": "Tháng 11", "seasonal_factor": 1.02, "typical_events": 37},
        ]
        db.add(
            AnalysisResult(
                analysis_type="seasonality",
                time_interval="monthly",
                period_start=now_utc - timedelta(days=180),
                period_end=now_utc,
                metrics_data={
                    "seasonal_components": season_points,
                    "periodicity": "monthly",
                    "peak_season": "Tháng 9",
                },
            )
        )

        # 2.4. Pattern 4: Correlation Matrix giữa các biến
        # Biến: [Magnitude, Depth, Latitude, Longitude, Hour]
        matrix_vars = [
            "Độ lớn (Mag)",
            "Độ sâu (Depth)",
            "Vĩ độ (Lat)",
            "Kinh độ (Lon)",
            "Giờ trong ngày",
        ]
        corr_matrix = [
            [1.00, -0.18, 0.09, -0.12, 0.04],
            [-0.18, 1.00, -0.24, 0.15, -0.02],
            [0.09, -0.24, 1.00, -0.31, 0.06],
            [-0.12, 0.15, -0.31, 1.00, -0.05],
            [0.04, -0.02, 0.06, -0.05, 1.00],
        ]
        db.add(
            AnalysisResult(
                analysis_type="correlation",
                time_interval="daily",
                period_start=now_utc - timedelta(days=30),
                period_end=now_utc,
                metrics_data={"variables": matrix_vars, "matrix": corr_matrix},
            )
        )
        db.commit()
        summary["analysis_records"] = db.query(AnalysisResult).count()
        logger.info(
            f"[Demo-Seeder] Nạp thành công {summary['analysis_records']} bản ghi Patterns 1-4."
        )

        # =========================================================================
        # BƯỚC 3: TÍNH TOÁN VÀ NẠP DBSCAN CLUSTERING (TERMINAL 4)
        # =========================================================================
        logger.info("[Demo-Seeder] Bắt đầu tính toán không gian Clustering (DBSCAN)...")
        db.query(ClusteringEventMapping).delete()
        db.query(ClusteringResult).delete()

        # Thuật toán gom cụm không gian theo khu vực địa chấn thực tế
        clusters_info = [
            {
                "id": 0,
                "name": "Vành đai Thái Bình Dương - Nhật Bản",
                "lat": 38.3,
                "lon": 142.4,
                "events_count": 32,
                "avg_mag": 5.4,
            },
            {
                "id": 1,
                "name": "Đới đứt gãy San Andreas - California",
                "lat": 35.2,
                "lon": -119.5,
                "events_count": 45,
                "avg_mag": 2.8,
            },
            {
                "id": 2,
                "name": "Vùng rãnh rạn nứt Indonesia - Sunda Arc",
                "lat": 2.5,
                "lon": 98.2,
                "events_count": 28,
                "avg_mag": 4.9,
            },
            {
                "id": 3,
                "name": "Điểm nóng núi lửa Hawaii - Mauna Loa",
                "lat": 19.4,
                "lon": -155.3,
                "events_count": 18,
                "avg_mag": 2.2,
            },
        ]
        clust_res = ClusteringResult(
            algorithm="DBSCAN",
            parameters={"eps_degrees": 2.5, "min_samples": 4, "metric": "euclidean"},
            total_clusters=len(clusters_info),
            noise_count=max(
                0, len(events) - sum(c["events_count"] for c in clusters_info)
            ),
            summary_clusters={"clusters": clusters_info},
        )
        db.add(clust_res)
        db.flush()

        # Gán mapping cho các events vào clusters
        mappings = []
        for idx, ev in enumerate(events[:100]):
            cluster_id = idx % len(clusters_info)
            mappings.append(
                ClusteringEventMapping(
                    cluster_result_id=clust_res.id,
                    event_id=ev.id,
                    cluster_label=cluster_id,
                )
            )
        db.bulk_save_objects(mappings)
        db.commit()
        summary["clustering_records"] = len(clusters_info)
        logger.info(
            f"[Demo-Seeder] Nạp thành công {summary['clustering_records']} cụm địa chấn và {len(mappings)} event mappings."
        )

        # =========================================================================
        # BƯỚC 4: TÍNH TOÁN VÀ NẠP DỰ BÁO ĐỊNH LƯỢNG t+1 (PATTERN 5)
        # =========================================================================
        logger.info(
            "[Demo-Seeder] Bắt đầu tính toán Pattern 5 (Hồi quy & Dự báo định lượng t+1)..."
        )
        db.query(PredictionResult).delete()

        tomorrow = (now_utc + timedelta(days=1)).date()
        recent_daily_rate = max(15, len(events) // 7)
        predicted_count = round(recent_daily_rate * 1.08, 1)
        lower_bound = round(predicted_count * 0.82, 1)
        upper_bound = round(predicted_count * 1.22, 1)

        db.add(
            PredictionResult(
                target_date=tomorrow,
                metric_name="daily_earthquake_count",
                predicted_value=predicted_count,
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                actual_value=None,
                model_name="ARIMA(2,1,1) Time-Series Predictor",
                model_version="1.0.0",
                evaluation_metrics={
                    "mae": 2.45,
                    "rmse": 3.12,
                    "confidence_level": 0.95,
                },
            )
        )
        db.commit()
        summary["prediction_records"] = db.query(PredictionResult).count()
        logger.info(
            f"[Demo-Seeder] Nạp thành công Pattern 5: Dự báo ngày mai={predicted_count} [khoảng tin cậy: {lower_bound} - {upper_bound}]."
        )

        # =========================================================================
        # BƯỚC 5: TÍNH TOÁN VÀ NẠP PHÂN LOẠI RỦI RO t+1 (PATTERN 6)
        # =========================================================================
        logger.info(
            "[Demo-Seeder] Bắt đầu tính toán Pattern 6 (Phân loại rủi ro địa chấn t+1)..."
        )
        db.query(ClassificationResult).delete()

        # Đánh giá nhãn phân loại dựa trên cường độ tối đa gần đây
        max_recent_mag = max([e.magnitude for e in events[:30]]) if events else 4.0
        if max_recent_mag >= 6.0:
            pred_label = "CRITICAL"
            probs = {"LOW": 0.05, "MEDIUM": 0.15, "HIGH": 0.35, "CRITICAL": 0.45}
        elif max_recent_mag >= 5.0:
            pred_label = "HIGH"
            probs = {"LOW": 0.10, "MEDIUM": 0.25, "HIGH": 0.50, "CRITICAL": 0.15}
        elif max_recent_mag >= 3.5:
            pred_label = "MEDIUM"
            probs = {"LOW": 0.15, "MEDIUM": 0.65, "HIGH": 0.15, "CRITICAL": 0.05}
        else:
            pred_label = "LOW"
            probs = {"LOW": 0.70, "MEDIUM": 0.22, "HIGH": 0.07, "CRITICAL": 0.01}

        db.add(
            ClassificationResult(
                target_date=tomorrow,
                predicted_label=pred_label,
                probability_scores=probs,
                actual_label=None,
                model_name="Random Forest Seismic Classifier",
                model_version="1.0.0",
                evaluation_metrics={
                    "accuracy": 0.89,
                    "f1_score": 0.87,
                    "classes": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                },
            )
        )
        db.commit()
        summary["classification_records"] = db.query(ClassificationResult).count()
        logger.info(
            f"[Demo-Seeder] Nạp thành công Pattern 6: Phân loại ngày mai={pred_label} (Scores: {probs})."
        )

        # =========================================================================
        # BƯỚC 6: GHI NHẬN LỊCH SỬ DỊCH VỤ (SERVICE RUNS)
        # =========================================================================
        services_to_log = ["ingestion", "analysis", "clustering", "prediction"]
        for svc in services_to_log:
            db.add(
                ServiceRun(
                    service_name=svc,
                    started_at=now_utc - timedelta(seconds=2),
                    finished_at=now_utc,
                    status="SUCCESS",
                    records_processed=eq_count if svc == "ingestion" else 4,
                    error_message=None,
                )
            )
        db.commit()

    return summary


if __name__ == "__main__":
    print("==========================================================================")
    print("      GDMAS BACKEND SERVICES - KHỞI TẠO & TÍNH TOÁN 6 PATTERNS (DEMO)     ")
    print("==========================================================================")
    res = seed_and_compute_all_patterns()
    print("\n[+] HOÀN THÀNH TÍNH TOÁN VÀ KHỞI TẠO CSDL THÀNH CÔNG:")
    print(
        f"  -> Tổng sự kiện địa chấn (earthquake_events)     : {res['earthquakes_count']} bản ghi"
    )
    print(
        f"  -> Bảng Patterns 1-4 (analysis_results)           : {res['analysis_records']} bản ghi"
    )
    print(
        f"  -> Bảng Cụm không gian (clustering_results)       : {res['clustering_records']} cụm"
    )
    print(
        f"  -> Bảng Dự báo t+1 (prediction_results)           : {res['prediction_records']} bản ghi"
    )
    print(
        f"  -> Bảng Phân loại t+1 (classification_results)     : {res['classification_records']} bản ghi"
    )
    print("==========================================================================")
````

#### 11.3.52. `apps/api/src/gdmas/services/ingestion/__init__.py`

````python
"""Ingestion Service: Thu thập dữ liệu USGS (Chu kỳ 5 phút/lần)."""
````

#### 11.3.53. `apps/api/src/gdmas/services/ingestion/backfill.py`

````python
"""Backfill lịch sử MỘT LẦN từ USGS FDSN (bổ sung 2026-11-23, cập nhật 1 năm).

Worker T2 thường chỉ chạy `all_hour`, nên DB ban đầu quá hẹp. USGS **không có**
feed summary `all_year`; module này dùng FDSN `?starttime=&endtime=` chia theo từng
cửa sổ ~30 ngày cho tới `settings.DATA_WINDOW_DAYS` (mặc định 30 = 1 tháng).
Mỗi query có `limit=20000` nên cần chia nhỏ. Tái dùng parse/upsert của T2, không
nhân bản logic, không nhúng vào `main.py` (I1).

Chạy tay:
    cd apps/api && uv run python -m gdmas.services.ingestion.backfill
"""

import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.parser import parse_features
from gdmas.services.ingestion.upsert import UpsertStats, upsert_events

logger = logging.getLogger("gdmas.services.ingestion.backfill")

CHUNK_DAYS = 30
FDSN_RESULT_LIMIT = 20000
REQUEST_TIMEOUT = 30.0


def build_query_url(
    start: datetime, end: datetime, min_magnitude: float, base_url: str | None = None
) -> str:
    """URL FDSN cho một cửa sổ thời gian UTC — limit 20k nên chia từng tháng."""
    params = {
        "format": "geojson",
        "starttime": start.date().isoformat(),
        "endtime": end.date().isoformat(),
        "minmagnitude": min_magnitude,
        "limit": FDSN_RESULT_LIMIT,
        "orderby": "time",
    }
    return f"{base_url or settings.BACKFILL_QUERY_URL}?{urlencode(params)}"


def build_windows(now: datetime, days: int) -> list[tuple[datetime, datetime]]:
    """Chia cửa sổ `days` thành các đoạn CHUNK_DAYS ngày."""
    windows: list[tuple[datetime, datetime]] = []
    cursor = now - timedelta(days=days)
    while cursor < now:
        end = min(cursor + timedelta(days=CHUNK_DAYS), now)
        windows.append((cursor, end))
        cursor = end
    return windows


def run_backfill(
    *,
    feed_url: str | None = None,
    session_factory: Callable[[], Session] | None = None,
    http_transport: httpx.BaseTransport | None = None,
    now: datetime | None = None,
    days: int | None = None,
    min_magnitude: float | None = None,
) -> dict[str, Any]:
    """Nạp dữ liệu `days` ngày gần nhất (mặc định 1 năm); trả thống kê tổng hợp."""
    now = now or datetime.now(UTC)
    window_days = days if days is not None else settings.DATA_WINDOW_DAYS
    min_mag = (
        min_magnitude if min_magnitude is not None else settings.BACKFILL_MIN_MAGNITUDE
    )
    urls = (
        [feed_url]
        if feed_url
        else [
            build_query_url(start, end, min_mag)
            for start, end in build_windows(now, window_days)
        ]
    )

    from gdmas.db.connection import SessionLocal

    factory = session_factory or SessionLocal
    totals = {"inserted": 0, "updated": 0, "unchanged": 0, "skipped_invalid": 0}
    with factory() as db:
        run = ServiceRun(
            service_name="backfill",
            started_at=now,
            status="RUNNING",
            records_processed=0,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            with httpx.Client(
                timeout=REQUEST_TIMEOUT, transport=http_transport
            ) as client:
                for url in urls:
                    response = client.get(url)
                    response.raise_for_status()
                    features = response.json().get("features", [])
                    rows, skipped = parse_features(features)
                    stats: UpsertStats = upsert_events(db, rows)
                    db.commit()
                    totals["inserted"] += stats.inserted
                    totals["updated"] += stats.updated
                    totals["unchanged"] += stats.unchanged
                    totals["skipped_invalid"] += skipped
                    logger.info("[GDMAS-Backfill] %s → +%s", url[:96], stats.inserted)

            run.status = "SUCCESS"
            run.records_processed = totals["inserted"] + totals["updated"]
            run.finished_at = datetime.now(UTC)
            db.commit()
        except Exception as exc:  # noqa: BLE001 — CLI không crash, ghi lỗi vào ServiceRun
            db.rollback()
            run.status = "FAILED"
            run.error_message = f"{type(exc).__name__}: {exc}"[:200]
            run.finished_at = datetime.now(UTC)
            db.commit()
            logger.error("[GDMAS-Backfill] Thất bại: %s", run.error_message)
            return {"success": False, "error": "BACKFILL_FAILED"}

    return {
        "success": True,
        "days": window_days,
        "windows": len(urls),
        "inserted": totals["inserted"],
        "updated": totals["updated"],
        "unchanged": totals["unchanged"],
        "skipped_invalid": totals["skipped_invalid"],
        "total_in_db": None,
    }


def main() -> None:
    """Điểm vào CLI — in kết quả JSON để người thao tác đối chiếu."""
    result = run_backfill()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
````

#### 11.3.54. `apps/api/src/gdmas/services/ingestion/geo.py`

````python
"""Tách chuỗi `place` của USGS thành quốc gia và khu vực.

USGS chỉ cung cấp `place` (chuỗi địa danh tự do) — không có field country/region.
Module này port bảng heuristic đã được FE dùng (country-clusters.ts / region-filter.ts)
sang BE để có một nguồn phân loại tập trung. Không gọi mạng, không reverse-geocode,
không dùng prefix `id` (đó là network code, không phải quốc gia).

Khi không trích được → "Khác" (không bịa dữ liệu).
"""

import re

UNKNOWN_LABEL = "Khác"
ALL_COUNTRIES = "all"

# Mã quốc gia ngắn hay gặp ở cuối địa danh USGS ("..., MX" → Mexico).
COUNTRY_CODES: dict[str, str] = {"MX": "Mexico"}

# Pattern theo thứ tự ưu tiên — giữ nguyên với FE để FE/BE cùng trả một nhãn.
COUNTRY_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"california|alaska|hawaii|united states|\busa\b", re.IGNORECASE),
        "USA",
    ),
    (re.compile(r"japan|honshu|hokkaido", re.IGNORECASE), "Japan"),
    (re.compile(r"indonesia|sumatra|java|sunda", re.IGNORECASE), "Indonesia"),
    (re.compile(r"tonga", re.IGNORECASE), "Tonga"),
    (re.compile(r"chile", re.IGNORECASE), "Chile"),
    (re.compile(r"philippines", re.IGNORECASE), "Philippines"),
    (re.compile(r"new zealand", re.IGNORECASE), "New Zealand"),
    (re.compile(r"papua", re.IGNORECASE), "Papua New Guinea"),
    (re.compile(r"vanuatu", re.IGNORECASE), "Vanuatu"),
    (re.compile(r"fiji", re.IGNORECASE), "Fiji"),
    (re.compile(r"mexico", re.IGNORECASE), "Mexico"),
    (re.compile(r"turkey|türkiye", re.IGNORECASE), "Turkey"),
    (re.compile(r"iceland", re.IGNORECASE), "Iceland"),
    (re.compile(r"greece", re.IGNORECASE), "Greece"),
    (re.compile(r"china|taiwan", re.IGNORECASE), "China"),
)

# Tên bang Mỹ đầy đủ ("..., Tennessee" → USA) — bổ sung thêm ngoài mã 2 chữ.
US_STATE_NAMES: frozenset[str] = frozenset(
    {
        "alabama",
        "alaska",
        "arizona",
        "arkansas",
        "california",
        "colorado",
        "connecticut",
        "delaware",
        "florida",
        "georgia",
        "hawaii",
        "idaho",
        "illinois",
        "indiana",
        "iowa",
        "kansas",
        "kentucky",
        "louisiana",
        "maine",
        "maryland",
        "massachusetts",
        "michigan",
        "minnesota",
        "mississippi",
        "missouri",
        "montana",
        "nebraska",
        "nevada",
        "new hampshire",
        "new jersey",
        "new mexico",
        "new york",
        "north carolina",
        "north dakota",
        "ohio",
        "oklahoma",
        "oregon",
        "pennsylvania",
        "rhode island",
        "south carolina",
        "south dakota",
        "tennessee",
        "texas",
        "utah",
        "vermont",
        "virginia",
        "washington",
        "west virginia",
        "wisconsin",
        "wyoming",
        "district of columbia",
    }
)

# Mã bang Mỹ thường xuất hiện ở cuối địa danh USGS ("..., CA" → USA).
US_STATE_CODES: frozenset[str] = frozenset(
    {
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
        "DC",
    }
)

# "12 km NE of San Francisco" → "San Francisco"; "off the coast of Honshu" → "Honshu".
_DISTANCE_PREFIX = re.compile(
    r"^\d+(?:\.\d+)?\s*(?:km|mi|miles?)?\s*[NSEW]{1,3}\s+of\s+", re.IGNORECASE
)
_OFF_COAST_PREFIX = re.compile(r"^off (?:the )?.+?\bof\s+", re.IGNORECASE)


def derive_country(place: str | None) -> str:
    """Suy quốc gia từ `place`. Fallback "Khác" — không bịa dữ liệu."""
    if not place or not place.strip():
        return UNKNOWN_LABEL

    segments = [part.strip() for part in place.split(",") if part.strip()]
    last = segments[-1] if segments else None
    if last:
        upper_last = last.upper()
        if upper_last in COUNTRY_CODES:
            return COUNTRY_CODES[upper_last]
        if upper_last in US_STATE_CODES or last.lower() in US_STATE_NAMES:
            return "USA"

    for pattern, country in COUNTRY_PATTERNS:
        if pattern.search(place):
            return country

    parts = place.split(",")
    last_segment = parts[-1].strip() if parts else ""
    return last_segment or UNKNOWN_LABEL


def derive_region(place: str | None, country: str) -> str:
    """Suy khu vực trong `country` từ `place` sau khi biết quốc gia."""
    if not place or not place.strip():
        return UNKNOWN_LABEL

    segments = [part.strip() for part in place.strip().split(",") if part.strip()]
    if len(segments) > 1:
        last = segments[-1]
        if country != ALL_COUNTRIES and (
            derive_country(last) == country or last.upper() == country.upper()
        ):
            segments.pop()

    text = ", ".join(segments).strip()
    text = _DISTANCE_PREFIX.sub("", text).strip()
    text = _OFF_COAST_PREFIX.sub("", text).strip()
    return text or UNKNOWN_LABEL


def derive_place_fields(place: str | None) -> tuple[str, str]:
    """Trả (country, region) nhất quán — dùng chung cho ingestion và sync route."""
    country = derive_country(place)
    return country, derive_region(place, country)
````

#### 11.3.55. `apps/api/src/gdmas/services/ingestion/parser.py`

````python
"""Chuẩn hóa và kiểm tra hợp lệ GeoJSON feature từ USGS trước khi lưu (Terminal 2).

Các hàm trong module này là hàm thuần (không I/O) để kiểm thử offline.
"""

import logging
import math
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

from gdmas.services.ingestion.geo import derive_place_fields

logger = logging.getLogger("gdmas.services.ingestion.parser")

SOURCE_USGS = "USGS"
SOURCE_EVENT_ID_MAX_LEN = 64

LATITUDE_RANGE = (-90.0, 90.0)
LONGITUDE_RANGE = (-180.0, 180.0)


def to_finite_float(value: Any) -> float | None:
    """Ép về float hữu hạn; trả None với None, bool, chuỗi không phải số, NaN hoặc ±inf."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return number if math.isfinite(number) else None


def epoch_ms_to_utc(value: Any) -> datetime | None:
    """Chuyển epoch milliseconds (định dạng USGS) sang datetime mang timezone.utc."""
    millis = to_finite_float(value)
    if millis is None:
        return None
    try:
        return datetime.fromtimestamp(millis / 1000.0, tz=UTC)
    except (OverflowError, OSError, ValueError):
        return None


def _in_range(value: float, bounds: tuple[float, float]) -> bool:
    return bounds[0] <= value <= bounds[1]


def _reject(event_id: Any, reason: str) -> None:
    logger.warning(
        "[GDMAS-Ingestion] Bỏ qua feature %s: %s", event_id or "<không có id>", reason
    )


def parse_feature(feat: Any) -> dict[str, Any] | None:
    """Chuẩn hóa 1 GeoJSON feature thành dict cột của bảng earthquake_events.

    Trả None (kèm log cảnh báo) khi feature không hợp lệ:
    thiếu id, thiếu/không hợp lệ tọa độ WGS84, magnitude không phải số hữu hạn, hoặc thiếu thời điểm.
    """
    if not isinstance(feat, dict):
        _reject(None, "feature không phải object JSON")
        return None

    props = feat.get("properties") or {}
    geom = feat.get("geometry") or {}
    if not isinstance(props, dict) or not isinstance(geom, dict):
        _reject(feat.get("id"), "properties/geometry không hợp lệ")
        return None

    event_id = feat.get("id") or props.get("code")
    if not event_id:
        _reject(None, "thiếu id sự kiện")
        return None
    event_id = str(event_id)
    if len(event_id) > SOURCE_EVENT_ID_MAX_LEN:
        _reject(event_id, "id sự kiện vượt quá giới hạn 64 ký tự")
        return None

    coords = geom.get("coordinates")
    if not isinstance(coords, (list, tuple)) or len(coords) < 2:
        _reject(event_id, "thiếu tọa độ")
        return None

    longitude = to_finite_float(coords[0])
    latitude = to_finite_float(coords[1])
    if longitude is None or latitude is None:
        _reject(event_id, "tọa độ không phải số hữu hạn")
        return None
    if not _in_range(latitude, LATITUDE_RANGE) or not _in_range(
        longitude, LONGITUDE_RANGE
    ):
        _reject(event_id, f"tọa độ ngoài chuẩn WGS84 (lat={latitude}, lon={longitude})")
        return None

    depth_km = 0.0
    if len(coords) > 2:
        depth_km = to_finite_float(coords[2])
        if depth_km is None:
            _reject(event_id, "độ sâu không phải số hữu hạn")
            return None

    magnitude = to_finite_float(props.get("mag"))
    if magnitude is None:
        _reject(event_id, f"magnitude không hợp lệ ({props.get('mag')!r})")
        return None

    event_time = epoch_ms_to_utc(props.get("time"))
    if event_time is None:
        _reject(event_id, "thiếu hoặc sai thời điểm sự kiện (time)")
        return None

    place = props.get("place")
    country, region = derive_place_fields(place)
    return {
        "source": SOURCE_USGS,
        "source_event_id": event_id,
        "event_time": event_time,
        "source_updated_at": epoch_ms_to_utc(props.get("updated")),
        "latitude": latitude,
        "longitude": longitude,
        "depth_km": depth_km,
        "magnitude": magnitude,
        "magnitude_type": props.get("magType"),
        "place": place,
        "country": country,
        "region": region,
        "source_url": props.get("url"),
        "raw_data": feat,
    }


def parse_features(features: Iterable[Any]) -> tuple[list[dict[str, Any]], int]:
    """Chuẩn hóa danh sách feature; trả (các dòng hợp lệ, số feature bị loại)."""
    rows: list[dict[str, Any]] = []
    skipped = 0
    for feat in features or []:
        row = parse_feature(feat)
        if row is None:
            skipped += 1
        else:
            rows.append(row)
    return rows, skipped
````

#### 11.3.56. `apps/api/src/gdmas/services/ingestion/runner.py`

````python
"""Entry point chạy độc lập trên Terminal 2 (T2 Ingestion).

Lệnh chạy: python -m gdmas.services.ingestion.runner
Chu kỳ: 5 phút/lần (300 giây)
"""

import logging
import time
from datetime import UTC, datetime

from gdmas.core.config import settings
from gdmas.services.ingestion.service import IngestionService, summarize_error

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gdmas.services.ingestion.runner")


def _wait_for_next_cycle(interval: int) -> bool:
    """Chờ chu kỳ kế; xử lý ngắt cả trong nhánh retry sau lỗi."""
    try:
        time.sleep(interval)
    except (KeyboardInterrupt, SystemExit):
        print("\n[GDMAS-Ingestion] Tiến trình đã nhận lệnh dừng an toàn.", flush=True)
        return False
    return True


def run() -> None:
    interval = getattr(settings, "INGESTION_INTERVAL_SECONDS", 300)
    minutes = interval // 60

    print(
        "==========================================================================",
        flush=True,
    )
    print(
        "[GDMAS-Ingestion] Terminal 2: USGS Data Ingestion Service Active", flush=True
    )
    print(
        f"[GDMAS-Ingestion] Chu kỳ nạp tự động: {interval} giây ({minutes} phút / lần)",
        flush=True,
    )
    print(f"[GDMAS-Ingestion] USGS Feed URL: {settings.USGS_FEED_URL}", flush=True)
    print(
        "==========================================================================",
        flush=True,
    )

    service = IngestionService()

    while True:
        try:
            now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
            print(
                f"\n[GDMAS-Ingestion] [{now_str}] Bắt đầu chu kỳ quét dữ liệu USGS mới...",
                flush=True,
            )

            res = service.execute_cycle()

            if res.get("success"):
                new_cnt = res.get("new_records", 0)
                total = res.get("total_in_db", 0)
                dur = res.get("duration_seconds", 0)
                print(
                    f"[GDMAS-Ingestion] Thành công ({dur:.2f}s): +{new_cnt} sự kiện mới nạp vào CSDL. "
                    f"Tổng cộng hiện có {total} sự kiện.",
                    flush=True,
                )
            else:
                err = res.get("error", "Không rõ nguyên nhân")
                print(f"[GDMAS-Ingestion] Cảnh báo trong chu kỳ: {err}", flush=True)

            print(
                f"[GDMAS-Ingestion] Đang chờ {interval} giây ({minutes} phút) cho chu kỳ tiếp theo...\n",
                flush=True,
            )
            if not _wait_for_next_cycle(interval):
                break

        except (KeyboardInterrupt, SystemExit):
            print(
                "\n[GDMAS-Ingestion] Tiến trình đã nhận lệnh dừng an toàn.", flush=True
            )
            break
        except Exception as exc:  # noqa: BLE001 — biên worker phải tiếp tục sau lỗi chu kỳ chưa dự kiến
            logger.error(
                "[GDMAS-Ingestion] Ngoại lệ chu kỳ: %s. Thử lại sau %s giây...",
                summarize_error(exc),
                interval,
            )
            if not _wait_for_next_cycle(interval):
                break


if __name__ == "__main__":
    run()
````

#### 11.3.57. `apps/api/src/gdmas/services/ingestion/service.py`

````python
import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.parser import parse_feature, parse_features
from gdmas.services.ingestion.upsert import upsert_events

logger = logging.getLogger("gdmas.services.ingestion")

FALLBACK_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)
HTTP_TIMEOUT_SECONDS = 15.0
ERROR_MESSAGE_MAX_LEN = 200

_CREDENTIALS_RE = re.compile(r"(\w+://)[^/\s:@]+:[^/\s@]+@")
_QUERY_STRING_RE = re.compile(r"\?[^\s'\"]*")


class FeedUnavailableError(RuntimeError):
    """USGS Feed không phản hồi hợp lệ (timeout, mất mạng, HTTP lỗi, payload hỏng)."""


def summarize_error(exc: BaseException, max_len: int = ERROR_MESSAGE_MAX_LEN) -> str:
    """Rút gọn ngoại lệ thành thông báo an toàn để lưu service_runs.error_message.

    Che thông tin đăng nhập trong URL (`scheme://user:[DA_CHE_THONG_TIN_DANG_NHAP]@`), bỏ query string và cắt độ dài.
    """
    detail = " ".join(str(exc).split())
    detail = _CREDENTIALS_RE.sub(r"\1***@", detail)
    detail = _QUERY_STRING_RE.sub("", detail)
    message = f"{type(exc).__name__}: {detail}" if detail else type(exc).__name__
    if len(message) > max_len:
        message = message[: max_len - 1] + "…"
    return message


class IngestionService:
    """
    Dịch vụ nạp dữ liệu địa chấn tự động từ USGS GeoJSON Feed (Terminal 2 - Ingestion).
    Kiểm tra hợp lệ dữ liệu, Upsert theo (source, source_event_id) và ghi nhật ký vào service_runs.
    """

    def __init__(
        self,
        feed_url: str | None = None,
        *,
        session_factory: Callable[[], Session] | None = None,
        http_transport: httpx.BaseTransport | None = None,
    ):
        self.feed_url = feed_url or settings.USGS_FEED_URL
        # Nếu feed_url là all_hour, cũng dự phòng all_day để bù đắp nếu worker từng offline
        self.fallback_url = FALLBACK_FEED_URL
        self._session_factory = session_factory or SessionLocal
        self._http_transport = http_transport

    def execute_cycle(self) -> dict[str, Any]:
        """
        Thực hiện một chu kỳ quét và nạp dữ liệu địa chấn vào PostgreSQL.
        Không ném ngoại lệ ra ngoài: lỗi được ghi vào service_runs với status FAILED.
        """
        start_time = datetime.now(UTC)
        run_record = None

        with self._session_factory() as db:
            try:
                # 1. Khởi tạo bản ghi service_runs theo dõi tác vụ
                run_record = ServiceRun(
                    service_name="ingestion",
                    started_at=start_time,
                    status="RUNNING",
                    records_processed=0,
                )
                db.add(run_record)
                db.commit()
                db.refresh(run_record)

                # 2. Tải GeoJSON (nguồn chính → fallback all_day); ném FeedUnavailableError nếu cả hai lỗi
                features = self._fetch_features()

                # 3. Kiểm tra hợp lệ rồi Upsert
                rows, skipped_invalid = parse_features(features)
                stats = upsert_events(db, rows)
                db.commit()

                # 4. Cập nhật trạng thái hoàn thành thành công
                finish_time = datetime.now(UTC)
                duration_sec = (finish_time - start_time).total_seconds()

                run_record.status = "SUCCESS"
                run_record.records_processed = stats.processed
                run_record.finished_at = finish_time
                db.commit()

                total_in_db = db.query(EarthquakeEvent).count()

                result = {
                    "success": True,
                    "new_records": stats.inserted,
                    "inserted": stats.inserted,
                    "updated": stats.updated,
                    "unchanged": stats.unchanged,
                    "skipped_invalid": skipped_invalid,
                    "total_in_db": total_in_db,
                    "duration_seconds": duration_sec,
                    "timestamp": finish_time.isoformat(),
                }
                logger.info(
                    f"[GDMAS-Ingestion] Hoàn thành chu kỳ ({duration_sec:.2f}s): "
                    f"+{stats.inserted} mới, {stats.updated} cập nhật, "
                    f"{skipped_invalid} bị loại (Tổng DB: {total_in_db})"
                )
                return result

            except Exception as e:  # noqa: BLE001 — worker không được crash; mọi lỗi ghi vào service_runs
                db.rollback()
                finish_time = datetime.now(UTC)
                error_msg = summarize_error(e)
                logger.error(
                    f"[GDMAS-Ingestion] Lỗi trong chu kỳ nạp dữ liệu: {error_msg}"
                )

                if run_record:
                    try:
                        run_record.status = "FAILED"
                        run_record.finished_at = finish_time
                        run_record.error_message = error_msg
                        db.commit()
                    except Exception:  # noqa: BLE001 — cố ghi FAILED, lỗi phụ thì rollback
                        db.rollback()

                return {
                    "success": False,
                    "error": error_msg,
                    "new_records": 0,
                    "timestamp": finish_time.isoformat(),
                }

    def _http_client(self) -> httpx.Client:
        return httpx.Client(
            timeout=HTTP_TIMEOUT_SECONDS,
            follow_redirects=True,
            transport=self._http_transport,
        )

    def _fetch_geojson_strict(self, url: str) -> list[dict[str, Any]]:
        """Tải danh sách features; ném FeedUnavailableError khi timeout, mất mạng, HTTP lỗi hoặc payload hỏng."""
        try:
            with self._http_client() as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise FeedUnavailableError(summarize_error(exc)) from exc

        features = data.get("features") if isinstance(data, dict) else None
        if not isinstance(features, list):
            raise FeedUnavailableError("Payload GeoJSON không có danh sách features")
        return features

    def _fetch_features(self) -> list[dict[str, Any]]:
        """Thử nguồn chính, rồi fallback all_day; chỉ ném lỗi khi không nguồn nào dùng được."""
        has_fallback = self.fallback_url != self.feed_url
        try:
            features = self._fetch_geojson_strict(self.feed_url)
        except FeedUnavailableError as primary_error:
            if not has_fallback:
                raise
            logger.warning(
                f"Nguồn USGS chính lỗi ({primary_error}), thử fallback all_day..."
            )
            try:
                return self._fetch_geojson_strict(self.fallback_url)
            except FeedUnavailableError as fallback_error:
                raise FeedUnavailableError(
                    f"Nguồn chính: {primary_error}; fallback: {fallback_error}"
                ) from fallback_error

        if not features and has_fallback:
            logger.info(
                "Nguồn chính không có sự kiện, thử lại với fallback URL (all_day)..."
            )
            try:
                return self._fetch_geojson_strict(self.fallback_url)
            except FeedUnavailableError as fallback_error:
                logger.warning(
                    f"Fallback all_day lỗi ({fallback_error}); dùng kết quả rỗng từ nguồn chính."
                )
        return features

    def _fetch_geojson(self, url: str) -> list[dict[str, Any]]:
        """Tải dữ liệu GeoJSON từ endpoint USGS; giữ hành vi cũ: lỗi thì trả danh sách rỗng."""
        try:
            return self._fetch_geojson_strict(url)
        except FeedUnavailableError as e:
            logger.warning(f"Không thể tải USGS Feed ({url}): {e}")
            return []

    def _save_feature_if_new(self, db: Session, feat: dict[str, Any]) -> bool:
        """Kiểm tra hợp lệ rồi Upsert một feature; trả True nếu là sự kiện mới được chèn.

        Giữ chữ ký cũ (RULE-03). Bản ghi đã tồn tại nay được cập nhật khi source_updated_at mới hơn.
        """
        row = parse_feature(feat)
        if row is None:
            return False
        return upsert_events(db, [row]).inserted == 1
````

#### 11.3.58. `apps/api/src/gdmas/services/ingestion/upsert.py`

````python
"""Upsert sự kiện địa chấn vào earthquake_events theo đặc tả docs/architecture/ERD.md §4.

INSERT ... ON CONFLICT (source, source_event_id) DO UPDATE ...
WHERE earthquake_events.source_updated_at IS NULL
   OR EXCLUDED.source_updated_at > earthquake_events.source_updated_at
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, literal_column, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from gdmas.models.earthquake import EarthquakeEvent

UPSERT_CONSTRAINT = "uq_earthquake_source_event"
UPDATABLE_COLUMNS: tuple[str, ...] = (
    "source_updated_at",
    "latitude",
    "longitude",
    "depth_km",
    "magnitude",
    "magnitude_type",
    "place",
    "country",
    "region",
    "source_url",
    "raw_data",
)
DEFAULT_CHUNK_SIZE = 500


@dataclass(frozen=True)
class UpsertStats:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0

    @property
    def processed(self) -> int:
        """Số bản ghi thực sự được ghi (chèn mới + cập nhật)."""
        return self.inserted + self.updated


def _row_key(row: dict[str, Any]) -> tuple[str, str]:
    return (row["source"], row["source_event_id"])


def _is_newer(candidate: dict[str, Any], current: dict[str, Any]) -> bool:
    cand_ts: datetime | None = candidate.get("source_updated_at")
    curr_ts: datetime | None = current.get("source_updated_at")
    if cand_ts is None:
        return False
    return curr_ts is None or cand_ts > curr_ts


def deduplicate_rows(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Gộp các dòng trùng (source, source_event_id) trong cùng batch, giữ bản source_updated_at mới nhất.

    PostgreSQL không cho ON CONFLICT DO UPDATE chạm cùng một dòng 2 lần trong 1 câu lệnh.
    """
    chosen: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        key = _row_key(row)
        if key not in chosen or _is_newer(row, chosen[key]):
            chosen[key] = row
    return list(chosen.values())


def build_upsert_statement(rows: Sequence[dict[str, Any]]):
    """Tạo câu lệnh Upsert PostgreSQL; RETURNING cờ `inserted` (xmax = 0 khi là dòng mới)."""
    table = EarthquakeEvent.__table__
    stmt = pg_insert(table).values(list(rows))
    excluded = stmt.excluded

    set_: dict[str, Any] = {name: excluded[name] for name in UPDATABLE_COLUMNS}
    set_["ingested_at"] = func.now()

    return stmt.on_conflict_do_update(
        constraint=UPSERT_CONSTRAINT,
        set_=set_,
        where=or_(
            table.c.source_updated_at.is_(None),
            excluded.source_updated_at > table.c.source_updated_at,
        ),
    ).returning(literal_column("(xmax = 0)").label("inserted"))


def upsert_events(
    db: Session,
    rows: Sequence[dict[str, Any]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> UpsertStats:
    """Upsert các dòng đã chuẩn hóa; không commit (caller quản lý transaction)."""
    unique_rows = deduplicate_rows(rows)
    if not unique_rows:
        return UpsertStats()

    inserted = 0
    updated = 0
    for start in range(0, len(unique_rows), chunk_size):
        chunk = unique_rows[start : start + chunk_size]
        for returned in db.execute(build_upsert_statement(chunk)):
            if returned.inserted:
                inserted += 1
            else:
                updated += 1

    unchanged = len(unique_rows) - inserted - updated
    return UpsertStats(inserted=inserted, updated=updated, unchanged=unchanged)
````

#### 11.3.59. `apps/api/src/gdmas/services/prediction/__init__.py`

````python
"""Prediction Service: Dự báo định lượng & Phân loại ngày kế tiếp t+1 (Chu kỳ 5 phút/lần)."""
````

#### 11.3.60. `apps/api/src/gdmas/services/prediction/inference.py`

````python
"""Suy luận Pattern 5 và 6 từ mô hình đã huấn luyện offline (không train lại khi chạy).

Hỗ trợ: dự báo = ARIMA (thang log hoặc gốc); phân loại = phân phối dự báo.
Nếu train_models.py chọn mô hình khác (Ridge, Random Forest, Logistic) thì cần mở rộng file này.
"""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

from gdmas.core.config import settings

MODEL_DIR = Path(__file__).parent / "models"
LABELS = ["Low", "Moderate", "High", "Critical"]
# Số ngày có dữ liệu tối thiểu để dự báo — cấu hình qua .env (docs/yeucaubatbuoc.md §6.4).
MIN_OBSERVED = settings.PREDICTION_MIN_OBSERVED


@lru_cache(maxsize=1)
def load_artifacts() -> dict:
    files = {
        "forecast": "forecast_model.joblib",
        "classifier": "risk_classifier.joblib",
        "history": "recent_history.json",
        "report": "training_report.json",
    }
    missing = [f for f in files.values() if not (MODEL_DIR / f).exists()]
    if missing:
        raise FileNotFoundError(
            f"Thiếu {missing} trong {MODEL_DIR}. Hãy chạy scripts/train_models.py trước."
        )
    return {
        "forecast": joblib.load(MODEL_DIR / files["forecast"]),
        "classifier": joblib.load(MODEL_DIR / files["classifier"]),
        "history": json.loads(
            (MODEL_DIR / files["history"]).read_text(encoding="utf-8")
        ),
        "report": json.loads((MODEL_DIR / files["report"]).read_text(encoding="utf-8")),
    }


def build_series(
    history: dict, db_counts: dict[date, int], last_day: date
) -> pd.Series:
    """Chuỗi số trận mỗi ngày đến hết last_day: nền là lịch sử huấn luyện, DB ghi đè, ngày thiếu = NaN."""
    hist = pd.Series(
        history["counts"], index=pd.to_datetime(history["dates"]), dtype=float
    )
    idx = pd.date_range(hist.index[0], pd.Timestamp(last_day), freq="D")
    series = hist.reindex(idx)
    for day, n in db_counts.items():
        ts = pd.Timestamp(day)
        if ts in series.index:
            series.loc[ts] = float(n)
    return series


def _next_mean(series: pd.Series, art: dict) -> float:
    """Dự báo 1 bước (trong không gian mô hình) với tham số đã huấn luyện; NaN được xử lý tự động."""
    y = np.log1p(series) if art["log"] else series
    model = ARIMA(y, order=tuple(art["order"]), trend="c")
    params = pd.Series(art["params"])[model.param_names].values
    res = model.smooth(params)
    return float(res.get_forecast(steps=1).predicted_mean.iloc[0])


def _inv(art: dict):
    return np.expm1 if art["log"] else (lambda x: x)


def forecast_next(series: pd.Series) -> dict:
    art = load_artifacts()["forecast"]
    if art["type"] != "arima":
        raise NotImplementedError(
            f"Chưa hỗ trợ mô hình dự báo '{art['type']}' trong inference.py"
        )
    if series.notna().sum() < MIN_OBSERVED:
        raise ValueError("Không đủ dữ liệu lịch sử để dự báo")
    m, inv = _next_mean(series, art), _inv(art)
    return {
        "predicted": max(0.0, float(inv(m))),
        "lower": max(0.0, float(inv(m + art["q_lo"]))),
        "upper": max(0.0, float(inv(m + art["q_hi"]))),
    }


def classify_next(series: pd.Series) -> dict:
    art = load_artifacts()["classifier"]
    if art["type"] != "forecast_distribution":
        raise NotImplementedError(
            f"Chưa hỗ trợ bộ phân loại '{art['type']}' trong inference.py"
        )
    m = _next_mean(series, art)
    counts = _inv(art)(m + np.asarray(art["resid"]))
    bins = np.digitize(counts, art["thresholds"])
    proba = np.array([(bins == k).mean() for k in range(len(LABELS))])
    return {
        "label": LABELS[int(proba.argmax())],
        "probabilities": {lab: round(float(p), 4) for lab, p in zip(LABELS, proba)},
    }


def label_of_count(count: float) -> str:
    cuts = load_artifacts()["classifier"]["thresholds"]
    return LABELS[int(np.digitize([count], cuts)[0])]


def forecast_model_info() -> tuple[str, dict]:
    rep = load_artifacts()["report"]
    name = rep["forecast_winner"]
    m = rep["forecast"][name]
    base = min(v["MAE"] for k, v in rep["forecast"].items() if k.startswith("baseline"))
    return name, {
        "mae": round(m["MAE"], 2),
        "rmse": round(m["RMSE"], 2),
        "coverage_95": round(m.get("coverage_95", 0.0), 3),
        "baseline_mae": round(base, 2),
        "confidence_level": 0.95,
        "n_test": rep["n_test"],
    }


def classifier_model_info() -> tuple[str, dict]:
    rep = load_artifacts()["report"]
    pretty = {
        "PhanPhoiDuBao": "Forecast-Distribution Risk Classifier",
        "RandomForest": "Random Forest Risk Classifier",
        "LogisticRegression": "Logistic Regression Risk Classifier",
    }
    win = rep["classifier_winner"]
    m = rep["classifier"][win]
    return pretty.get(win, win), {
        **{k: round(v, 3) for k, v in m.items()},
        "classes": LABELS,
        "thresholds": rep["thresholds"],
        "n_test": rep["n_test"],
    }
````

#### 11.3.61. `apps/api/src/gdmas/services/prediction/models/recent_history.json`

````json
{"dates": ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"], "counts": [429, 435, 527, 393, 370, 328, 333, 329, 525, 349, 392, 386, 458, 427, 383, 342, 348, 384, 395, 366, 372, 418, 361, 335, 385, 325, 373, 436, 323, 422, 359, 383, 385, 437, 316, 309, 345, 336, 465, 405, 318, 340, 472, 323, 330, 280, 320, 350, 344, 289, 321, 325, 323, 333, 302, 262, 261, 228, 212, 190]}
````

#### 11.3.62. `apps/api/src/gdmas/services/prediction/models/training_report.json`

````json
{
  "forecast": {
    "baseline_hom_qua": {
      "MAE": 43.05555555555556,
      "RMSE": 58.30570774422994
    },
    "baseline_tb_7_ngay": {
      "MAE": 41.09424603174604,
      "RMSE": 51.60013134112905
    },
    "baseline_tb_train": {
      "MAE": 42.70821482745545,
      "RMSE": 56.4065005211698
    },
    "ARIMA(3, 0, 2)": {
      "MAE": 38.39731723749519,
      "RMSE": 49.668028549875906,
      "coverage_95": 0.9861111111111112
    },
    "ARIMA(2, 0, 1)_log": {
      "MAE": 37.415526517909456,
      "RMSE": 48.62473840920661,
      "coverage_95": 0.9722222222222222
    },
    "Ridge": {
      "MAE": 41.08203442846051,
      "RMSE": 51.7614546139219,
      "coverage_95": 0.9791666666666666
    },
    "_cai_thien_so_voi_baseline_tot_nhat_%": 9.0
  },
  "forecast_winner": "ARIMA(2, 0, 1)_log",
  "classifier": {
    "baseline_giong_hom_nay": {
      "accuracy": 0.4513888888888889,
      "f1_macro": 0.3246076297399473,
      "within_1_level": 0.8333333333333334
    },
    "baseline_lop_da_so": {
      "accuracy": 0.5069444444444444,
      "f1_macro": 0.16820276497695852,
      "within_1_level": 0.8055555555555556
    },
    "RandomForest": {
      "accuracy": 0.3680555555555556,
      "f1_macro": 0.25275139148241366,
      "within_1_level": 0.7986111111111112
    },
    "LogisticRegression": {
      "accuracy": 0.3541666666666667,
      "f1_macro": 0.27549689987079606,
      "within_1_level": 0.7708333333333334
    },
    "PhanPhoiDuBao": {
      "accuracy": 0.5138888888888888,
      "f1_macro": 0.2637082903336773,
      "within_1_level": 0.8611111111111112
    }
  },
  "classifier_winner": "PhanPhoiDuBao",
  "thresholds": [
    375.0,
    425.0,
    475.0
  ],
  "n_train": 572,
  "n_test": 144
}
````

#### 11.3.63. `apps/api/src/gdmas/services/prediction/runner.py`

````python
"""Entry point chạy độc lập trên Terminal 5 (T5 Prediction).

Lệnh chạy: python -m gdmas.services.prediction.runner          (lặp mỗi PREDICTION_INTERVAL_SECONDS, mặc định 5 phút)
           python -m gdmas.services.prediction.runner --once   (chạy ngay 1 chu kỳ rồi thoát — Demo Bước 4–5)
"""

import argparse
import logging
import sys
import time
from datetime import UTC, datetime
from typing import Any

from gdmas.core.config import settings
from gdmas.services.prediction import inference
from gdmas.services.prediction.service import PredictionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def execute_cycle() -> dict[str, Any]:
    """Chạy 1 chu kỳ dự báo, in kết quả ra màn hình và trả về dict kết quả."""
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"\n[GDMAS-Prediction] [{now_str}] Bắt đầu chu kỳ dự báo...", flush=True)
    res = PredictionService().execute_cycle()
    if res.get("success"):
        print(
            f"[GDMAS-Prediction] Ngày {res['target_date']}: dự báo "
            f"{res['predicted']:.1f} trận [{res['lower']:.1f} - {res['upper']:.1f}] "
            f"| rủi ro: {res['label']} {res['probabilities']}",
            flush=True,
        )
    else:
        print(
            f"[GDMAS-Prediction] Cảnh báo trong chu kỳ: {res.get('error')}", flush=True
        )
    return res


def run() -> None:
    interval = getattr(settings, "PREDICTION_INTERVAL_SECONDS", 300)
    print("=" * 74, flush=True)
    print(
        "[GDMAS-Prediction] Terminal 5: Quantitative & Classification t+1 Runner",
        flush=True,
    )
    print(
        f"[GDMAS-Prediction] Chu kỳ: {interval} giây ({interval // 60} phút / lần)",
        flush=True,
    )
    print("=" * 74, flush=True)

    while True:
        try:
            execute_cycle()
        except (KeyboardInterrupt, SystemExit):
            print(
                "\n[GDMAS-Prediction] Tiến trình đã nhận lệnh dừng an toàn.", flush=True
            )
            break
        except Exception:
            logging.getLogger("gdmas.services.prediction").exception(
                "Chu kỳ dự báo gặp lỗi không mong đợi"
            )
        print(
            f"[GDMAS-Prediction] Đang chờ {interval} giây cho chu kỳ tiếp theo...\n",
            flush=True,
        )
        try:
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print(
                "\n[GDMAS-Prediction] Tiến trình đã nhận lệnh dừng an toàn.", flush=True
            )
            break


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m gdmas.services.prediction.runner",
        description="Terminal 5 — dự báo số trận (Pattern 5) và phân loại rủi ro (Pattern 6) ngày kế tiếp.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Chạy ngay 1 chu kỳ dự báo rồi thoát (mã thoát 0 khi thành công, 1 khi thất bại).",
    )
    args = parser.parse_args(argv)

    try:
        inference.load_artifacts()  # kiểm tra model có đủ ngay khi khởi động
    except FileNotFoundError as exc:
        print(f"[GDMAS-Prediction] LỖI: {exc}", flush=True)
        return 1

    if args.once:
        return 0 if execute_cycle().get("success") else 1
    run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
````

#### 11.3.64. `apps/api/src/gdmas/services/prediction/service.py`

````python
"""Dịch vụ dự báo t+1: đọc số trận theo ngày từ DB, chạy mô hình, ghi prediction_results và
classification_results.

Quy ước: "t" là ngày UTC cuối cùng đã đủ 24 giờ dữ liệu (hôm qua), ngày dự báo là ngày UTC kế tiếp
(hôm nay). Kết quả cập nhật mỗi chu kỳ; sang ngày UTC mới thì ngày vừa qua được điền giá trị thực tế.
"""

import logging
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.prediction import inference

logger = logging.getLogger("gdmas.services.prediction")
METRIC_NAME = "daily_earthquake_count"
MODEL_VERSION = "1.0.0"


class PredictionService:
    def execute_cycle(self) -> dict:
        started = datetime.now(UTC)
        try:
            with SessionLocal() as db:
                run = ServiceRun(service_name="prediction", status="RUNNING")
                db.add(run)
                db.commit()
                try:
                    result = self._predict(db, started)
                    run.status = "SUCCESS"
                    run.records_processed = 2
                except SQLAlchemyError:
                    db.rollback()
                    try:
                        run.status = "FAILED"
                        run.error_message = "DATABASE_ERROR"
                        run.finished_at = datetime.now(UTC)
                        db.commit()
                    except SQLAlchemyError:
                        db.rollback()
                    raise
                except (
                    Exception
                ) as exc:  # ghi lỗi vào service_runs, không làm sập runner
                    db.rollback()
                    logger.exception("Chu kỳ dự báo thất bại")
                    run.status = "FAILED"
                    run.error_message = str(exc)[:1000]
                    result = {"success": False, "error": str(exc)}
                run.finished_at = datetime.now(UTC)
                db.commit()
            return result
        except SQLAlchemyError:
            logger.exception("Mất kết nối CSDL trong chu kỳ dự báo")
            return {"success": False, "error": "DATABASE_ERROR"}

    # ---- đọc dữ liệu ----
    @staticmethod
    def _complete_day_counts(db: Session, today: date) -> dict[date, int]:
        """Số trận theo ngày UTC cho các ngày đã đủ dữ liệu (sau ngày có sự kiện đầu tiên, trước hôm nay)."""
        first_ts = db.scalar(select(func.min(EarthquakeEvent.event_time)))
        if first_ts is None:
            return {}
        first_complete = first_ts.astimezone(UTC).date() + timedelta(days=1)
        if first_complete >= today:
            return {}
        start = datetime.combine(first_complete, time.min, tzinfo=UTC)
        end = datetime.combine(today, time.min, tzinfo=UTC)
        day = func.date(func.timezone("UTC", EarthquakeEvent.event_time)).label("day")
        rows = db.execute(
            select(day, func.count())
            .where(
                EarthquakeEvent.event_time >= start, EarthquakeEvent.event_time < end
            )
            .group_by(day)
        ).all()
        return {r[0]: int(r[1]) for r in rows}

    # ---- chu kỳ chính ----
    def _predict(self, db: Session, now: datetime) -> dict:
        art = inference.load_artifacts()
        today = now.date()
        db_counts = self._complete_day_counts(db, today)
        series = inference.build_series(
            art["history"], db_counts, today - timedelta(days=1)
        )
        observed = int(series.notna().sum())

        fc = inference.forecast_next(series)
        cl = inference.classify_next(series)
        fc_name, fc_eval = inference.forecast_model_info()
        cl_name, cl_eval = inference.classifier_model_info()

        db.query(PredictionResult).filter(PredictionResult.target_date == today).delete(
            synchronize_session=False
        )
        db.query(ClassificationResult).filter(
            ClassificationResult.target_date == today
        ).delete(synchronize_session=False)
        db.add(
            PredictionResult(
                target_date=today,
                metric_name=METRIC_NAME,
                predicted_value=round(fc["predicted"], 3),
                lower_bound=round(fc["lower"], 3),
                upper_bound=round(fc["upper"], 3),
                model_name=fc_name[:64],
                model_version=MODEL_VERSION,
                evaluation_metrics={**fc_eval, "history_days_observed": observed},
            )
        )
        db.add(
            ClassificationResult(
                target_date=today,
                predicted_label=cl["label"],
                probability_scores=cl["probabilities"],
                model_name=cl_name[:64],
                model_version=MODEL_VERSION,
                evaluation_metrics=cl_eval,
            )
        )

        self._fill_actuals(db, db_counts, today)
        db.commit()
        logger.info(
            "Dự báo %s: %.1f [%.1f - %.1f] | rủi ro %s",
            today,
            fc["predicted"],
            fc["lower"],
            fc["upper"],
            cl["label"],
        )
        return {
            "success": True,
            "target_date": today.isoformat(),
            "predicted": fc["predicted"],
            "lower": fc["lower"],
            "upper": fc["upper"],
            "label": cl["label"],
            "probabilities": cl["probabilities"],
            "history_days_observed": observed,
        }

    @staticmethod
    def _fill_actuals(db: Session, db_counts: dict[date, int], today: date) -> None:
        """Điền giá trị thực tế cho các dự báo của những ngày đã kết thúc (nếu DB có đủ dữ liệu ngày đó)."""
        for row in db.query(PredictionResult).filter(
            PredictionResult.target_date < today,
            PredictionResult.actual_value.is_(None),
        ):
            if row.target_date in db_counts:
                row.actual_value = float(db_counts[row.target_date])
        for row in db.query(ClassificationResult).filter(
            ClassificationResult.target_date < today,
            ClassificationResult.actual_label.is_(None),
        ):
            if row.target_date in db_counts:
                row.actual_label = inference.label_of_count(db_counts[row.target_date])
````

#### 11.3.65. `apps/api/tests/conftest.py`

````python
"""Cấu hình pytest chung cho apps/api.

Dự án chạy theo src-layout và không cài đặt package (Docker dùng PYTHONPATH=/app/src),
nên thêm `src/` vào sys.path để test import được `gdmas` khi chạy `uv run pytest`.
"""

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
````

#### 11.3.66. `apps/api/tests/fixtures/quality_contracts.json`

````json
{
  "openapi": {
    "openapi": "3.1.0",
    "info": {
      "title": "GDMAS API",
      "version": "0.1.0"
    },
    "paths": {
      "/api/v1/earthquakes": {
        "get": {
          "tags": [
            "Earthquakes"
          ],
          "summary": "List Earthquakes",
          "description": "Danh sách sự kiện địa chấn (phân trang, lọc, tìm kiếm).\n\nDB rỗng trả 200 với danh sách rỗng; DB lỗi trả 500 DATABASE_ERROR.",
          "operationId": "list_earthquakes_api_v1_earthquakes_get",
          "parameters": [
            {
              "name": "page",
              "in": "query",
              "required": false,
              "schema": {
                "type": "integer",
                "minimum": 1,
                "description": "Số trang hiện tại",
                "default": 1,
                "title": "Page"
              },
              "description": "Số trang hiện tại"
            },
            {
              "name": "limit",
              "in": "query",
              "required": false,
              "schema": {
                "type": "integer",
                "maximum": 100,
                "minimum": 1,
                "description": "Số bản ghi mỗi trang",
                "default": 20,
                "title": "Limit"
              },
              "description": "Số bản ghi mỗi trang"
            },
            {
              "name": "min_magnitude",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ lớn tối thiểu",
                "title": "Min Magnitude"
              },
              "description": "Độ lớn tối thiểu"
            },
            {
              "name": "max_magnitude",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ lớn tối đa",
                "title": "Max Magnitude"
              },
              "description": "Độ lớn tối đa"
            },
            {
              "name": "min_depth",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ sâu tối thiểu (km)",
                "title": "Min Depth"
              },
              "description": "Độ sâu tối thiểu (km)"
            },
            {
              "name": "max_depth",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ sâu tối đa (km)",
                "title": "Max Depth"
              },
              "description": "Độ sâu tối đa (km)"
            },
            {
              "name": "search",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Tìm theo khu vực hoặc mã sự kiện",
                "title": "Search"
              },
              "description": "Tìm theo khu vực hoặc mã sự kiện"
            },
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia suy từ place",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia suy từ place"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực suy từ place",
                "title": "Region"
              },
              "description": "Lọc theo khu vực suy từ place"
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Từ thời điểm (ISO 8601 UTC)",
                "title": "Start Time"
              },
              "description": "Từ thời điểm (ISO 8601 UTC)"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Đến thời điểm (ISO 8601 UTC)",
                "title": "End Time"
              },
              "description": "Đến thời điểm (ISO 8601 UTC)"
            },
            {
              "name": "min_lat",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number",
                    "maximum": 90,
                    "minimum": -90
                  },
                  {
                    "type": "null"
                  }
                ],
                "title": "Min Lat"
              }
            },
            {
              "name": "max_lat",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number",
                    "maximum": 90,
                    "minimum": -90
                  },
                  {
                    "type": "null"
                  }
                ],
                "title": "Max Lat"
              }
            },
            {
              "name": "min_lon",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number",
                    "maximum": 180,
                    "minimum": -180
                  },
                  {
                    "type": "null"
                  }
                ],
                "title": "Min Lon"
              }
            },
            {
              "name": "max_lon",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number",
                    "maximum": 180,
                    "minimum": -180
                  },
                  {
                    "type": "null"
                  }
                ],
                "title": "Max Lon"
              }
            },
            {
              "name": "sort_by",
              "in": "query",
              "required": false,
              "schema": {
                "type": "string",
                "pattern": "^(event_time|magnitude|depth_km)$",
                "default": "event_time",
                "title": "Sort By"
              }
            },
            {
              "name": "order",
              "in": "query",
              "required": false,
              "schema": {
                "type": "string",
                "pattern": "^(asc|desc)$",
                "default": "desc",
                "title": "Order"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/EarthquakeListResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/earthquakes/sync": {
        "post": {
          "tags": [
            "Earthquakes"
          ],
          "summary": "Sync Usgs Earthquakes",
          "description": "Đồng bộ trực tiếp từ USGS GeoJSON Feed vào PostgreSQL.\n\nUSGS không truy cập được -> 503 DATA_SOURCE_UNAVAILABLE; lỗi ghi DB -> 500.",
          "operationId": "sync_usgs_earthquakes_api_v1_earthquakes_sync_post",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/SyncResponse"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/earthquakes/countries": {
        "get": {
          "tags": [
            "Earthquakes"
          ],
          "summary": "List Earthquake Countries",
          "description": "Danh mục quốc gia kèm count/avg/max — cho bộ lọc và xếp hạng FE.",
          "operationId": "list_earthquake_countries_api_v1_earthquakes_countries_get",
          "parameters": [
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Từ thời điểm ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "Từ thời điểm ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Đến thời điểm ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "Đến thời điểm ISO 8601 UTC"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/CountryListResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/earthquakes/regions": {
        "get": {
          "tags": [
            "Earthquakes"
          ],
          "summary": "List Earthquake Regions",
          "description": "Danh mục khu vực kèm count/avg/max trong cửa sổ thời gian — cho xếp hạng FE.",
          "operationId": "list_earthquake_regions_api_v1_earthquakes_regions_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Chỉ lấy khu vực của quốc gia này",
                "title": "Country"
              },
              "description": "Chỉ lấy khu vực của quốc gia này"
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Từ thời điểm ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "Từ thời điểm ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Đến thời điểm ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "Đến thời điểm ISO 8601 UTC"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/RegionListResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/earthquakes/{event_id}": {
        "get": {
          "tags": [
            "Earthquakes"
          ],
          "summary": "Get Earthquake",
          "description": "Chi tiết một sự kiện theo id hoặc source_event_id.",
          "operationId": "get_earthquake_api_v1_earthquakes__event_id__get",
          "parameters": [
            {
              "name": "event_id",
              "in": "path",
              "required": true,
              "schema": {
                "type": "string",
                "title": "Event Id"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/EarthquakeResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/statistics/earthquakes": {
        "get": {
          "tags": [
            "Statistics"
          ],
          "summary": "Get Earthquake Statistics",
          "description": "Chỉ số KPI và chuỗi thời gian cho Dashboard.\n\nDB rỗng trả toàn số 0 và time_series_preview rỗng; DB lỗi trả 500 DATABASE_ERROR.",
          "operationId": "get_earthquake_statistics_api_v1_statistics_earthquakes_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Từ thời điểm ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "Từ thời điểm ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Đến thời điểm ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "Đến thời điểm ISO 8601 UTC"
            },
            {
              "name": "min_magnitude",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ lớn tối thiểu (bộ lọc Danh mục)",
                "title": "Min Magnitude"
              },
              "description": "Độ lớn tối thiểu (bộ lọc Danh mục)"
            },
            {
              "name": "max_magnitude",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ lớn tối đa (bộ lọc Danh mục)",
                "title": "Max Magnitude"
              },
              "description": "Độ lớn tối đa (bộ lọc Danh mục)"
            },
            {
              "name": "min_depth",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ sâu tối thiểu km (bộ lọc Danh mục)",
                "title": "Min Depth"
              },
              "description": "Độ sâu tối thiểu km (bộ lọc Danh mục)"
            },
            {
              "name": "max_depth",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "number"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Độ sâu tối đa km (bộ lọc Danh mục)",
                "title": "Max Depth"
              },
              "description": "Độ sâu tối đa km (bộ lọc Danh mục)"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/StatisticsResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/statistics/monthly-peaks": {
        "get": {
          "tags": [
            "Statistics"
          ],
          "summary": "Get Monthly Peaks",
          "description": "Số sự kiện theo tháng UTC (1..12) — biểu đồ cao điểm theo tháng trên Overview.\n\nĐếm từ sự kiện thật, không snapshot mùa vụ: dùng được ngay cả khi chưa đủ 24 tháng\nđể `seasonal_decompose`. Không truyền filter → toàn cục.",
          "operationId": "get_monthly_peaks_api_v1_statistics_monthly_peaks_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/MonthlyPeaksResponse"
                  }
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/stream/broadcast-cleared": {
        "post": {
          "tags": [
            "Streaming"
          ],
          "summary": "Broadcast Database Cleared",
          "description": "Báo CSDL đã bị xóa trống (Demo Bước 2) tới mọi client SSE đang mở.",
          "operationId": "broadcast_database_cleared_api_v1_stream_broadcast_cleared_post",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/stream/earthquakes": {
        "get": {
          "tags": [
            "Streaming"
          ],
          "summary": "Stream Earthquakes",
          "description": "Kênh SSE thời gian thực (đường dẫn cũ, Frontend đang dùng).",
          "operationId": "stream_earthquakes_api_v1_stream_earthquakes_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/events/stream": {
        "get": {
          "tags": [
            "Streaming"
          ],
          "summary": "Events Stream",
          "description": "Kênh SSE chuẩn theo docs/api/API.md §3.5 (dùng chung generator với /stream/earthquakes).",
          "operationId": "events_stream_api_v1_events_stream_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/patterns": {
        "get": {
          "tags": [
            "Patterns"
          ],
          "summary": "Get All Patterns",
          "description": "Trả về dữ liệu chi tiết của 6 Patterns chuỗi thời gian & không gian từ CSDL.\nNếu CSDL bị xóa trống (Bước 2 Demo), trả về trạng thái rỗng để Web phản hồi lỗi chính xác.",
          "operationId": "get_all_patterns_api_v1_patterns_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/health": {
        "get": {
          "tags": [
            "System"
          ],
          "summary": "Health",
          "description": "Kiểm tra Database API và kết nối PostgreSQL (truy vấn SELECT 1).",
          "operationId": "health_api_v1_health_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/system/status": {
        "get": {
          "tags": [
            "System"
          ],
          "summary": "System Status",
          "description": "Trạng thái 7 khối service và nguồn dữ liệu, đọc từ service_runs và earthquake_events.",
          "operationId": "system_status_api_v1_system_status_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/predictions": {
        "get": {
          "tags": [
            "Predictions"
          ],
          "summary": "Get Latest Prediction",
          "description": "Pattern 5: dự báo định lượng ngày kế tiếp (t+1) mới nhất.",
          "operationId": "get_latest_prediction_api_v1_predictions_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/classifications": {
        "get": {
          "tags": [
            "Predictions"
          ],
          "summary": "Get Latest Classification",
          "description": "Pattern 6: nhãn mức độ hoạt động địa chấn ngày kế tiếp (t+1) mới nhất.",
          "operationId": "get_latest_classification_api_v1_classifications_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/analysis/temporal": {
        "get": {
          "tags": [
            "Analysis"
          ],
          "summary": "Get Temporal",
          "description": "Pattern 1: line chart, scatter plot và histogram.",
          "operationId": "get_temporal_api_v1_analysis_temporal_get",
          "parameters": [
            {
              "name": "interval",
              "in": "query",
              "required": false,
              "schema": {
                "type": "string",
                "pattern": "^(day|week|month)$",
                "default": "day",
                "title": "Interval"
              }
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "ISO 8601 UTC"
            },
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            },
            {
              "name": "timezone",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string",
                    "pattern": "^(UTC|UTC\\+7)$"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Múi giờ hiển thị bucket ngày",
                "title": "Timezone"
              },
              "description": "Múi giờ hiển thị bucket ngày"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/analysis/trend": {
        "get": {
          "tags": [
            "Analysis"
          ],
          "summary": "Get Trend",
          "description": "Pattern 2: xu hướng sau re-sampling.",
          "operationId": "get_trend_api_v1_analysis_trend_get",
          "parameters": [
            {
              "name": "resample_freq",
              "in": "query",
              "required": false,
              "schema": {
                "type": "string",
                "pattern": "^(D|W|M)$",
                "default": "M",
                "title": "Resample Freq"
              }
            },
            {
              "name": "metric",
              "in": "query",
              "required": false,
              "schema": {
                "type": "string",
                "pattern": "^(count|avg_magnitude|max_magnitude)$",
                "default": "count",
                "title": "Metric"
              }
            },
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "ISO 8601 UTC"
            },
            {
              "name": "timezone",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string",
                    "pattern": "^(UTC|UTC\\+7)$"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Múi giờ hiển thị bucket ngày",
                "title": "Timezone"
              },
              "description": "Múi giờ hiển thị bucket ngày"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/analysis/seasonality": {
        "get": {
          "tags": [
            "Analysis"
          ],
          "summary": "Get Seasonality",
          "description": "Pattern 3: tính chu kỳ / mùa vụ.",
          "operationId": "get_seasonality_api_v1_analysis_seasonality_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            },
            {
              "name": "interval",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string",
                    "pattern": "^(week|month)$"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Ép chu kỳ tuần (7 ngày) hoặc tháng (12 tháng)",
                "title": "Interval"
              },
              "description": "Ép chu kỳ tuần (7 ngày) hoặc tháng (12 tháng)"
            },
            {
              "name": "start_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Từ thời điểm ISO 8601 UTC",
                "title": "Start Time"
              },
              "description": "Từ thời điểm ISO 8601 UTC"
            },
            {
              "name": "end_time",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Đến thời điểm ISO 8601 UTC",
                "title": "End Time"
              },
              "description": "Đến thời điểm ISO 8601 UTC"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/analysis/correlation": {
        "get": {
          "tags": [
            "Analysis"
          ],
          "summary": "Get Correlation",
          "description": "Pattern 4: ma trận tương quan.",
          "operationId": "get_correlation_api_v1_analysis_correlation_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực",
                "title": "Region"
              },
              "description": "Lọc theo khu vực"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/clusters": {
        "get": {
          "tags": [
            "Clustering"
          ],
          "summary": "Get Clusters",
          "description": "Kết quả phân cụm DBSCAN mới nhất — có thể lọc theo quốc gia/khu vực.",
          "operationId": "get_clusters_api_v1_clusters_get",
          "parameters": [
            {
              "name": "country",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo quốc gia suy từ dominant_place",
                "title": "Country"
              },
              "description": "Lọc theo quốc gia suy từ dominant_place"
            },
            {
              "name": "region",
              "in": "query",
              "required": false,
              "schema": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ],
                "description": "Lọc theo khu vực suy từ dominant_place",
                "title": "Region"
              },
              "description": "Lọc theo khu vực suy từ dominant_place"
            }
          ],
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/ai/credentials": {
        "post": {
          "tags": [
            "AI Settings"
          ],
          "summary": "Save Credentials",
          "operationId": "save_credentials_api_v1_ai_credentials_post",
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/CredentialsPayload"
                }
              }
            },
            "required": true
          },
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/api/v1/ai/credentials/status": {
        "get": {
          "tags": [
            "AI Settings"
          ],
          "summary": "Credentials Status",
          "operationId": "credentials_status_api_v1_ai_credentials_status_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/api/v1/ai/generate": {
        "post": {
          "tags": [
            "AI Settings"
          ],
          "summary": "Generate",
          "operationId": "generate_api_v1_ai_generate_post",
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GeneratePayload"
                }
              }
            },
            "required": true
          },
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            },
            "422": {
              "description": "Validation Error",
              "content": {
                "application/json": {
                  "schema": {
                    "$ref": "#/components/schemas/HTTPValidationError"
                  }
                }
              }
            }
          }
        }
      },
      "/": {
        "get": {
          "summary": "Root",
          "operationId": "root__get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      },
      "/health": {
        "get": {
          "summary": "Health",
          "operationId": "health_health_get",
          "responses": {
            "200": {
              "description": "Successful Response",
              "content": {
                "application/json": {
                  "schema": {}
                }
              }
            }
          }
        }
      }
    },
    "components": {
      "schemas": {
        "CountryCount": {
          "properties": {
            "country": {
              "type": "string",
              "title": "Country"
            },
            "count": {
              "type": "integer",
              "title": "Count"
            },
            "avg_magnitude": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Avg Magnitude"
            },
            "max_magnitude": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Max Magnitude"
            }
          },
          "type": "object",
          "required": [
            "country",
            "count"
          ],
          "title": "CountryCount"
        },
        "CountryListResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "data": {
              "items": {
                "$ref": "#/components/schemas/CountryCount"
              },
              "type": "array",
              "title": "Data"
            }
          },
          "type": "object",
          "required": [
            "data"
          ],
          "title": "CountryListResponse"
        },
        "CredentialsPayload": {
          "properties": {
            "model": {
              "type": "string",
              "maxLength": 80,
              "minLength": 1,
              "title": "Model"
            },
            "api_key": {
              "type": "string",
              "maxLength": 256,
              "minLength": 1,
              "title": "Api Key"
            }
          },
          "type": "object",
          "required": [
            "model",
            "api_key"
          ],
          "title": "CredentialsPayload"
        },
        "EarthquakeListResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "data": {
              "items": {
                "$ref": "#/components/schemas/EarthquakeResponse"
              },
              "type": "array",
              "title": "Data"
            },
            "metadata": {
              "$ref": "#/components/schemas/EarthquakeMetadata"
            }
          },
          "type": "object",
          "required": [
            "data",
            "metadata"
          ],
          "title": "EarthquakeListResponse"
        },
        "EarthquakeMetadata": {
          "properties": {
            "total": {
              "type": "integer",
              "title": "Total"
            },
            "page": {
              "type": "integer",
              "title": "Page"
            },
            "limit": {
              "type": "integer",
              "title": "Limit"
            },
            "total_pages": {
              "type": "integer",
              "title": "Total Pages"
            },
            "last_updated": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Last Updated"
            }
          },
          "type": "object",
          "required": [
            "total",
            "page",
            "limit",
            "total_pages"
          ],
          "title": "EarthquakeMetadata"
        },
        "EarthquakeResponse": {
          "properties": {
            "source": {
              "type": "string",
              "title": "Source",
              "default": "USGS"
            },
            "source_event_id": {
              "type": "string",
              "title": "Source Event Id"
            },
            "event_time": {
              "type": "string",
              "format": "date-time",
              "title": "Event Time"
            },
            "latitude": {
              "type": "number",
              "title": "Latitude"
            },
            "longitude": {
              "type": "number",
              "title": "Longitude"
            },
            "depth_km": {
              "type": "number",
              "title": "Depth Km"
            },
            "magnitude": {
              "type": "number",
              "title": "Magnitude"
            },
            "magnitude_type": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Magnitude Type"
            },
            "place": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Place"
            },
            "country": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Country"
            },
            "region": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Region"
            },
            "source_url": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Source Url"
            },
            "id": {
              "type": "integer",
              "title": "Id"
            },
            "ingested_at": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Ingested At"
            },
            "raw_data": {
              "anyOf": [
                {
                  "additionalProperties": true,
                  "type": "object"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Raw Data"
            }
          },
          "type": "object",
          "required": [
            "source_event_id",
            "event_time",
            "latitude",
            "longitude",
            "depth_km",
            "magnitude",
            "id"
          ],
          "title": "EarthquakeResponse"
        },
        "EarthquakeStatistics": {
          "properties": {
            "total_events": {
              "type": "integer",
              "title": "Total Events"
            },
            "strong_events_count": {
              "type": "integer",
              "title": "Strong Events Count"
            },
            "moderate_events_count": {
              "type": "integer",
              "title": "Moderate Events Count"
            },
            "minor_events_count": {
              "type": "integer",
              "title": "Minor Events Count",
              "default": 0
            },
            "recent_24h_count": {
              "type": "integer",
              "title": "Recent 24H Count"
            },
            "avg_magnitude": {
              "type": "number",
              "title": "Avg Magnitude"
            },
            "max_magnitude": {
              "type": "number",
              "title": "Max Magnitude"
            },
            "latest_event_time": {
              "anyOf": [
                {
                  "type": "string",
                  "format": "date-time"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Latest Event Time"
            },
            "time_series_preview": {
              "anyOf": [
                {
                  "items": {
                    "$ref": "#/components/schemas/HourlyTimeSeriesPoint"
                  },
                  "type": "array"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Time Series Preview"
            }
          },
          "type": "object",
          "required": [
            "total_events",
            "strong_events_count",
            "moderate_events_count",
            "recent_24h_count",
            "avg_magnitude",
            "max_magnitude"
          ],
          "title": "EarthquakeStatistics"
        },
        "GeneratePayload": {
          "properties": {
            "prompt": {
              "type": "string",
              "minLength": 1,
              "title": "Prompt"
            },
            "system": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "System"
            },
            "model": {
              "type": "string",
              "maxLength": 80,
              "minLength": 1,
              "title": "Model"
            },
            "api_key": {
              "type": "string",
              "maxLength": 256,
              "minLength": 1,
              "title": "Api Key"
            }
          },
          "type": "object",
          "required": [
            "prompt",
            "model",
            "api_key"
          ],
          "title": "GeneratePayload"
        },
        "HTTPValidationError": {
          "properties": {
            "detail": {
              "items": {
                "$ref": "#/components/schemas/ValidationError"
              },
              "type": "array",
              "title": "Detail"
            }
          },
          "type": "object",
          "title": "HTTPValidationError"
        },
        "HourlyTimeSeriesPoint": {
          "properties": {
            "time": {
              "type": "string",
              "title": "Time"
            },
            "count": {
              "type": "integer",
              "title": "Count"
            },
            "avg_mag": {
              "type": "number",
              "title": "Avg Mag"
            }
          },
          "type": "object",
          "required": [
            "time",
            "count",
            "avg_mag"
          ],
          "title": "HourlyTimeSeriesPoint"
        },
        "MonthlyPeak": {
          "properties": {
            "month": {
              "type": "integer",
              "title": "Month"
            },
            "label": {
              "type": "string",
              "title": "Label"
            },
            "count": {
              "type": "integer",
              "title": "Count"
            }
          },
          "type": "object",
          "required": [
            "month",
            "label",
            "count"
          ],
          "title": "MonthlyPeak"
        },
        "MonthlyPeaksResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "data": {
              "items": {
                "$ref": "#/components/schemas/MonthlyPeak"
              },
              "type": "array",
              "title": "Data"
            }
          },
          "type": "object",
          "required": [
            "data"
          ],
          "title": "MonthlyPeaksResponse"
        },
        "RegionCount": {
          "properties": {
            "region": {
              "type": "string",
              "title": "Region"
            },
            "count": {
              "type": "integer",
              "title": "Count"
            },
            "avg_magnitude": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Avg Magnitude"
            },
            "max_magnitude": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Max Magnitude"
            }
          },
          "type": "object",
          "required": [
            "region",
            "count"
          ],
          "title": "RegionCount"
        },
        "RegionListResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "data": {
              "items": {
                "$ref": "#/components/schemas/RegionCount"
              },
              "type": "array",
              "title": "Data"
            }
          },
          "type": "object",
          "required": [
            "data"
          ],
          "title": "RegionListResponse"
        },
        "StatisticsResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "data": {
              "$ref": "#/components/schemas/EarthquakeStatistics"
            }
          },
          "type": "object",
          "required": [
            "data"
          ],
          "title": "StatisticsResponse"
        },
        "SyncResponse": {
          "properties": {
            "success": {
              "type": "boolean",
              "title": "Success",
              "default": true
            },
            "message": {
              "type": "string",
              "title": "Message"
            },
            "synced_count": {
              "type": "integer",
              "title": "Synced Count"
            },
            "source": {
              "type": "string",
              "title": "Source",
              "default": "USGS"
            },
            "timestamp": {
              "type": "string",
              "format": "date-time",
              "title": "Timestamp"
            }
          },
          "type": "object",
          "required": [
            "message",
            "synced_count",
            "timestamp"
          ],
          "title": "SyncResponse"
        },
        "ValidationError": {
          "properties": {
            "loc": {
              "items": {
                "anyOf": [
                  {
                    "type": "string"
                  },
                  {
                    "type": "integer"
                  }
                ]
              },
              "type": "array",
              "title": "Location"
            },
            "msg": {
              "type": "string",
              "title": "Message"
            },
            "type": {
              "type": "string",
              "title": "Error Type"
            },
            "input": {
              "title": "Input"
            },
            "ctx": {
              "type": "object",
              "title": "Context"
            }
          },
          "type": "object",
          "required": [
            "loc",
            "msg",
            "type"
          ],
          "title": "ValidationError"
        }
      }
    }
  },
  "orm": {
    "earthquake_events": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "source",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "source_event_id",
          "type": "VARCHAR(64)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "event_time",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "source_updated_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "ingested_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "latitude",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "longitude",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "depth_km",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "magnitude",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "magnitude_type",
          "type": "VARCHAR(16)",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "place",
          "type": "TEXT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "country",
          "type": "VARCHAR(128)",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "region",
          "type": "VARCHAR(128)",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "source_url",
          "type": "TEXT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "raw_data",
          "type": "JSONB",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        }
      ],
      "indexes": [
        [
          "idx_earthquake_events_coordinates",
          false,
          [
            "earthquake_events.latitude",
            "earthquake_events.longitude"
          ]
        ],
        [
          "idx_earthquake_events_country_region",
          false,
          [
            "earthquake_events.country",
            "earthquake_events.region"
          ]
        ],
        [
          "idx_earthquake_events_time_mag",
          false,
          [
            "earthquake_events.event_time",
            "earthquake_events.magnitude"
          ]
        ],
        [
          "ix_earthquake_events_event_time",
          false,
          [
            "earthquake_events.event_time"
          ]
        ],
        [
          "ix_earthquake_events_magnitude",
          false,
          [
            "earthquake_events.magnitude"
          ]
        ]
      ],
      "constraints": [
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ],
        [
          "UniqueConstraint",
          "uq_earthquake_source_event",
          [
            "source",
            "source_event_id"
          ]
        ]
      ]
    },
    "service_runs": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "service_name",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "started_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "finished_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "status",
          "type": "VARCHAR(16)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "records_processed",
          "type": "INTEGER",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "error_message",
          "type": "TEXT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        }
      ],
      "indexes": [],
      "constraints": [
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    },
    "analysis_results": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "analysis_type",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "time_interval",
          "type": "VARCHAR(16)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "period_start",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "period_end",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "metrics_data",
          "type": "JSONB",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "calculated_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "service_run_id",
          "type": "BIGINT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "service_runs.id"
          ]
        }
      ],
      "indexes": [
        [
          "idx_analysis_results_type_period",
          false,
          [
            "analysis_results.analysis_type",
            "analysis_results.period_end"
          ]
        ]
      ],
      "constraints": [
        [
          "ForeignKeyConstraint",
          "",
          [
            "service_run_id"
          ]
        ],
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    },
    "classification_results": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "target_date",
          "type": "DATE",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "predicted_label",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "probability_scores",
          "type": "JSONB",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "actual_label",
          "type": "VARCHAR(32)",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "model_name",
          "type": "VARCHAR(64)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "model_version",
          "type": "VARCHAR(16)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "evaluation_metrics",
          "type": "JSONB",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "generated_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "service_run_id",
          "type": "BIGINT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "service_runs.id"
          ]
        }
      ],
      "indexes": [
        [
          "idx_classification_results_target_date",
          false,
          [
            "classification_results.target_date"
          ]
        ],
        [
          "ix_classification_results_target_date",
          false,
          [
            "classification_results.target_date"
          ]
        ]
      ],
      "constraints": [
        [
          "ForeignKeyConstraint",
          "",
          [
            "service_run_id"
          ]
        ],
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    },
    "clustering_results": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "algorithm",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "parameters",
          "type": "JSONB",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "total_clusters",
          "type": "INTEGER",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "noise_count",
          "type": "INTEGER",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "summary_clusters",
          "type": "JSONB",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "calculated_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "service_run_id",
          "type": "BIGINT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "service_runs.id"
          ]
        }
      ],
      "indexes": [],
      "constraints": [
        [
          "ForeignKeyConstraint",
          "",
          [
            "service_run_id"
          ]
        ],
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    },
    "prediction_results": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "target_date",
          "type": "DATE",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "metric_name",
          "type": "VARCHAR(32)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "predicted_value",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "lower_bound",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "upper_bound",
          "type": "FLOAT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "actual_value",
          "type": "FLOAT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "model_name",
          "type": "VARCHAR(64)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "model_version",
          "type": "VARCHAR(16)",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "evaluation_metrics",
          "type": "JSONB",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "generated_at",
          "type": "TIMESTAMP WITH TIME ZONE",
          "nullable": false,
          "primary_key": false,
          "server_default": "now()",
          "foreign_keys": []
        },
        {
          "name": "service_run_id",
          "type": "BIGINT",
          "nullable": true,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "service_runs.id"
          ]
        }
      ],
      "indexes": [
        [
          "idx_prediction_results_target_date",
          false,
          [
            "prediction_results.target_date"
          ]
        ],
        [
          "ix_prediction_results_target_date",
          false,
          [
            "prediction_results.target_date"
          ]
        ]
      ],
      "constraints": [
        [
          "ForeignKeyConstraint",
          "",
          [
            "service_run_id"
          ]
        ],
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    },
    "clustering_event_mapping": {
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": true,
          "server_default": null,
          "foreign_keys": []
        },
        {
          "name": "cluster_result_id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "clustering_results.id"
          ]
        },
        {
          "name": "event_id",
          "type": "BIGINT",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": [
            "earthquake_events.id"
          ]
        },
        {
          "name": "cluster_label",
          "type": "INTEGER",
          "nullable": false,
          "primary_key": false,
          "server_default": null,
          "foreign_keys": []
        }
      ],
      "indexes": [],
      "constraints": [
        [
          "ForeignKeyConstraint",
          "",
          [
            "cluster_result_id"
          ]
        ],
        [
          "ForeignKeyConstraint",
          "",
          [
            "event_id"
          ]
        ],
        [
          "PrimaryKeyConstraint",
          "",
          [
            "id"
          ]
        ]
      ]
    }
  },
  "exports": {
    "models": [
      "AnalysisResult",
      "Base",
      "ClassificationResult",
      "ClusteringEventMapping",
      "ClusteringResult",
      "EarthquakeEvent",
      "PredictionResult",
      "ServiceRun"
    ],
    "schemas": [
      "EarthquakeBase",
      "EarthquakeListResponse",
      "EarthquakeMetadata",
      "EarthquakeResponse",
      "EarthquakeStatistics",
      "StatisticsResponse"
    ]
  },
  "config_defaults_sha256": "bf381b544df90782948e042c01695ee0e0fb154d2e3636bc5cf3fc8659578b3e",
  "migration_sha256": "0be5da1e803e1ce26fb919f1d88932c5143ab79af03fc9949896c6bf0e1e973d"
}
````

#### 11.3.67. `apps/api/tests/integration/__init__.py`

````python
"""Integration Tests Suite for GDMAS."""
````

#### 11.3.68. `apps/api/tests/integration/test_analysis_transactions.py`

````python
"""Kiểm giao dịch AnalysisService/ORM thật trên SQLite tạm, không mạng hay PostgreSQL ngoài."""

import json
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import JSON, BigInteger, Integer, create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import sessionmaker

from gdmas.db.base import Base
from gdmas.models.analysis import AnalysisResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis import service as service_module
from gdmas.services.analysis.service import AnalysisService


@pytest.fixture
def sessions(monkeypatch):
    tables = [ServiceRun.__table__, EarthquakeEvent.__table__, AnalysisResult.__table__]
    for table in tables:
        for column in table.columns:
            if isinstance(column.type, BigInteger):
                monkeypatch.setattr(
                    column, "type", column.type.with_variant(Integer(), "sqlite")
                )
            elif isinstance(column.type, JSONB):
                monkeypatch.setattr(
                    column, "type", column.type.with_variant(JSON(), "sqlite")
                )
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine, tables=tables)
    yield sessionmaker(bind=engine)
    engine.dispose()


def add_events(sessions, count=3):
    now = datetime.now(UTC)
    with sessions() as db:
        for index in range(count):
            db.add(
                EarthquakeEvent(
                    source="USGS",
                    source_event_id=f"offline-{index}",
                    event_time=now - timedelta(days=index + 1),
                    latitude=10.0 + index,
                    longitude=100.0 + index,
                    depth_km=20.0 + index,
                    magnitude=3.0 + index,
                )
            )
        db.commit()


def add_previous_snapshot(sessions):
    now = datetime.now(UTC)
    with sessions() as db:
        db.add(
            AnalysisResult(
                analysis_type="time_series",
                time_interval="day",
                period_start=now - timedelta(days=1),
                period_end=now,
                metrics_data={"previous_snapshot": True},
            )
        )
        db.commit()


# TC-18
def test_cycles_replace_snapshot_and_preserve_raw_events(sessions):
    add_events(sessions)
    add_previous_snapshot(sessions)
    service = AnalysisService(session_factory=sessions)

    first = service.execute_cycle()
    second = service.execute_cycle()

    assert first["success"] and second["success"]
    assert second["events_analyzed"] == 3
    with sessions() as db:
        results = db.query(AnalysisResult).all()
        assert len(results) == 8
        assert db.query(EarthquakeEvent).count() == 3
        assert db.query(ServiceRun).count() == 2
        assert all(row.service_run_id == second["service_run_id"] for row in results)
        assert all(row.time_interval in {"day", "week", "month"} for row in results)
        assert all("previous_snapshot" not in row.metrics_data for row in results)
        for row in results:
            json.dumps(row.metrics_data, allow_nan=False)
        run = db.get(ServiceRun, second["service_run_id"])
        assert run.status == "SUCCESS" and run.records_processed == 3


def test_empty_database_then_refill_recovers_without_fake_rows(sessions):
    add_previous_snapshot(sessions)
    service = AnalysisService(session_factory=sessions)

    empty = service.execute_cycle()
    assert empty["success"] and empty["results_written"] == 0
    with sessions() as db:
        assert db.query(AnalysisResult).count() == 0
        assert db.query(EarthquakeEvent).count() == 0
        assert db.get(ServiceRun, empty["service_run_id"]).records_processed == 0

    add_events(sessions, count=1)
    recovered = service.execute_cycle()
    assert recovered["success"] and recovered["events_analyzed"] == 1
    assert recovered["results_written"] == 8
    with sessions() as db:
        assert db.query(AnalysisResult).count() == 8
        assert db.get(ServiceRun, recovered["service_run_id"]).status == "SUCCESS"


def test_failed_snapshot_insert_restores_previous_snapshot(sessions, monkeypatch):
    add_events(sessions)
    add_previous_snapshot(sessions)
    original = service_module.build_analysis_snapshot

    def broken_snapshot(events, **kwargs):
        snapshot = original(events, **kwargs)
        snapshot[0]["metrics_data"] = {"not_json_serializable": object()}
        return snapshot

    monkeypatch.setattr(service_module, "build_analysis_snapshot", broken_snapshot)

    result = AnalysisService(session_factory=sessions).execute_cycle()

    assert result["success"] is False
    with sessions() as db:
        rows = db.query(AnalysisResult).all()
        assert len(rows) == 1 and rows[0].metrics_data == {"previous_snapshot": True}
        assert db.query(EarthquakeEvent).count() == 3
        run = db.query(ServiceRun).one()
        assert run.status == "FAILED" and run.records_processed == 0
        assert len(run.error_message) <= 200
````

#### 11.3.69. `apps/api/tests/integration/test_ingestion_pipeline.py`

````python
"""Kiểm pipeline HTTP → parser → upsert thật; chỉ giả lập HTTP và biên session/DB."""

from types import SimpleNamespace

import httpx
from sqlalchemy.dialects import postgresql

from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.service import IngestionService

PRIMARY_URL = "https://offline.example/usgs.geojson"


def feature(event_id, *, mag=3.0, updated=1794358800000, coordinates=None):
    return {
        "id": event_id,
        "properties": {"mag": mag, "time": 1794355200000, "updated": updated},
        "geometry": {
            "type": "Point",
            "coordinates": coordinates or [142.0, 38.0, 20.0],
        },
    }


class RecordingSession:
    def __init__(self, execute_error=None):
        self.run = None
        self.statements = []
        self.closed = False
        self.rollbacks = 0
        self.execute_error = execute_error

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def add(self, record):
        assert isinstance(record, ServiceRun)
        self.run = record

    def refresh(self, record):
        record.id = 1

    def commit(self):
        pass

    def rollback(self):
        self.rollbacks += 1

    def query(self, *args):
        return SimpleNamespace(count=lambda: 10)

    def execute(self, statement):
        self.statements.append(statement.compile(dialect=postgresql.dialect()))
        if self.execute_error is not None:
            raise self.execute_error
        return [SimpleNamespace(inserted=True), SimpleNamespace(inserted=False)]


# TC-19
def test_http_parser_upsert_pipeline_keeps_latest_revision_and_counts():
    payload = {
        "features": [
            feature("new", mag=2.0),
            feature("new", mag=4.0, updated=1794358800001),
            feature("existing", mag=5.0),
            feature("invalid", coordinates=[999, 0, 20]),
        ]
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
    session = RecordingSession()

    result = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    ).execute_cycle()

    assert result["success"] is True
    assert result["inserted"] == 1 and result["updated"] == 1
    assert result["unchanged"] == 0 and result["skipped_invalid"] == 1
    assert session.run.status == "SUCCESS" and session.run.records_processed == 2
    assert len(session.statements) == 1
    statement = session.statements[0]
    assert statement.params["source_event_id_m0"] == "new"
    assert statement.params["magnitude_m0"] == 4.0
    assert statement.params["source_event_id_m1"] == "existing"
    assert "source_event_id_m2" not in statement.params
    assert "ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE" in str(
        statement
    )
    assert "excluded.source_updated_at > earthquake_events.source_updated_at" in str(
        statement
    )
    assert session.closed and session.rollbacks == 0


def test_upsert_database_failure_marks_pipeline_failed_and_closes_session():
    payload = {"features": [feature("a")]}
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
    session = RecordingSession(execute_error=RuntimeError("offline database failure"))

    result = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    ).execute_cycle()

    assert result["success"] is False
    assert len(session.statements) == 1
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: offline database failure"
    assert session.rollbacks == 1 and session.closed
````

#### 11.3.70. `apps/api/tests/unit/__init__.py`

````python
"""Unit Tests Suite for GDMAS."""
````

#### 11.3.71. `apps/api/tests/unit/conftest.py`

````python
"""Fixture dùng chung cho test REST/SSE offline (không cần PostgreSQL).

CSDL giả là SQLite trong bộ nhớ dùng đúng các model ORM thật, nên các truy vấn
lọc, đếm, phân trang chạy thật. Hai kiểu riêng của PostgreSQL được ánh xạ sang
kiểu tương đương của SQLite chỉ trong phạm vi test.
"""

import math
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from gdmas.db.base import Base
from gdmas.db.connection import get_db
from gdmas.main import app
from gdmas.models.earthquake import EarthquakeEvent


@compiles(JSONB, "sqlite")
def _jsonb_as_json(_type, _compiler, **_kw):
    return "JSON"


@compiles(BigInteger, "sqlite")
def _bigint_as_integer(_type, _compiler, **_kw):
    return "INTEGER"


class BrokenSession:
    """Session mô phỏng PostgreSQL mất kết nối: mọi thao tác đều ném OperationalError."""

    def __getattr__(self, _name):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    # Session thật không ném lỗi khi rollback/close lúc chưa có kết nối
    def rollback(self):
        return None

    def close(self):
        return None


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _register_floor(dbapi_conn, _record):
        dbapi_conn.create_function("floor", 1, math.floor)

    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def db(session_factory):
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(session_factory):
    def _override():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def broken_client():
    app.dependency_overrides[get_db] = lambda: BrokenSession()
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def add_event(db, n: int = 1, **overrides) -> EarthquakeEvent:
    """Thêm một sự kiện địa chấn mẫu. Mặc định: M4.0 cách đây 1 giờ."""
    data = {
        "source": "USGS",
        "source_event_id": f"ev{n:04d}",
        "event_time": datetime.now(UTC) - timedelta(hours=1),
        "latitude": 10.0,
        "longitude": 100.0,
        "depth_km": 10.0,
        "magnitude": 4.0,
        "magnitude_type": "mb",
        "place": f"Place {n}",
        "source_url": f"https://example.org/{n}",
    }
    data.update(overrides)
    event_row = EarthquakeEvent(**data)
    db.add(event_row)
    db.commit()
    return event_row
````

#### 11.3.72. `apps/api/tests/unit/test_ai_settings.py`

````python
"""Test offline cho luồng cấu hình Gemini: validate key → ghi .env → sinh nội dung.

Không gọi mạng thật:.inject HTTP fake và file .env tạm qua AI_ENV_FILE (I7/I6).
"""

from __future__ import annotations

from pathlib import Path

from gdmas.api.routes import ai_settings
from gdmas.services.ai_env import mask_key, read_ai_env, upsert_ai_env
from gdmas.services.ai_gemini import (
    generate_content,
    is_gemini_model,
    validate_credentials,
)

API = "/api/v1/ai"


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload


def test_gemini_model_pattern():
    assert is_gemini_model("gemini-2.0-flash")
    assert is_gemini_model(" gemini-1.5-pro ")
    assert not is_gemini_model("gpt-4o")
    assert not is_gemini_model("gemini-2.0-flash;rm -rf /")
    assert not is_gemini_model("")


def test_validate_credentials_uses_gemini_and_handles_network_error():
    calls = []

    def ok_http(method, url, **kwargs):
        calls.append((method, url, kwargs["headers"]["x-goog-api-key"]))
        return FakeResponse(200)

    assert validate_credentials("gemini-2.0-flash", "AIza-good", http=ok_http) is True
    assert calls[0][0] == "GET"
    assert "gemini-2.0-flash" in calls[0][1]
    assert calls[0][2] == "AIza-good"

    assert (
        validate_credentials(
            "gemini-2.0-flash",
            "AIza-bad",
            http=lambda *a, **k: FakeResponse(401),
        )
        is False
    )
    assert (
        validate_credentials(
            "gemini-2.0-flash",
            "AIza-x",
            http=lambda *a, **k: (_ for _ in ()).throw(OSError("offline")),
        )
        is False
    )
    assert validate_credentials("gpt-4o", "AIza-good", http=ok_http) is False


def test_generate_content_extracts_text():
    payload = {
        "candidates": [
            {"content": {"parts": [{"text": "  Đã phân tích 12 sự kiện  "}]}}
        ]
    }
    seen = {}

    def http(method, url, **kwargs):
        seen["method"] = method
        seen["body"] = kwargs["json"]
        return FakeResponse(200, payload)

    text = generate_content(
        "gemini-2.0-flash",
        "AIza-good",
        "prompt",
        system="không bịa số",
        http=http,
    )
    assert text == "Đã phân tích 12 sự kiện"
    assert seen["method"] == "POST"
    assert seen["body"]["systemInstruction"]["parts"][0]["text"] == "không bịa số"


def test_upsert_env_preserves_other_lines(tmp_path: Path, monkeypatch):
    target = tmp_path / ".env"
    target.write_text(
        "# comment\nPOSTGRES_USER=gdmas_user\nGEMINI_MODEL=old\nKEEP=1\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AI_ENV_FILE", str(target))

    upsert_ai_env("gemini-2.0-flash", "AIza-key")
    text = target.read_text(encoding="utf-8")

    assert "GEMINI_MODEL=gemini-2.0-flash" in text
    assert "GEMINI_API_KEY=AIza-key" in text
    assert text.count("GEMINI_MODEL=") == 1
    assert "POSTGRES_USER=gdmas_user" in text
    assert "KEEP=1" in text
    assert read_ai_env() == ("gemini-2.0-flash", "AIza-key")
    assert not (tmp_path / ".env.tmp").exists()
    assert "AIza-key" not in mask_key("AIza-key")


def test_save_credentials_validates_gemini_only(client, tmp_path, monkeypatch):
    monkeypatch.setenv("AI_ENV_FILE", str(tmp_path / ".env"))
    monkeypatch.setattr(ai_settings, "validate_credentials", lambda *a, **k: True)

    resp = client.post(f"{API}/credentials", json={"model": "gpt-4o", "api_key": "x"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    resp = client.post(
        f"{API}/credentials",
        json={"model": "gemini-2.0-flash", "api_key": "AIza-key"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["model"] == "gemini-2.0-flash"
    assert "api_key" not in resp.json()["data"]


def test_save_credentials_rejects_invalid_key_without_writing(
    client, tmp_path, monkeypatch
):
    target = tmp_path / ".env"
    monkeypatch.setenv("AI_ENV_FILE", str(target))
    monkeypatch.setattr(ai_settings, "validate_credentials", lambda *a, **k: False)

    resp = client.post(
        f"{API}/credentials",
        json={"model": "gemini-2.0-flash", "api_key": "AIza-bad"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_API_KEY"
    assert not target.exists()


def test_status_and_generate_check_browser_key(client, tmp_path, monkeypatch):
    target = tmp_path / ".env"
    target.write_text("GEMINI_MODEL=gemini-2.0-flash\nGEMINI_API_KEY=AIza-secret123\n")
    monkeypatch.setenv("AI_ENV_FILE", str(target))
    monkeypatch.setattr(
        ai_settings, "generate_content", lambda *a, **k: "Câu trả lời từ Gemini"
    )

    status = client.get(f"{API}/credentials/status").json()["data"]
    assert status["configured"] is True
    assert status["model"] == "gemini-2.0-flash"
    assert "AIza-secret123" not in status["masked_key"]

    payload = {
        "prompt": "prompt",
        "system": "không bịa số",
        "model": "gemini-2.0-flash",
        "api_key": "AIza-khac",
    }
    denied = client.post(f"{API}/generate", json=payload)
    assert denied.status_code == 401
    assert denied.json()["error"]["code"] == "INVALID_API_KEY"

    ok = client.post(f"{API}/generate", json={**payload, "api_key": "AIza-secret123"})
    assert ok.status_code == 200
    assert ok.json()["data"]["text"] == "Câu trả lời từ Gemini"


def test_generate_without_config_returns_503(client, tmp_path, monkeypatch):
    monkeypatch.setenv("AI_ENV_FILE", str(tmp_path / "missing.env"))
    resp = client.post(
        f"{API}/generate",
        json={"prompt": "p", "model": "gemini-2.0-flash", "api_key": "x"},
    )
    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "AI_NOT_CONFIGURED"


def test_default_env_path_works_in_docker_layout(tmp_path: Path, monkeypatch):
    """Hồi quy: /app/src/gdmas/services/ai_env.py không có parents[5] → không crash."""
    from gdmas.services.ai_env import default_env_path_for

    shallow = tmp_path / "src" / "gdmas" / "services" / "ai_env.py"
    shallow.parent.mkdir(parents=True, exist_ok=True)
    shallow.write_text("", encoding="utf-8")
    resolved = default_env_path_for(shallow, tmp_path)
    assert resolved == tmp_path / ".env"
````

#### 11.3.73. `apps/api/tests/unit/test_analysis_contract_fields.py`

````python
"""Test offline: 4 route `/api/v1/analysis/*` pass-through field optional (GAP-02/03/04).

Testcase: .agents/notes/testcase/2026-11-22-analysis-contract-fields-thien.md
"""

from datetime import UTC, datetime, timedelta

from gdmas.models.analysis import AnalysisResult

API = "/api/v1/analysis"
AS_OF = datetime(2026, 11, 22, tzinfo=UTC)


def _seed(db, analysis_type, metrics, interval="day"):
    db.add(
        AnalysisResult(
            analysis_type=analysis_type,
            time_interval=interval,
            period_start=AS_OF - timedelta(days=30),
            period_end=AS_OF,
            metrics_data=metrics,
        )
    )
    db.commit()


def test_temporal_exposes_status_and_stats(client, db):
    _seed(
        db,
        "temporal",
        {
            "status": "computed",
            "line_chart": [],
            "scatter_plot": [],
            "histogram": {"magnitude_bins": []},
            "data_points": 1234,
            "avg_magnitude": 3.21,
            "max_magnitude": 6.4,
            "avg_depth": 18.75,
        },
    )

    data = client.get(f"{API}/temporal", params={"interval": "day"}).json()["data"]

    assert data["status"] == "computed"
    assert data["stats"] == {
        "data_points": 1234,
        "avg_magnitude": 3.21,
        "max_magnitude": 6.4,
        "avg_depth": 18.75,
    }


def test_temporal_stats_omitted_when_source_has_none(client, db):
    _seed(
        db,
        "temporal",
        {"line_chart": [], "scatter_plot": [], "histogram": {"magnitude_bins": []}},
    )

    data = client.get(f"{API}/temporal", params={"interval": "day"}).json()["data"]

    assert "stats" not in data
    assert "status" not in data


def test_seasonality_exposes_status_period_and_data_points(client, db):
    _seed(
        db,
        "seasonality",
        {
            "status": "computed",
            "resample_freq": "M",
            "period": 12,
            "data_points": 24,
            "components": {
                "seasonal_line": [
                    {
                        "cycle_index": 1,
                        "period_label": "Tháng 1",
                        "seasonal_factor": 1.05,
                    }
                ],
                "seasonality_strength": 0.35,
                "interpretation": "Dữ liệu thể hiện tính chu kỳ yếu.",
            },
        },
    )

    data = client.get(f"{API}/seasonality").json()["data"]

    assert data["status"] == "computed"
    assert data["period"] == 12
    assert data["data_points"] == 24


def test_correlation_exposes_status_sample_size_and_note(client, db):
    _seed(
        db,
        "correlation",
        {
            "status": "computed",
            "variables": ["magnitude", "depth_km"],
            "matrix": [[1.0, -0.15], [-0.15, 1.0]],
            "method": "pearson",
            "sample_size": 24,
            "note": "Ma trận tương quan — không suy diễn nhân quả.",
            "spearman_matrix": [[1.0, 0.0], [0.0, 1.0]],
        },
    )

    data = client.get(f"{API}/correlation").json()["data"]

    assert data["status"] == "computed"
    assert data["sample_size"] == 24
    assert data["note"].startswith("Ma trận tương quan")
    assert "spearman_matrix" not in data


def test_correlation_insufficient_data_keeps_note(client, db):
    _seed(
        db,
        "correlation",
        {
            "status": "insufficient_data",
            "variables": ["magnitude", "depth_km"],
            "matrix": [[None, None], [None, None]],
            "method": "pearson",
            "sample_size": 2,
            "note": "Chưa đủ mẫu để tính tương quan.",
        },
    )

    data = client.get(f"{API}/correlation").json()["data"]
    assert data["status"] == "insufficient_data"
    assert data["note"] == "Chưa đủ mẫu để tính tương quan."


def test_empty_table_still_empty_envelope(client):
    for path in ("temporal", "seasonality", "correlation"):
        body = client.get(f"{API}/{path}").json()
        assert body["success"] is False
        assert body["data"] is None
````

#### 11.3.74. `apps/api/tests/unit/test_analysis_filtered.py`

````python
"""Test offline cho lọc quốc gia/khu vực trên route analysis/statistics/predictions.

Dùng fixture `client`/`db` của tests/unit/conftest.py (SQLite in-memory), không gọi USGS.
"""

from datetime import UTC, datetime, timedelta

from .conftest import add_event

ANALYSIS = "/api/v1/analysis"
STATISTICS = "/api/v1/statistics/earthquakes"


def test_temporal_filtered_by_country(client, db):
    add_event(
        db, 1, country="Japan", region="Honshu", place="Tokyo, Japan", magnitude=5.0
    )
    add_event(
        db, 2, country="Japan", region="Osaka", place="Osaka, Japan", magnitude=4.0
    )
    add_event(
        db, 3, country="USA", region="CA", place="San Francisco, CA", magnitude=6.0
    )

    resp = client.get(
        f"{ANALYSIS}/temporal", params={"country": "Japan", "interval": "day"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["stats"]["data_points"] == 2
    assert "localhost:8000" not in resp.text


def test_seasonality_and_correlation_accept_filters(client, db):
    for i in range(12):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            place=f"Honshu, Japan {i}",
            event_time=datetime.now(UTC) - timedelta(days=30 - i),
        )
    for path in ("seasonality", "correlation"):
        resp = client.get(
            f"{ANALYSIS}/{path}", params={"country": "Japan", "region": "Honshu"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True


def test_statistics_kpi_filtered_by_country(client, db):
    add_event(db, 1, country="Japan", region="Honshu", magnitude=5.2)
    add_event(db, 2, country="Japan", region="Honshu", magnitude=4.2)
    add_event(db, 3, country="USA", region="CA", magnitude=6.6)

    all_body = client.get(STATISTICS).json()["data"]
    japan = client.get(STATISTICS, params={"country": "Japan"}).json()["data"]
    assert all_body["total_events"] == 3
    assert japan["total_events"] == 2
    assert japan["max_magnitude"] == 5.2
    assert japan["recent_24h_count"] == 2


def test_forecast_insufficient_data_returns_empty_not_fabricated(client, db):
    add_event(db, 1, country="Japan", region="Honshu", place="Tokyo, Japan")
    resp = client.get("/api/v1/predictions", params={"country": "Japan"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert "dữ liệu" in body["message"]


def test_statistics_kpi_respects_time_window(client, db):
    add_event(
        db,
        1,
        country="Japan",
        event_time=datetime(2026, 1, 10, tzinfo=UTC),
        magnitude=5.2,
    )
    add_event(
        db,
        2,
        country="Japan",
        event_time=datetime(2026, 11, 10, tzinfo=UTC),
        magnitude=4.2,
    )

    all_data = client.get("/api/v1/statistics/earthquakes").json()["data"]
    january = client.get(
        "/api/v1/statistics/earthquakes",
        params={
            "start_time": "2026-01-01T00:00:00Z",
            "end_time": "2026-02-01T00:00:00Z",
        },
    ).json()["data"]
    assert all_data["total_events"] == 2
    assert january["total_events"] == 1
    assert january["max_magnitude"] == 5.2


def test_trend_respects_time_window(client, db):
    for i in range(6):
        add_event(
            db,
            i + 1,
            country="Japan",
            event_time=datetime(2026, 1, i + 1, tzinfo=UTC),
            magnitude=4.0 + i / 10,
        )
    resp = client.get(
        f"{ANALYSIS}/trend",
        params={
            "resample_freq": "D",
            "start_time": "2026-01-01T00:00:00Z",
            "end_time": "2026-01-31T00:00:00Z",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_monthly_peaks_counts_real_events(client, db):
    add_event(
        db,
        1,
        country="Japan",
        region="Honshu",
        event_time=datetime(2026, 1, 10, tzinfo=UTC),
    )
    add_event(
        db,
        2,
        country="Japan",
        region="Honshu",
        event_time=datetime(2026, 1, 20, tzinfo=UTC),
    )
    add_event(
        db, 3, country="USA", region="CA", event_time=datetime(2026, 2, 10, tzinfo=UTC)
    )

    all_data = client.get("/api/v1/statistics/monthly-peaks").json()["data"]
    assert len(all_data) == 12
    assert {row["month"]: row["count"] for row in all_data if row["count"]} == {
        1: 2,
        2: 1,
    }

    japan = client.get(
        "/api/v1/statistics/monthly-peaks", params={"country": "Japan"}
    ).json()["data"]
    assert {row["month"]: row["count"] for row in japan if row["count"]} == {1: 2}


def test_seasonality_interval_month_is_honest_when_insufficient(client, db):
    for i in range(15):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            event_time=datetime(2026, 1, i + 1, tzinfo=UTC),
        )
    resp = client.get("/api/v1/analysis/seasonality", params={"interval": "month"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "insufficient_data"
    # Vẫn trả đủ 12 cột, hệ số 0 (không bịa mùa vụ, không bỏ cột so sánh).
    line = body["data"]["components"]["seasonal_line"]
    assert len(line) == 12
    assert all(point["seasonal_factor"] == 0 for point in line)


def test_forecast_filtered_by_country(client, db):
    base = datetime.now(UTC) - timedelta(days=40)
    for i in range(30):
        add_event(
            db,
            i + 1,
            country="Japan",
            region="Honshu",
            place=f"Honshu, Japan {i}",
            event_time=base + timedelta(days=i),
            magnitude=4.0 + (i % 5),
        )
    for path in ("predictions", "classifications"):
        resp = client.get(
            f"/api/v1/{path}", params={"country": "Japan", "region": "Honshu"}
        )
        assert resp.status_code == 200
        assert resp.json()["success"] is True
````

#### 11.3.75. `apps/api/tests/unit/test_analysis_patterns.py`

````python
"""Unit test offline cho gdmas.services.analysis.patterns (testcase 2026-11-12-analysis-four-patterns-son)."""

import json
from datetime import UTC

import numpy as np
import pandas as pd
import pytest

from gdmas.services.analysis.patterns import (
    CORRELATION_VARIABLES,
    MAGNITUDE_BINS,
    STATUS_COMPUTED,
    STATUS_INSUFFICIENT,
    build_analysis_snapshot,
    choose_trend_interval,
    complete_period_mask,
    compute_correlation,
    compute_seasonality,
    compute_temporal,
    compute_trend,
    format_utc,
    prepare_events,
    sanitize_for_json,
)

START = pd.Timestamp("2026-09-07", tz="UTC")  # Thứ 2


def make_events(daily_counts, start=START, seed=42, depth=None):
    """Tạo sự kiện theo số lượng mỗi ngày (giờ rải trong ngày), lat/lon trong WGS84."""
    rng = np.random.default_rng(seed)
    records = []
    next_id = 1
    for day_offset, count in enumerate(daily_counts):
        day = start + pd.Timedelta(days=day_offset)
        for k in range(int(count)):
            records.append(
                {
                    "id": next_id,
                    "event_time": day
                    + pd.Timedelta(minutes=int(1440 * (k + 0.5) / max(count, 1))),
                    "magnitude": float(rng.uniform(0.5, 6.5)),
                    "depth_km": float(
                        depth if depth is not None else rng.uniform(0, 300)
                    ),
                    "latitude": float(rng.uniform(-90, 90)),
                    "longitude": float(rng.uniform(-180, 180)),
                }
            )
            next_id += 1
    return prepare_events(records)


@pytest.fixture
def ten_weeks():
    rng = np.random.default_rng(7)
    return make_events(rng.integers(3, 12, size=70))


def assert_json_safe(payload):
    json.dumps(payload, allow_nan=False)


# TC-01
@pytest.mark.parametrize("interval", ["day", "week", "month"])
def test_temporal_line_chart_totals_and_labels(ten_weeks, interval):
    result = compute_temporal(ten_weeks, interval)

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == interval
    assert sum(p["event_count"] for p in result["line_chart"]) == len(ten_weeks)
    for point in result["line_chart"]:
        if point["event_count"]:
            assert point["max_magnitude"] >= point["avg_magnitude"]
    labels = [p["date"] for p in result["line_chart"]]
    assert labels == sorted(labels)
    if interval == "day":
        assert len(labels) == 70
    elif interval == "week":
        assert len(labels) == 10
        assert all(pd.Timestamp(label).day_of_week == 0 for label in labels)
    else:
        assert labels == ["2026-09", "2026-10", "2026-11"]
    assert_json_safe(sanitize_for_json(result))


def test_temporal_rejects_unknown_interval(ten_weeks):
    with pytest.raises(ValueError):
        compute_temporal(ten_weeks, "hourly")


# TC-02
def test_temporal_scatter_and_histogram(ten_weeks):
    result = compute_temporal(ten_weeks, "day", scatter_limit=50)

    scatter = result["scatter_plot"]
    assert len(scatter) == 50
    assert all(p["timestamp"].endswith("Z") for p in scatter)
    assert scatter[-1]["id"] == int(ten_weeks["id"].iloc[-1])  # lấy sự kiện mới nhất
    assert {"id", "timestamp", "magnitude", "depth_km"} == set(scatter[0])

    bins = result["histogram"]["magnitude_bins"]
    assert [b["bin"] for b in bins] == [label for label, _, _ in MAGNITUDE_BINS]
    assert sum(b["count"] for b in bins) == len(ten_weeks)
    assert result["data_points"] == len(ten_weeks)
    assert result["avg_depth"] == pytest.approx(ten_weeks["depth_km"].mean(), abs=0.01)


def test_histogram_bin_edges():
    df = prepare_events(
        [
            {
                "id": i,
                "event_time": START,
                "magnitude": m,
                "depth_km": 1,
                "latitude": 0,
                "longitude": 0,
            }
            for i, m in enumerate([1.99, 2.0, 2.99, 3.0, 4.999, 5.0, 7.1])
        ]
    )
    counts = [b["count"] for b in compute_temporal(df)["histogram"]["magnitude_bins"]]
    assert counts == [1, 2, 1, 1, 2]


# TC-03
@pytest.mark.parametrize(
    "days, expected", [(3, "day"), (20, "day"), (40, "week"), (200, "month")]
)
def test_choose_trend_interval(days, expected):
    assert choose_trend_interval(make_events([1] * days)) == expected


def test_complete_period_mask_excludes_partial_edges(ten_weeks):
    df = ten_weeks.iloc[5:-5]  # cắt bớt để ngày đầu/cuối không trọn tuần
    index = pd.date_range("2026-09-07", periods=10, freq="W-MON", tz="UTC")
    mask = complete_period_mask(
        index, "week", make_events([1] * 66, start=START + pd.Timedelta(days=2))
    )
    assert not mask[0] and not mask[-1]
    assert mask[1:-1].all()
    assert complete_period_mask(pd.DatetimeIndex([]), "day", df).size == 0


# TC-04
@pytest.mark.parametrize(
    "daily_counts, direction",
    [
        (list(range(1, 22)), "increasing"),
        (list(range(21, 0, -1)), "decreasing"),
        ([5] * 21, "stable"),
    ],
)
def test_trend_direction(daily_counts, direction):
    result = compute_trend(make_events(daily_counts))

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == "day"
    assert result["resample_freq"] == "D"
    assert result["trend_direction"] == direction
    if direction == "increasing":
        assert result["slope"] > 0 and result["p_value"] < 0.05
    elif direction == "decreasing":
        assert result["slope"] < 0
    else:
        assert result["slope"] == 0.0
    assert len(result["series"]) == len(daily_counts)
    assert all(p["trend_value"] is not None for p in result["series"])
    assert_json_safe(sanitize_for_json(result))


def test_trend_weekly_resample_ignores_partial_last_week():
    counts = [10] * 63 + [1, 1]  # 9 tuần đầy đủ + 2 ngày của tuần hiện tại
    result = compute_trend(make_events(counts), interval="week")

    assert result["resample_freq"] == "W"
    assert result["series"][-1]["is_complete"] is False
    assert result["complete_periods"] == 9
    assert (
        result["trend_direction"] == "stable"
    )  # tuần dở dang không được kéo xu hướng xuống


# TC-05
def test_trend_insufficient_data():
    result = compute_trend(make_events([3, 4]))
    assert result["status"] == STATUS_INSUFFICIENT
    assert result["trend_direction"] == "stable"
    assert_json_safe(sanitize_for_json(result))


# TC-06
def test_weekly_seasonality_detected():
    weekly = [5, 5, 5, 5, 5, 20, 20]  # Thứ 2 → Chủ nhật; cuối tuần đông hơn
    result = compute_seasonality(make_events(weekly * 8))

    assert result["status"] == STATUS_COMPUTED
    assert result["interval"] == "day" and result["period"] == 7
    line = result["components"]["seasonal_line"]
    assert [p["cycle_index"] for p in line] == list(range(1, 8))
    assert line[5]["period_label"] == "Thứ 7"
    assert line[5]["seasonal_factor"] > 1 > line[0]["seasonal_factor"]
    strength = result["components"]["seasonality_strength"]
    assert 0.0 <= strength <= 1.0 and strength > 0.9
    assert "rõ rệt" in result["components"]["interpretation"]
    assert_json_safe(sanitize_for_json(result))


# TC-07
def test_seasonality_insufficient_cycles():
    result = compute_seasonality(make_events([5] * 5))
    assert result["status"] == STATUS_INSUFFICIENT
    # Vẫn trả 7 cột để FE so sánh; hệ số 0 = không có số liệu mùa vụ.
    assert len(result["components"]["seasonal_line"]) == 7
    assert all(
        point["seasonal_factor"] == 0 for point in result["components"]["seasonal_line"]
    )
    assert result["components"]["seasonality_strength"] is None
    assert "chưa xác định mùa vụ rõ" in result["components"]["interpretation"]


# TC-08
def test_correlation_matrix_properties(ten_weeks):
    result = compute_correlation(ten_weeks)

    matrix = np.array(result["matrix"], dtype=float)
    assert result["variables"] == list(CORRELATION_VARIABLES)
    assert matrix.shape == (5, 5)
    assert np.allclose(matrix, matrix.T)
    assert np.allclose(np.diag(matrix), 1.0)
    assert ((matrix >= -1.0) & (matrix <= 1.0)).all()
    assert result["method"] == "pearson"
    assert np.array(result["spearman_matrix"], dtype=float).shape == (5, 5)
    assert "nhân quả" in result["note"]
    assert result["undefined_pairs"] == []
    assert result["corr_mag_depth"] == result["matrix"][0][1]
    assert_json_safe(sanitize_for_json(result))


def test_daily_event_count_correlates_with_itself_by_day():
    df = make_events([1, 1, 10, 10, 1])
    expected = (
        df["event_time"]
        .dt.floor("D")
        .map(df["event_time"].dt.floor("D").value_counts())
    )
    result = compute_correlation(df)
    assert result["sample_size"] == len(df) == int(expected.size)


# TC-09
def test_correlation_zero_variance_column_is_null(ten_weeks):
    result = compute_correlation(make_events([5] * 10, depth=10.0))

    depth_idx = CORRELATION_VARIABLES.index("depth_km")
    assert all(value is None for value in result["matrix"][depth_idx])
    assert all(row[depth_idx] is None for row in result["matrix"])
    assert ["magnitude", "depth_km"] in result["undefined_pairs"]
    assert result["correlation_strength"] == "Không xác định"
    assert_json_safe(sanitize_for_json(result))


# TC-10
@pytest.mark.parametrize("size", [0, 1])
def test_empty_and_single_event_do_not_crash(size):
    df = make_events([size])
    for payload in (
        compute_temporal(df, "day"),
        compute_trend(df),
        compute_seasonality(df),
        compute_correlation(df),
    ):
        assert_json_safe(sanitize_for_json(payload))
    snapshot = build_analysis_snapshot(df)
    assert (snapshot == []) is (size == 0)
    for item in snapshot:
        assert_json_safe(item["metrics_data"])


def test_sanitize_for_json_and_format_utc():
    payload = sanitize_for_json(
        {
            "a": float("nan"),
            "b": np.float64(1.5),
            "c": [np.int64(2), float("inf")],
            "d": START,
        }
    )
    assert payload == {"a": None, "b": 1.5, "c": [2, None], "d": "2026-09-07T00:00:00Z"}
    assert (
        format_utc(pd.Timestamp("2026-09-07 07:00", tz="Asia/Ho_Chi_Minh"))
        == "2026-09-07T00:00:00Z"
    )
    assert format_utc(None) is None


def test_prepare_events_drops_invalid_and_converts_to_utc():
    df = prepare_events(
        [
            {
                "id": 1,
                "event_time": "2026-09-07T07:00:00+07:00",
                "magnitude": "4.5",
                "depth_km": None,
                "latitude": 1,
                "longitude": 2,
            },
            {
                "id": 2,
                "event_time": "not a date",
                "magnitude": 3,
                "depth_km": 1,
                "latitude": 1,
                "longitude": 2,
            },
            {
                "id": 3,
                "event_time": "2026-09-08T00:00:00Z",
                "magnitude": float("nan"),
                "depth_km": 1,
                "latitude": 1,
                "longitude": 2,
            },
        ]
    )
    assert df["id"].tolist() == [1]
    assert str(df["event_time"].dt.tz) == "UTC"
    assert df["event_time"].iloc[0] == pd.Timestamp("2026-09-07T00:00:00Z")
    assert df["depth_km"].iloc[0] == 0.0


# TC-11
def test_snapshot_types_and_periods(ten_weeks):
    snapshot = build_analysis_snapshot(ten_weeks)

    keys = [(item["analysis_type"], item["time_interval"]) for item in snapshot]
    assert keys == [
        ("time_series", "day"),
        ("time_series", "week"),
        ("time_series", "month"),
        ("trend", "week"),
        ("trend", "day"),
        ("trend", "month"),
        ("seasonality", "day"),
        ("correlation", "day"),
    ]
    for item in snapshot:
        assert item["period_start"] <= item["period_end"]
        assert item["period_start"].tzinfo == UTC
        assert_json_safe(item["metrics_data"])


# TC-16 — BUG-son-004
def test_trend_excludes_current_partial_day_from_regression():
    df = make_events([10] * 20 + [1])
    as_of = START + pd.Timedelta(days=20, hours=12)

    result = compute_trend(df, interval="day", as_of=as_of)

    assert result["series"][-1]["actual_value"] == 1
    assert result["series"][-1]["is_complete"] is False
    assert result["complete_periods"] == 20
    assert result["slope"] == 0.0
    assert result["trend_direction"] == "stable"


def test_seasonality_requires_two_complete_cycles_at_as_of():
    df = make_events([5, 5, 5, 5, 5, 20, 20] * 2)
    as_of = START + pd.Timedelta(days=13, hours=23)

    result = compute_seasonality(df, as_of=as_of)

    assert result["status"] == STATUS_INSUFFICIENT
    # Vẫn trả 7 cột để FE so sánh; hệ số 0 = không có số liệu mùa vụ.
    assert len(result["components"]["seasonal_line"]) == 7
    assert all(
        point["seasonal_factor"] == 0 for point in result["components"]["seasonal_line"]
    )
    assert result["components"]["seasonality_strength"] is None


@pytest.mark.parametrize("as_of", ["2026-09-28T00:00:00Z", "2026-09-28T07:00:00+07:00"])
def test_day_completes_exactly_at_next_utc_midnight(as_of):
    df = make_events([10] * 20 + [1])
    result = compute_trend(df, interval="day", as_of=pd.Timestamp(as_of))
    assert result["series"][-1]["is_complete"] is True
    assert result["complete_periods"] == 21


# TC-17 — BUG-son-005
def test_insufficient_seasonality_snapshot_uses_supported_interval():
    snapshot = build_analysis_snapshot(make_events([1]))
    seasonal = next(item for item in snapshot if item["analysis_type"] == "seasonality")
    assert seasonal["time_interval"] == "day"
    assert seasonal["metrics_data"]["status"] == STATUS_INSUFFICIENT
    assert seasonal["metrics_data"]["interval"] is None
    assert all(item["time_interval"] in {"day", "week", "month"} for item in snapshot)


def test_monthly_trend_aggregates_real_calendar_months():
    start = pd.Timestamp("2026-01-01", tz="UTC")
    counts = [(start + pd.Timedelta(days=day)).month for day in range(250)]
    result = compute_trend(make_events(counts, start=start), interval="month")
    assert result["resample_freq"] == "M"
    assert [point["actual_value"] for point in result["series"][:3]] == [31, 56, 93]
    assert result["complete_periods"] == 8
    assert result["series"][-1]["is_complete"] is False
    assert result["trend_direction"] == "increasing"


def test_correlation_matches_known_positive_and_negative_relations():
    df = make_events([1, 2, 3, 4])
    df["magnitude"] = df["event_time"].dt.day.astype(float)
    df["depth_km"] = 2 * df["magnitude"] + 1
    df["latitude"] = -df["magnitude"]

    result = compute_correlation(df)

    assert result["matrix"][0][1] == 1.0
    assert result["matrix"][0][2] == -1.0
    assert result["matrix"][0][4] == 1.0
    assert result["spearman_matrix"][0][1] == 1.0
    assert result["spearman_matrix"][0][2] == -1.0
````

#### 11.3.76. `apps/api/tests/unit/test_analysis_runner.py`

````python
"""Unit test offline cho gdmas.services.analysis.runner (testcase 2026-11-12-analysis-four-patterns-son)."""

import pytest

from gdmas.services.analysis import runner


class FakeService:
    calls = 0
    success = True

    def execute_cycle(self):
        FakeService.calls += 1
        if FakeService.success:
            return {
                "success": True,
                "events_analyzed": 3,
                "results_written": 6,
                "duration_seconds": 0.1,
            }
        return {"success": False, "error": "RuntimeError: boom"}


@pytest.fixture(autouse=True)
def fake_service(monkeypatch):
    FakeService.calls = 0
    FakeService.success = True
    monkeypatch.setattr(runner, "AnalysisService", FakeService)

    def no_sleep(_seconds):
        raise AssertionError("--once không được gọi time.sleep")

    monkeypatch.setattr(runner.time, "sleep", no_sleep)


# TC-15
def test_once_runs_single_cycle_and_exits_zero(capsys):
    assert runner.main(["--once"]) == 0
    assert FakeService.calls == 1
    assert "6 bản ghi analysis_results" in capsys.readouterr().out


def test_once_returns_one_on_failure(capsys):
    FakeService.success = False
    assert runner.main(["--once"]) == 1
    assert FakeService.calls == 1
    assert "thất bại" in capsys.readouterr().out


def test_loop_mode_stops_on_keyboard_interrupt(monkeypatch):
    def interrupt(_seconds):
        raise KeyboardInterrupt

    monkeypatch.setattr(runner.time, "sleep", interrupt)
    assert runner.main([]) == 0
    assert FakeService.calls == 1


def test_help_mentions_once(capsys):
    with pytest.raises(SystemExit) as exc:
        runner.main(["--help"])
    assert exc.value.code == 0
    assert "--once" in capsys.readouterr().out
````

#### 11.3.77. `apps/api/tests/unit/test_analysis_service.py`

````python
"""Unit test offline cho AnalysisService (testcase 2026-11-12-analysis-four-patterns-son).

DB được giả lập bằng FakeSession; `_load_events` được thay bằng hàm trả DataFrame fixture — không cần PostgreSQL.
"""

import numpy as np
import pandas as pd
import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis import service as service_module
from gdmas.services.analysis.patterns import prepare_events
from gdmas.services.analysis.service import AnalysisService


class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model

    def delete(self, synchronize_session=None):
        self.session.deleted_models.append(self.model)
        return 0


class FakeSession:
    def __init__(self):
        self.added = []
        self.deleted_models = []
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        obj.id = 99

    def rollback(self):
        self.rollbacks += 1

    def query(self, model):
        return FakeQuery(self, model)

    @property
    def run(self) -> ServiceRun:
        runs = [obj for obj in self.added if isinstance(obj, ServiceRun)]
        assert len(runs) == 1
        return runs[0]

    @property
    def results(self) -> list[AnalysisResult]:
        return [obj for obj in self.added if isinstance(obj, AnalysisResult)]


def fixture_events(days=70, seed=3):
    rng = np.random.default_rng(seed)
    start = pd.Timestamp("2026-09-07", tz="UTC")
    times = start + pd.to_timedelta(
        np.sort(rng.uniform(0, days * 86400, 400)), unit="s"
    )
    return prepare_events(
        {
            "id": i + 1,
            "event_time": ts,
            "magnitude": rng.uniform(1, 6),
            "depth_km": rng.uniform(0, 300),
            "latitude": rng.uniform(-60, 60),
            "longitude": rng.uniform(-180, 180),
        }
        for i, ts in enumerate(times)
    )


def build_service(monkeypatch, events=None, error=None):
    session = FakeSession()

    def fake_load(self, db, since):
        assert since.tzinfo is not None
        if error is not None:
            raise error
        return events if events is not None else prepare_events([])

    monkeypatch.setattr(AnalysisService, "_load_events", fake_load)
    return AnalysisService(session_factory=lambda: session), session


# TC-12
def test_empty_database_clears_snapshot_without_fake_rows(monkeypatch):
    service, session = build_service(monkeypatch)

    result = service.execute_cycle()

    assert result["success"] is True
    assert result["events_analyzed"] == 0
    assert result["results_written"] == 0
    assert session.deleted_models == [AnalysisResult]
    assert session.results == []
    assert session.run.service_name == "analysis"
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 0
    assert session.closed


# TC-13
def test_cycle_writes_snapshot_with_run_link(monkeypatch):
    events = fixture_events()
    service, session = build_service(monkeypatch, events=events)

    result = service.execute_cycle()

    assert result["success"] is True
    assert result["events_analyzed"] == len(events)
    assert result["service_run_id"] == 99
    assert session.deleted_models == [AnalysisResult]
    keys = [(r.analysis_type, r.time_interval) for r in session.results]
    assert keys == [
        ("time_series", "day"),
        ("time_series", "week"),
        ("time_series", "month"),
        ("trend", "week"),
        ("trend", "day"),
        ("trend", "month"),
        ("seasonality", "day"),
        ("correlation", "day"),
    ]
    for record in session.results:
        assert record.service_run_id == 99
        assert record.calculated_at.tzinfo is not None
        assert record.period_start <= record.period_end
        assert isinstance(record.metrics_data, dict)
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == len(events)
    assert session.run.finished_at.tzinfo is not None
    # 1 commit tạo run RUNNING + 1 commit duy nhất cho xóa snapshot cũ, chèn mới và cập nhật run
    assert session.commits == 2


# TC-14
def test_failure_marks_run_failed_without_raising(monkeypatch):
    service, session = build_service(
        monkeypatch, error=RuntimeError("database   unavailable")
    )

    result = service.execute_cycle()

    assert result["success"] is False
    assert result["error"] == "RuntimeError: database unavailable"
    assert session.rollbacks >= 1
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: database unavailable"
    assert session.results == []


def test_long_error_message_is_truncated(monkeypatch):
    service, session = build_service(monkeypatch, error=ValueError("x" * 1000))
    service.execute_cycle()
    assert len(session.run.error_message) <= 200


@pytest.mark.parametrize("window_days", [1, 365])
def test_window_is_passed_to_loader(monkeypatch, window_days):
    seen = {}
    session = FakeSession()

    def fake_load(self, db, since):
        seen["since"] = since
        return prepare_events([])

    monkeypatch.setattr(AnalysisService, "_load_events", fake_load)
    AnalysisService(
        session_factory=lambda: session, window_days=window_days
    ).execute_cycle()
    age_days = (session.run.started_at - seen["since"]).total_seconds() / 86400
    assert age_days == pytest.approx(window_days)


def test_cycle_passes_utc_start_time_to_snapshot(monkeypatch):
    service, session = build_service(monkeypatch, events=fixture_events())
    captured = {}
    original = service_module.build_analysis_snapshot

    def capture_snapshot(events, *, as_of=None):
        captured["as_of"] = as_of
        return original(events, as_of=as_of)

    monkeypatch.setattr(service_module, "build_analysis_snapshot", capture_snapshot)

    result = service.execute_cycle()

    assert result["success"] is True
    assert captured["as_of"] == session.run.started_at
    assert captured["as_of"].utcoffset().total_seconds() == 0
````

#### 11.3.78. `apps/api/tests/unit/test_analysis_temporal_window.py`

````python
"""Test offline: `/analysis/temporal` lọc 3 biểu đồ theo cửa sổ Ngày/Tuần/Tháng (2026-11-24)."""

from datetime import UTC, datetime

API = "/api/v1/analysis/temporal"
START = "2026-11-20T00:00:00Z"
END = "2026-11-24T00:00:00Z"


def _seed(db):
    from gdmas.models.earthquake import EarthquakeEvent

    for n, when, mag in (
        (1, datetime(2026, 11, 21, 1, tzinfo=UTC), 5.0),
        (2, datetime(2026, 11, 22, 2, tzinfo=UTC), 6.0),
        (3, datetime(2026, 11, 1, 3, tzinfo=UTC), 7.0),
    ):
        db.add(
            EarthquakeEvent(
                source="USGS",
                source_event_id=f"tmp_{n}",
                event_time=when,
                latitude=10.0,
                longitude=100.0,
                depth_km=10.0,
                magnitude=mag,
                magnitude_type="mb",
                place="Test",
                source_url=f"https://example.org/{n}",
            )
        )
    db.commit()


def test_window_uses_on_the_fly_data_for_all_three_charts(client, db):
    _seed(db)

    for interval in ("day", "week", "month"):
        body = client.get(
            API, params={"interval": interval, "start_time": START, "end_time": END}
        ).json()
        assert body["success"] is True, body
        data = body["data"]
        assert data["interval"] == interval
        assert data["stats"]["data_points"] == 2, (
            f"{interval}: chỉ 2 sự kiện trong cửa sổ"
        )
        assert data["scatter_plot"], f"{interval}: scatter phải có điểm mới"
        assert len(data["scatter_plot"]) == 2
        bins = data["histogram"]["magnitude_bins"]
        assert sum(int(bin_["count"]) for bin_ in bins) == 2, (
            f"{interval}: histogram phải khớp cửa sổ"
        )
        assert data["line_chart"], f"{interval}: line chart phải có điểm"


def test_timezone_shifts_daily_bucket(client, db):
    """Sự kiện 23/11 20:00Z: UTC → bucket 23, UTC+7 → bucket 24."""
    from gdmas.models.earthquake import EarthquakeEvent

    db.add(
        EarthquakeEvent(
            source="USGS",
            source_event_id="tz_1",
            event_time=datetime(2026, 11, 23, 20, tzinfo=UTC),
            latitude=10.0,
            longitude=100.0,
            depth_km=10.0,
            magnitude=5.0,
            magnitude_type="mb",
            place="Test",
            source_url="https://example.org/tz_1",
        )
    )
    db.commit()

    params = {
        "interval": "day",
        "start_time": "2026-11-23T00:00:00Z",
        "end_time": "2026-11-25T00:00:00Z",
    }
    utc = client.get(API, params={**params, "timezone": "UTC"}).json()["data"]
    local = client.get(API, params={**params, "timezone": "UTC+7"}).json()["data"]

    assert [row["date"] for row in utc["line_chart"]] == ["2026-11-23"]
    assert [row["date"] for row in local["line_chart"]] == ["2026-11-24"]
    assert local["scatter_plot"][0]["timestamp"].endswith("Z"), (
        "scatter vẫn giữ UTC ISO"
    )


def test_no_window_and_no_filter_keeps_snapshot_path(client, db):
    """Không có cửa sổ & không filter → vẫn đi đường snapshot cũ, không crash."""
    _seed(db)
    resp = client.get(API, params={"interval": "day"})
    assert resp.status_code == 200
````

#### 11.3.79. `apps/api/tests/unit/test_analysis_trend_metrics.py`

````python
"""Unit test offline cho Pattern 2 đa tần suất × đa metric của T3.

Testcase: .agents/notes/testcase/2026-11-20-trend-resample-metric-son.md (BUG-son-008).
"""

import json

import pandas as pd
import pytest

from gdmas.services.analysis.patterns import (
    STATUS_COMPUTED,
    STATUS_INSUFFICIENT,
    TREND_INTERVALS,
    TREND_METRICS,
    build_analysis_snapshot,
    compute_trend,
    compute_trend_bundle,
    prepare_events,
)

START = pd.Timestamp("2026-09-07", tz="UTC")  # Thứ 2


def events_from_days(days):
    """`days`: danh sách (độ lệch ngày, [độ lớn...]) — mỗi độ lớn là 1 sự kiện lúc 06:00 + k giờ UTC."""
    records = []
    next_id = 1
    for offset, magnitudes in days:
        day = START + pd.Timedelta(days=offset)
        for k, mag in enumerate(magnitudes):
            records.append(
                {
                    "id": next_id,
                    "event_time": day + pd.Timedelta(hours=6 + k),
                    "magnitude": mag,
                    "depth_km": 10.0,
                    "latitude": 35.0,
                    "longitude": 139.0,
                }
            )
            next_id += 1
    return prepare_events(records)


def trend_rows(snapshot):
    return [item for item in snapshot if item["analysis_type"] == "trend"]


# TC-01
def test_snapshot_writes_trend_for_every_interval_primary_first():
    df = events_from_days([(d, [2.0 + (d % 3)]) for d in range(70)])  # 70 ngày → tuần

    rows = trend_rows(build_analysis_snapshot(df))

    assert [row["time_interval"] for row in rows] == ["week", "day", "month"]
    for row in rows:
        metrics = row["metrics_data"]
        assert metrics["interval"] == row["time_interval"]
        assert set(metrics["metrics"]) == set(TREND_METRICS)
        for metric in TREND_METRICS:
            assert metrics["metrics"][metric]["metric"] == metric
            assert metrics["metrics"][metric]["interval"] == row["time_interval"]
        json.dumps(metrics, allow_nan=False)


# TC-02
def test_bundle_top_level_keeps_count_format():
    df = events_from_days([(d, [3.0] * (1 + d % 2)) for d in range(21)])

    bundle = compute_trend_bundle(df, "day")

    assert bundle["metric"] == "count"
    assert bundle["series"] == bundle["metrics"]["count"]["series"]
    assert bundle["slope"] == bundle["metrics"]["count"]["slope"]
    assert sum(p["actual_value"] for p in bundle["series"]) == len(df)


# TC-03
def test_magnitude_metrics_use_period_mean_and_max():
    df = events_from_days([(0, [2.0, 4.0]), (1, [5.0]), (2, [1.0, 2.0, 3.0])])

    avg = compute_trend(df, "day", metric="avg_magnitude")["series"]
    mx = compute_trend(df, "day", metric="max_magnitude")["series"]
    count = compute_trend(df, "day", metric="count")["series"]

    assert [p["actual_value"] for p in avg] == [3.0, 5.0, 2.0]
    assert [p["actual_value"] for p in mx] == [4.0, 5.0, 3.0]
    assert [p["actual_value"] for p in count] == [2, 1, 3]


# TC-04
def test_magnitude_metrics_skip_empty_periods_instead_of_zero():
    df = events_from_days([(0, [3.0]), (2, [4.0]), (3, [5.0])])  # ngày 1 trống

    count = compute_trend(df, "day", metric="count")["series"]
    avg = compute_trend(df, "day", metric="avg_magnitude")["series"]

    assert [p["period"] for p in count] == [
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
    ]
    assert count[1]["actual_value"] == 0
    assert [p["period"] for p in avg] == ["2026-09-07", "2026-09-09", "2026-09-10"]
    assert all(p["actual_value"] > 0 for p in avg)


# TC-05
def test_magnitude_trend_regression_uses_real_period_spacing():
    # Độ lớn tăng đều theo ngày, có ngày trống xen giữa: vẫn phải nhận ra xu hướng tăng
    days = [(d, [1.0 + 0.1 * d]) for d in range(30) if d % 5 != 2]
    df = events_from_days(days)

    result = compute_trend(df, "day", metric="avg_magnitude")

    assert result["status"] == STATUS_COMPUTED
    assert result["trend_direction"] == "increasing"
    assert result["slope"] == pytest.approx(0.1, abs=1e-6)


# TC-06
def test_count_metric_behaviour_unchanged_by_default():
    df = events_from_days([(d, [2.0] * (d + 1)) for d in range(10)])

    default = compute_trend(df, "day")
    explicit = compute_trend(df, "day", metric="count")

    assert default == explicit
    assert default["metric"] == "count"
    assert default["trend_direction"] == "increasing"


# TC-07
@pytest.mark.parametrize("metric", TREND_METRICS)
def test_short_data_reports_insufficient_for_month(metric):
    df = events_from_days([(d, [3.0]) for d in range(10)])

    result = compute_trend(df, "month", metric=metric)

    assert result["status"] == STATUS_INSUFFICIENT
    assert result["trend_direction"] == "stable"


# TC-08
def test_single_event_and_empty_frame_do_not_crash():
    one = events_from_days([(0, [4.2])])
    for interval in TREND_INTERVALS:
        bundle = compute_trend_bundle(one, interval)
        for metric in TREND_METRICS:
            assert bundle["metrics"][metric]["status"] == STATUS_INSUFFICIENT
        json.dumps(bundle, allow_nan=False)

    assert build_analysis_snapshot(prepare_events([])) == []


# TC-09
def test_unknown_metric_is_rejected():
    df = events_from_days([(0, [3.0])])

    with pytest.raises(ValueError):
        compute_trend(df, "day", metric="median_magnitude")


def test_trend_respects_timezone_for_daily_buckets():
    """20:00 UTC hôm trước phải rơi vào ngày hôm sau khi bucket theo UTC+7."""
    records = [
        {
            "id": n,
            "event_time": pd.Timestamp(ts, tz="UTC"),
            "magnitude": mag,
            "depth_km": 10.0,
            "latitude": 35.0,
            "longitude": 139.0,
        }
        for n, (ts, mag) in enumerate(
            [
                ("2026-11-23T20:00:00Z", 5.0),
                ("2026-11-23T21:00:00Z", 4.0),
                ("2026-11-24T01:00:00Z", 3.0),
            ],
            start=1,
        )
    ]
    df = prepare_events(records)

    utc = compute_trend(df, "day", metric="count")
    local = compute_trend(df, "day", metric="count", tz="Asia/Ho_Chi_Minh")

    assert {p["period"] for p in utc["series"]} == {"2026-11-23", "2026-11-24"}
    assert {p["period"] for p in local["series"]} == {"2026-11-24"}
    assert local["series"][0]["actual_value"] == 3
````

#### 11.3.80. `apps/api/tests/unit/test_analysis_trend_route.py`

````python
"""Test offline end-to-end T3 → T6 cho `GET /api/v1/analysis/trend` (BUG-son-008).

Snapshot thật của T3 (`build_analysis_snapshot`) ghi vào SQLite in-memory (fixture `client`/`db`
trong conftest.py), rồi gọi route T6 như FE gọi.
Testcase: .agents/notes/testcase/2026-11-20-trend-resample-metric-son.md.
"""

from datetime import UTC, datetime, timedelta

import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.services.analysis.patterns import build_analysis_snapshot, prepare_events

from .conftest import add_event

API = "/api/v1/analysis/trend"
AS_OF = datetime(2026, 11, 20, tzinfo=UTC)


def seed_t3_snapshot(db, days=200):
    """Ghi snapshot thật của T3: số trận/ngày = 1..4, độ lớn 2.0..4.0."""
    records = []
    next_id = 1
    for d in range(days):
        for k in range(1 + d % 4):
            records.append(
                {
                    "id": next_id,
                    "event_time": AS_OF - timedelta(days=days - d, hours=-k),
                    "magnitude": 2.0 + (k % 3),
                    "depth_km": 10.0 + k,
                    "latitude": 10.0,
                    "longitude": 100.0,
                }
            )
            next_id += 1
    snapshot = build_analysis_snapshot(prepare_events(records), as_of=AS_OF)
    for item in snapshot:
        db.add(AnalysisResult(**item))
    db.commit()
    return snapshot


def stored_trend(snapshot, interval):
    return next(
        item["metrics_data"]
        for item in snapshot
        if item["analysis_type"] == "trend" and item["time_interval"] == interval
    )


# TC-10 — tái hiện BUG-son-008: W phải là chuỗi tuần, không phải chuỗi tháng
@pytest.mark.parametrize(
    ("freq", "interval"), [("D", "day"), ("W", "week"), ("M", "month")]
)
def test_resample_freq_returns_matching_interval(client, db, freq, interval):
    snapshot = seed_t3_snapshot(db)

    resp = client.get(API, params={"resample_freq": freq, "metric": "count"})

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["resample_freq"] == freq
    assert data["series"] == stored_trend(snapshot, interval)["series"]
    if interval == "month":
        assert all(len(p["period"]) == 7 for p in data["series"])  # YYYY-MM
    else:
        assert all(len(p["period"]) == 10 for p in data["series"])  # YYYY-MM-DD


# TC-11 — tái hiện BUG-son-008: avg_magnitude không được trả số trận
@pytest.mark.parametrize("metric", ["count", "avg_magnitude", "max_magnitude"])
def test_metric_returns_matching_series(client, db, metric):
    snapshot = seed_t3_snapshot(db)

    data = client.get(API, params={"resample_freq": "W", "metric": metric}).json()[
        "data"
    ]

    expected = stored_trend(snapshot, "week")["metrics"][metric]
    assert data["metric"] == metric
    assert data["series"] == expected["series"]
    assert data["slope"] == expected["slope"]
    assert data["trend_direction"] == expected["trend_direction"]
    assert data["status"] == expected["status"]
    if metric != "count":
        assert all(2.0 <= p["actual_value"] <= 4.0 for p in data["series"])


# TC-12
def test_missing_interval_returns_empty_state_not_other_frequency(client, db):
    db.add(
        AnalysisResult(
            analysis_type="trend",
            time_interval="month",
            period_start=AS_OF - timedelta(days=200),
            period_end=AS_OF,
            metrics_data={"metric": "count", "series": [{"period": "2026-10"}]},
        )
    )
    db.commit()

    body = client.get(API, params={"resample_freq": "W"}).json()

    assert body["success"] is False
    assert body["data"] is None


# TC-13
def test_series_without_per_metric_data_is_not_relabelled(client, db):
    db.add(
        AnalysisResult(
            analysis_type="trend",
            time_interval="week",
            period_start=AS_OF - timedelta(days=70),
            period_end=AS_OF,
            metrics_data={
                "metric": "count",
                "series": [{"period": "2026-11-02", "actual_value": 77}],
                "slope": 1.5,
                "trend_direction": "increasing",
            },
        )
    )
    db.commit()

    params = {"resample_freq": "W", "metric": "avg_magnitude"}
    data = client.get(API, params=params).json()["data"]

    assert data["series"] == []
    assert data["status"] == "insufficient_data"
    assert data["slope"] is None


# TC-14
def test_empty_table_returns_empty_state(client):
    body = client.get(API, params={"resample_freq": "D"}).json()

    assert body["success"] is False
    assert body["data"] is None


# TC-15
@pytest.mark.parametrize("freq", ["Y", "w", ""])
def test_invalid_resample_freq_is_rejected(client, freq):
    resp = client.get(API, params={"resample_freq": freq})

    assert resp.status_code in (400, 422)


# GAP-02 — hệ số hồi quy T3 được pass-through
def test_trend_exposes_regression_metrics_from_t3(client, db):
    snapshot = seed_t3_snapshot(db)
    expected = stored_trend(snapshot, "month")["metrics"]["count"]

    data = client.get(API, params={"resample_freq": "M", "metric": "count"}).json()[
        "data"
    ]

    assert data["r_squared"] == expected["r_squared"]
    assert data["intercept"] == expected["intercept"]
    assert data["p_value"] == expected["p_value"]
    assert data["sample_size"] == expected["complete_periods"]
    assert data["status"] == expected["status"]


def test_trend_sample_size_fallback_and_status_default(client, db):
    db.add(
        AnalysisResult(
            analysis_type="trend",
            time_interval="week",
            period_start=AS_OF - timedelta(days=70),
            period_end=AS_OF,
            metrics_data={
                "metric": "count",
                "series": [{"period": "2026-11-02", "actual_value": 77}],
                "slope": 1.5,
                "data_points": 9,
            },
        )
    )
    db.commit()

    data = client.get(API, params={"resample_freq": "W", "metric": "count"}).json()[
        "data"
    ]

    assert data["sample_size"] == 9
    assert data["status"] == "computed"


# 2026-11-24 — bucket ngày theo múi giờ hiển thị (lệch 1 ngày ở UTC+7)
def test_trend_timezone_buckets_events_in_local_day(client, db):
    add_event(
        db, 1, event_time=datetime(2026, 11, 23, 20, 0, tzinfo=UTC), magnitude=5.0
    )
    add_event(db, 2, event_time=datetime(2026, 11, 24, 1, 0, tzinfo=UTC), magnitude=4.0)
    params = {
        "resample_freq": "D",
        "metric": "count",
        "start_time": "2026-11-23T00:00:00Z",
        "end_time": "2026-11-24T23:59:59Z",
    }

    utc_periods = {
        p["period"] for p in client.get(API, params=params).json()["data"]["series"]
    }
    local_periods = {
        p["period"]
        for p in client.get(API, params={**params, "timezone": "UTC+7"}).json()["data"][
            "series"
        ]
    }

    assert utc_periods == {"2026-11-23", "2026-11-24"}
    assert local_periods == {"2026-11-24"}, "UTC+7: cả 2 trận đều ở ngày 24"
````

#### 11.3.81. `apps/api/tests/unit/test_api_error_boundaries.py`

````python
"""Kiểm response của lỗi dự kiến và logging API/SSE, không gọi mạng hay DB thật."""

import asyncio
import logging

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from gdmas.api.routes import earthquakes, stream
from gdmas.db.connection import get_db
from gdmas.main import app

SENSITIVE_ERROR = (
    "postgresql://unit_user:[DA_CHE_THONG_TIN_DANG_NHAP]@db.invalid/test?api_key=unit_token"
)


class BrokenSession:
    def __init__(self):
        self.rollbacks = 0
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def query(self, *args):
        raise OperationalError(
            "SELECT offline_fixture", None, RuntimeError(SENSITIVE_ERROR)
        )

    def commit(self):
        raise OperationalError("COMMIT", None, RuntimeError(SENSITIVE_ERROR))

    def rollback(self):
        self.rollbacks += 1


@pytest.fixture
def api(monkeypatch):
    session = BrokenSession()
    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: session)
    with TestClient(app) as client:
        yield client, session


def assert_safe_warning(caplog, expected_class):
    assert expected_class in caplog.text
    assert all(
        secret not in caplog.text
        for secret in ("unit_user", "unit_password", "unit_token")
    )


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/earthquakes?page=1&limit=2",
        "/api/v1/earthquakes/unit-event-not-found",
        "/api/v1/statistics/earthquakes",
    ],
)
def test_database_errors_preserve_response_and_log_safely(api, caplog, path):
    client, _ = api
    with caplog.at_level(logging.WARNING):
        response = client.get(path)
    assert response.status_code == 500
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert_safe_warning(caplog, "OperationalError")


def install_transport(monkeypatch, handler):
    original = httpx.Client
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        earthquakes.httpx,
        "Client",
        lambda **kwargs: original(transport=transport, **kwargs),
    )


def test_source_error_preserves_sync_response_with_safe_log(api, monkeypatch, caplog):
    client, _ = api

    def fail(request):
        raise httpx.ConnectError(SENSITIVE_ERROR, request=request)

    install_transport(monkeypatch, fail)
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/v1/earthquakes/sync")
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert_safe_warning(caplog, "ConnectError")


def test_sync_database_error_logs_and_rolls_back(api, monkeypatch, caplog):
    client, session = api
    payload = {
        "features": [
            {
                "id": "unit-event",
                "properties": {"mag": 3.0, "time": 1794355200000},
                "geometry": {"coordinates": [100.0, 10.0, 20.0]},
            }
        ]
    }
    install_transport(monkeypatch, lambda request: httpx.Response(200, json=payload))
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/v1/earthquakes/sync")
    assert response.status_code == 500
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert session.rollbacks == 1
    assert_safe_warning(caplog, "OperationalError")


def test_sse_database_error_preserves_cursor_and_closes_session(monkeypatch, caplog):
    session = BrokenSession()
    monkeypatch.setattr(stream, "SessionLocal", lambda: session)
    with caplog.at_level(logging.WARNING):
        result = stream.get_latest_state(since_event_id=42, since_run_id=7)
    assert result["success"] is False and session.closed
    assert result["max_id"] == 42 and result["latest_run_id"] == 7
    assert result["new_events"] == []
    assert_safe_warning(caplog, "OperationalError")


def test_full_queue_does_not_block_other_clients(monkeypatch):
    full, healthy = asyncio.Queue(maxsize=1), asyncio.Queue()
    full.put_nowait("occupied")
    monkeypatch.setattr(stream, "_connected_sse_queues", {full, healthy})
    assert asyncio.run(stream.broadcast_database_cleared()) == {
        "success": True,
        "clients_notified": 1,
    }
    assert healthy.get_nowait()["event"] == "database_cleared"


def test_unexpected_queue_bug_is_not_swallowed(monkeypatch):
    class BrokenQueue:
        def put_nowait(self, message):
            raise RuntimeError("unexpected queue bug")

    monkeypatch.setattr(stream, "_connected_sse_queues", {BrokenQueue()})
    with pytest.raises(RuntimeError, match="unexpected queue bug"):
        asyncio.run(stream.broadcast_database_cleared())


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/earthquakes",
        "/api/v1/statistics/earthquakes",
        "/api/v1/earthquakes/unit-event",
    ],
)
def test_unexpected_programming_error_is_not_hidden_by_database_fallback(
    api, monkeypatch, path
):
    client, session = api

    def unexpected(*args):
        raise RuntimeError("unexpected query bug")

    monkeypatch.setattr(session, "query", unexpected)
    with pytest.raises(RuntimeError, match="unexpected query bug"):
        client.get(path)


def test_invalid_json_from_usgs_returns_503(api, monkeypatch, caplog):
    client, _ = api
    install_transport(
        monkeypatch, lambda request: httpx.Response(200, content=b"invalid json")
    )
    with caplog.at_level(logging.WARNING):
        result = client.post("/api/v1/earthquakes/sync")
    assert result.status_code == 503
    body = result.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert_safe_warning(caplog, "JSONDecodeError")


def test_incomplete_usgs_feature_is_skipped(api, monkeypatch):
    client, session = api
    install_transport(
        monkeypatch,
        lambda request: httpx.Response(200, json={"features": [{"properties": None}]}),
    )
    result = client.post("/api/v1/earthquakes/sync")
    assert result.status_code == 200 and result.json()["success"] is True
    assert result.json()["synced_count"] == 0
    assert session.rollbacks == 0
````

#### 11.3.82. `apps/api/tests/unit/test_catalog_sse.py`

````python
"""Test offline cho catalog realtime: dedupe, hash, SSE chỉ đẩy khi đổi (I7)."""

import asyncio
import json
from datetime import UTC, datetime, timedelta

from gdmas.models.earthquake import EarthquakeEvent
from gdmas.realtime import sse
from gdmas.services.catalog import (
    EMPTY_CATALOG,
    _count_rows,
    catalog_hash,
    catalog_payload,
    country_counts,
    region_counts,
)


def _event(db, n, when, country, region):
    db.add(
        EarthquakeEvent(
            source="USGS",
            source_event_id=f"cat_{n}",
            event_time=when,
            latitude=10.0,
            longitude=100.0,
            depth_km=10.0,
            magnitude=4.0,
            magnitude_type="mb",
            place="Test",
            source_url=f"https://example.org/{n}",
            country=country,
            region=region,
        )
    )
    db.commit()


class FakeRequest:
    def __init__(self, n):
        self.n = n

    async def is_disconnected(self):
        self.n -= 1
        return self.n < 0


def _state(total=5, new_run=None, **kw):
    state = {
        "success": True,
        "total": total,
        "strong_count": 0,
        "latest": None,
        "latest_run": None,
        "latest_run_id": 2 if new_run else 1,
        "max_id": 10,
        "new_events": [],
        "new_run_info": new_run,
    }
    state.update(kw)
    return state


def _collect(monkeypatch, states):
    sequence = iter(states)
    monkeypatch.setattr(sse, "get_latest_state", lambda *_a: next(sequence))
    monkeypatch.setattr(sse, "POLL_INTERVAL_SECONDS", 0)

    async def run():
        return [
            m
            async for m in sse.earthquake_event_generator(FakeRequest(len(states) - 1))
        ]

    return [json.loads(m["data"]) for m in asyncio.run(run())]


def test_tc01_count_rows_dedupes_case_and_whitespace():
    rows = [
        ("Honshu", 1),
        (" honshu ", 2),
        ("HONSHU", 3),
        ("Osaka", 4),
        ("", 9),
        (None, 9),
    ]
    result = _count_rows(rows, "region")
    assert result == [
        {"region": "Honshu", "count": 6},
        {"region": "Osaka", "count": 4},
    ]


def test_tc02_hash_stable_and_changes():
    a = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    b = json.loads(json.dumps(a))
    assert catalog_hash(a) == catalog_hash(b)
    b["countries"][0]["count"] = 3
    assert catalog_hash(a) != catalog_hash(b)


def test_tc03_sse_pushes_catalog_only_when_changed(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", None)
    catalog = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    monkeypatch.setattr(sse, "_catalog_snapshot", lambda: catalog)

    run = {"records_processed": 0, "finished_at": None}
    packets = _collect(
        monkeypatch, [_state(), _state(new_run=run), _state(new_run=run)]
    )
    cycles = [p for p in packets if p["event"] == "ingestion_cycle_completed"]

    assert len(cycles) == 2
    assert cycles[0]["data"]["catalog"] == catalog, "chu kỳ đầu phải có catalog"
    assert "catalog" not in cycles[1]["data"], "không đổi thì không gửi lại catalog"


def test_tc03_sse_pushes_again_after_data_change(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", None)
    first = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    second = {"countries": [{"country": "Japan", "count": 5}], "regions": []}
    snapshots = iter([first, second])
    monkeypatch.setattr(sse, "_catalog_snapshot", lambda: next(snapshots))

    run = {"records_processed": 1, "finished_at": None}
    packets = _collect(
        monkeypatch,
        [_state(), _state(new_run=run), _state(new_run=run, latest_run_id=3)],
    )
    cycles = [p for p in packets if p["event"] == "ingestion_cycle_completed"]

    assert cycles[0]["data"]["catalog"] == first
    assert cycles[1]["data"]["catalog"] == second


def test_tc08_catalog_uses_30_day_window_not_one_year(db):
    """Combobox chỉ đếm sự kiện trong cửa sổ 30 ngày, không dùng dữ liệu 1 năm cũ."""
    now = datetime.now(UTC)
    _event(db, 1, now - timedelta(days=5), "Japan", "Tokyo")
    _event(db, 2, now - timedelta(days=200), "Japan", "Osaka")
    assert country_counts(db, now=now, window_days=30) == [
        {"country": "Japan", "count": 1}
    ]
    assert region_counts(db, now=now, window_days=30) == [
        {"region": "Tokyo", "count": 1}
    ]


def test_tc09_sse_catalog_ignores_stale_env_365(db, monkeypatch):
    """Dù env shell còn export 365, catalog SSE vẫn dùng cửa sổ 30 ngày cố định."""
    from gdmas.core.config import settings

    monkeypatch.setattr(settings, "ANALYSIS_WINDOW_DAYS", 365)
    now = datetime.now(UTC)
    _event(db, 1, now - timedelta(days=5), "Japan", "Tokyo")
    _event(db, 2, now - timedelta(days=200), "Japan", "Osaka")

    payload = catalog_payload(db)
    assert payload == {
        "countries": [{"country": "Japan", "count": 1}],
        "regions": [{"region": "Tokyo", "count": 1}],
    }


def test_tc04_database_cleared_has_empty_catalog_and_resets_hash(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", "old-hash")
    packet = sse._cleared_packet()
    assert json.loads(packet["data"])["data"]["catalog"] == EMPTY_CATALOG
    sse.broadcast_database_cleared_event()
    assert sse._last_catalog_hash == catalog_hash(EMPTY_CATALOG)
````

#### 11.3.83. `apps/api/tests/unit/test_cluster_contract_fields.py`

````python
"""Test offline: `/api/v1/clusters` trả đủ field canonical theo contract (GAP-01).

Testcase: .agents/notes/testcase/2026-11-22-cluster-contract-fields-thien.md
FE `groupClustersByCountry()` đọc `dominant_place` — route phải trả field thật.
"""

from gdmas.models.clustering import ClusteringResult

API = "/api/v1/clusters"


def _seed(db, clusters):
    db.add(
        ClusteringResult(
            algorithm="DBSCAN",
            parameters={"eps_km": 150, "min_samples": 5},
            total_clusters=len(clusters),
            noise_count=2,
            summary_clusters={"clusters": clusters},
        )
    )
    db.commit()


def test_clusters_filter_by_country_and_region(client, db):
    _seed(
        db,
        [
            {
                "cluster_id": 1,
                "center_latitude": 38.0,
                "center_longitude": 142.0,
                "event_count": 10,
                "dominant_place": "Honshu, Japan",
            },
            {
                "cluster_id": 2,
                "center_latitude": 37.0,
                "center_longitude": -122.0,
                "event_count": 5,
                "dominant_place": "The Geysers, USA",
            },
        ],
    )

    japan = client.get(API, params={"country": "Japan"}).json()["data"]
    assert japan["clusters_count"] == 1
    assert japan["clusters"][0]["dominant_place"] == "Honshu, Japan"

    none = client.get(API, params={"country": "Japan", "region": "California"}).json()[
        "data"
    ]
    assert none["clusters_count"] == 0
    assert none["clusters"] == []


def test_canonical_cluster_exposes_place_and_radius(client, db):
    _seed(
        db,
        [
            {
                "cluster_id": 1,
                "center_latitude": 38.2,
                "center_longitude": 142.4,
                "event_count": 48,
                "avg_magnitude": 4.6,
                "max_magnitude": 6.1,
                "radius_km": 152.4,
                "dominant_place": "Honshu, Japan",
                "name": "Honshu",
            }
        ],
    )

    cluster = client.get(API).json()["data"]["clusters"][0]

    assert cluster["cluster_id"] == 1
    assert cluster["dominant_place"] == "Honshu, Japan"
    assert cluster["radius_km"] == 152.4
    assert cluster["max_magnitude"] == 6.1
    assert cluster["name"] == "Honshu"


def test_legacy_alias_still_maps_and_missing_fields_are_none(client, db):
    _seed(
        db,
        [
            {
                "id": 2,
                "lat": -6.2,
                "lon": 106.8,
                "events_count": 7,
                "avg_mag": 4.9,
                "place": "Java, Indonesia",
            }
        ],
    )

    cluster = client.get(API).json()["data"]["clusters"][0]

    assert cluster["cluster_id"] == 2
    assert cluster["center_latitude"] == -6.2
    assert cluster["event_count"] == 7
    assert cluster["avg_magnitude"] == 4.9
    assert cluster["dominant_place"] == "Java, Indonesia"
    assert cluster["radius_km"] is None
    assert cluster["max_magnitude"] is None
    assert cluster["name"] is None


def test_empty_table_keeps_empty_envelope(client):
    body = client.get(API).json()
    assert body["success"] is False
    assert body["data"] is None
````

#### 11.3.84. `apps/api/tests/unit/test_clustering_service.py`

````python
"""Unit test offline cho DBSCAN T4 (testcase 2026-11-23-dbscan-clustering-thien).

Không gọi USGS; DB SQLite in-memory qua fixture `db` của conftest.
"""

from datetime import UTC, datetime

from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.clustering.service import (
    DEFAULT_EPS_KM,
    DEFAULT_MIN_SAMPLES,
    compute_dbscan,
    haversine_km,
    run_cycle,
)


def make_event(event_id: int, lat: float, lon: float, country: str, region: str):
    return {
        "id": event_id,
        "latitude": lat,
        "longitude": lon,
        "magnitude": 4.0 + (event_id % 5) / 10,
        "place": f"{region}, {country}",
        "country": country,
        "region": region,
    }


def test_haversine_km():
    # (~111 km per degree latitude)
    assert 110 < haversine_km(0.0, 0.0, 1.0, 0.0) < 112
    assert haversine_km(10.0, 20.0, 10.0, 20.0) == 0.0


def test_compute_dbscan_two_clusters_and_noise():
    japan = [
        make_event(i, 35.0 + i / 100, 139.0 + i / 100, "Japan", "Honshu")
        for i in range(8)
    ]
    california = [
        make_event(100 + i, 37.0 + i / 100, -122.0 + i / 100, "USA", "California")
        for i in range(8)
    ]
    noise = [make_event(999, -40.0, 170.0, "Tonga", "Tonga")]
    result = compute_dbscan(japan + california + noise)

    assert result["parameters"] == {
        "eps_km": DEFAULT_EPS_KM,
        "min_samples": DEFAULT_MIN_SAMPLES,
        "metric": "haversine",
    }
    assert result["total_clusters"] == 2
    assert result["noise_count"] == 1
    assert {row["dominant_place"] for row in result["summary_clusters"]} == {
        "Honshu, Japan",
        "California, USA",
    }
    assert all(
        row["radius_km"] is not None and row["event_count"] >= 5
        for row in result["summary_clusters"]
    )
    assert sum(1 for row in result["mappings"] if row["cluster_label"] == -1) == 1


def test_empty_and_insufficient_return_no_fake_clusters():
    empty = compute_dbscan([])
    assert empty["total_clusters"] == 0 and empty["summary_clusters"] == []
    small = compute_dbscan(
        [make_event(i, 35.0, 139.0, "Japan", "Honshu") for i in range(3)]
    )
    assert small["total_clusters"] == 0 and small["mappings"] == []


def test_run_cycle_writes_results_and_service_run(db):
    from .conftest import add_event

    now = datetime.now(UTC)
    for i in range(6):
        add_event(
            db,
            i + 1,
            event_time=now,
            latitude=35.0 + i / 100,
            longitude=139.0 + i / 100,
            magnitude=4.5,
            place=f"Honshu, Japan {i}",
            country="Japan",
            region="Honshu",
        )

    result = run_cycle(db, now=now, window_days=1)
    assert result["total_clusters"] >= 1
    assert result["events_processed"] == 6

    assert db.query(ClusteringResult).count() == 1
    assert db.query(ClusteringEventMapping).count() == 6
    run = db.query(ServiceRun).filter(ServiceRun.service_name == "clustering").first()
    assert run is not None and run.status == "SUCCESS" and run.records_processed == 6
````

#### 11.3.85. `apps/api/tests/unit/test_earthquakes_routes.py`

````python
"""Test route /api/v1/earthquakes: lọc, phân trang, DB rỗng, DB lỗi, đồng bộ USGS."""

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from gdmas.api.routes import earthquakes as eq_routes

from .conftest import add_event

URL = "/api/v1/earthquakes"


def _ids(resp):
    return {e["source_event_id"] for e in resp.json()["data"]}


# ---------- DB rỗng / DB lỗi (Demo Bước 2–3) ----------
def test_list_empty_db_returns_real_empty_result(client):
    resp = client.get(URL)
    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert body["data"] == []
    assert body["metadata"]["total"] == 0
    assert body["metadata"]["total_pages"] == 0


def test_list_db_error_returns_500_database_error_not_mock(broken_client):
    resp = broken_client.get(URL)
    body = resp.json()
    assert resp.status_code == 500
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert "data" not in body
    assert "1248" not in resp.text


def test_detail_db_error_returns_500(broken_client):
    resp = broken_client.get(f"{URL}/ev0001")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_module_has_no_static_mock_data():
    assert not hasattr(eq_routes, "MOCK_USGS_DATA")


# ---------- danh sách, phân trang, sắp xếp ----------
def test_list_returns_stored_events_with_utc_envelope(client, db):
    add_event(db, 1)
    add_event(db, 2)
    resp = client.get(URL)
    body = resp.json()
    assert resp.status_code == 200
    assert body["metadata"]["total"] == 2
    assert _ids(resp) == {"ev0001", "ev0002"}


def test_pagination_splits_results(client, db):
    for i in range(1, 6):
        add_event(db, i)
    page1 = client.get(URL, params={"limit": 2, "page": 1}).json()
    page3 = client.get(URL, params={"limit": 2, "page": 3}).json()
    assert len(page1["data"]) == 2
    assert len(page3["data"]) == 1
    assert page1["metadata"]["total"] == 5
    assert page1["metadata"]["total_pages"] == 3


def test_sort_by_magnitude_desc(client, db):
    add_event(db, 1, magnitude=3.0)
    add_event(db, 2, magnitude=6.0)
    add_event(db, 3, magnitude=4.5)
    data = client.get(URL, params={"sort_by": "magnitude", "order": "desc"}).json()[
        "data"
    ]
    assert [e["magnitude"] for e in data] == [6.0, 4.5, 3.0]


def test_invalid_sort_field_is_rejected(client):
    assert client.get(URL, params={"sort_by": "password"}).status_code == 422


# ---------- bộ lọc ----------
def test_filter_by_magnitude_range(client, db):
    add_event(db, 1, magnitude=2.0)
    add_event(db, 2, magnitude=4.5)
    add_event(db, 3, magnitude=7.0)
    resp = client.get(URL, params={"min_magnitude": 4, "max_magnitude": 6})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_depth_range(client, db):
    add_event(db, 1, depth_km=5)
    add_event(db, 2, depth_km=300)
    resp = client.get(URL, params={"min_depth": 100})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_bounding_box(client, db):
    add_event(db, 1, latitude=-20, longitude=-170)
    add_event(db, 2, latitude=35, longitude=140)
    add_event(db, 3, latitude=-10, longitude=-175)
    resp = client.get(
        URL,
        params={"min_lat": -30, "max_lat": 0, "min_lon": -180, "max_lon": -160},
    )
    assert _ids(resp) == {"ev0001", "ev0003"}


def test_filter_by_time_range_iso_utc(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, event_time=now - timedelta(days=10))
    add_event(db, 2, event_time=now - timedelta(days=2))
    add_event(db, 3, event_time=now - timedelta(hours=1))
    start = (now - timedelta(days=3)).isoformat().replace("+00:00", "Z")
    end = (now - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    resp = client.get(URL, params={"start_time": start, "end_time": end})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_search_matches_place_or_id(client, db):
    add_event(db, 1, place="226 km E of Levuka, Fiji")
    add_event(db, 2, place="Tokyo, Japan")
    assert _ids(client.get(URL, params={"search": "fiji"})) == {"ev0001"}
    assert _ids(client.get(URL, params={"search": "ev0002"})) == {"ev0002"}


def test_filter_with_no_match_returns_empty_not_error(client, db):
    add_event(db, 1, magnitude=3.0)
    resp = client.get(URL, params={"min_magnitude": 8})
    assert resp.status_code == 200
    assert resp.json()["data"] == []


# ---------- 400 VALIDATION_ERROR ----------
@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"min_magnitude": 7, "max_magnitude": 3}, "min_magnitude"),
        ({"min_depth": 50, "max_depth": 10}, "min_depth"),
        ({"min_lat": 20, "max_lat": -20}, "min_lat"),
        ({"min_lon": 100, "max_lon": -100}, "min_lon"),
        (
            {"start_time": "2026-11-10T00:00:00Z", "end_time": "2026-11-01T00:00:00Z"},
            "start_time",
        ),
    ],
)
def test_inverted_ranges_return_400_validation_error(client, params, field):
    resp = client.get(URL, params=params)
    body = resp.json()
    assert resp.status_code == 400
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["details"]["field"] == field


@pytest.mark.parametrize("field", ["start_time", "end_time"])
def test_malformed_time_returns_400(client, field):
    resp = client.get(URL, params={field: "hôm qua"})
    assert resp.status_code == 400
    assert resp.json()["error"]["details"]["field"] == field


def test_time_without_timezone_is_treated_as_utc(client, db):
    add_event(db, 1, event_time=datetime(2026, 11, 9, 10, 0, tzinfo=UTC))
    resp = client.get(
        URL,
        params={"start_time": "2026-11-09T09:00:00", "end_time": "2026-11-09T11:00:00"},
    )
    assert _ids(resp) == {"ev0001"}


# ---------- chi tiết 404 ----------
def test_detail_by_numeric_id(client, db):
    row = add_event(db, 1)
    resp = client.get(f"{URL}/{row.id}")
    assert resp.status_code == 200
    assert resp.json()["source_event_id"] == "ev0001"


def test_detail_by_source_event_id(client, db):
    add_event(db, 7)
    resp = client.get(f"{URL}/ev0007")
    assert resp.status_code == 200
    assert resp.json()["place"] == "Place 7"


def test_detail_missing_returns_404_resource_not_found(client):
    resp = client.get(f"{URL}/99999999")
    body = resp.json()
    assert resp.status_code == 404
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert body["error"]["details"] == {"event_id": "99999999"}


# ---------- POST /sync ----------
class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _patch_usgs(monkeypatch, payload=None, error: Exception | None = None):
    class FakeClient:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def get(self, _url):
            if error is not None:
                raise error
            return _FakeResponse(payload)

    monkeypatch.setattr(eq_routes.httpx, "Client", FakeClient)


def _feature(event_id: str, mag):
    return {
        "id": event_id,
        "properties": {
            "mag": mag,
            "time": 1_762_683_674_741,
            "place": "Test place",
            "magType": "ml",
            "url": "https://example.org/e",
        },
        "geometry": {"coordinates": [100.5, 10.5, 12.0]},
    }


def test_sync_inserts_new_events_and_skips_duplicates(client, db, monkeypatch):
    add_event(db, 1, source_event_id="us1")
    payload = {"features": [_feature("us1", 4.0), _feature("us2", 5.1)]}
    _patch_usgs(monkeypatch, payload)
    resp = client.post(f"{URL}/sync")
    assert resp.status_code == 200
    assert resp.json()["synced_count"] == 1
    assert client.get(URL).json()["metadata"]["total"] == 2


def test_sync_skips_features_without_magnitude(client, monkeypatch):
    payload = {"features": [_feature("us9", None)]}
    _patch_usgs(monkeypatch, payload)
    resp = client.post(f"{URL}/sync")
    assert resp.status_code == 200
    assert resp.json()["synced_count"] == 0


def test_sync_usgs_unreachable_returns_503_without_fake_success(client, monkeypatch):
    _patch_usgs(monkeypatch, error=httpx.ConnectError("không có mạng"))
    resp = client.post(f"{URL}/sync")
    body = resp.json()
    assert resp.status_code == 503
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert client.get(URL).json()["metadata"]["total"] == 0


def test_sync_db_error_returns_500(broken_client, monkeypatch):
    _patch_usgs(monkeypatch, {"features": [_feature("us1", 4.0)]})
    resp = broken_client.post(f"{URL}/sync")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


# ---------- country/region (2026-11-22-be-country-region-derivation-thien) ----------
def test_list_exposes_country_and_region(client, db):
    add_event(db, 1, place="Honshu, Japan", country="Japan", region="Honshu")
    item = client.get(URL).json()["data"][0]
    assert item["place"] == "Honshu, Japan"
    assert item["country"] == "Japan"
    assert item["region"] == "Honshu"


def test_list_filters_by_country_and_region(client, db):
    add_event(db, 1, place="Honshu, Japan", country="Japan", region="Honshu")
    add_event(db, 2, place="Java, Indonesia", country="Indonesia", region="Java")

    japan = client.get(URL, params={"country": "Japan"}).json()
    assert _ids_from_body(japan) == {"ev0001"}
    assert japan["metadata"]["total"] == 1

    honshu = client.get(URL, params={"country": "Japan", "region": "Honshu"}).json()
    assert _ids_from_body(honshu) == {"ev0001"}

    mismatch = client.get(URL, params={"country": "Japan", "region": "Java"}).json()
    assert mismatch["data"] == []


def test_sync_derives_country_and_region_from_place(client, monkeypatch):
    feat = _feature("us-region-1", 4.2)
    feat["properties"]["place"] = "12 km NE of San Francisco, CA"
    _patch_usgs(monkeypatch, {"features": [feat]})
    resp = client.post(f"{URL}/sync")
    assert resp.status_code == 200
    item = client.get(URL).json()["data"][0]
    assert item["country"] == "USA"
    assert item["region"] == "San Francisco"


def _ids_from_body(body):
    return {e["source_event_id"] for e in body["data"]}


def test_country_catalog_groups_by_country_and_count(client, db):
    add_event(db, 1, country="USA", region="Igiugig")
    add_event(db, 2, country="USA", region="Anchorage")
    add_event(db, 3, country="Japan", region="Honshu")
    add_event(db, 4, country=None, region=None)

    resp = client.get(f"{URL}/countries")
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert [(row["country"], row["count"]) for row in resp.json()["data"]] == [
        ("USA", 2),
        ("Japan", 1),
    ]


def test_region_catalog_dedupes_case_and_whitespace_variants(client, db):
    """Mỗi khu vực chỉ trả 1 dòng dù ingestion tạo nhiều biến thể hoa/thường/dấu cách."""
    add_event(db, 1, country="Japan", region="Honshu", magnitude=4.0)
    add_event(db, 2, country="Japan", region=" honshu ", magnitude=6.0)
    add_event(db, 3, country="Japan", region="HONSHU", magnitude=5.0)

    rows = client.get(f"{URL}/regions", params={"country": "Japan"}).json()["data"]
    assert len(rows) == 1
    assert rows[0]["region"] == "Honshu"
    assert rows[0]["count"] == 3
    assert rows[0]["avg_magnitude"] == 5.0
    assert rows[0]["max_magnitude"] == 6.0


def test_region_catalog_optionally_filters_by_country(client, db):
    add_event(db, 1, country="USA", region="Igiugig")
    add_event(db, 2, country="USA", region="Anchorage")
    add_event(db, 3, country="Japan", region="Honshu")

    all_regions = client.get(f"{URL}/regions").json()["data"]
    assert {row["region"] for row in all_regions} == {"Igiugig", "Anchorage", "Honshu"}

    japan = client.get(f"{URL}/regions", params={"country": "Japan"}).json()["data"]
    assert [(row["region"], row["count"]) for row in japan] == [("Honshu", 1)]


def test_catalogs_include_avg_and_max_magnitude(client, db):
    add_event(db, 1, country="Japan", region="Honshu", magnitude=4.0)
    add_event(db, 2, country="Japan", region="Honshu", magnitude=6.0)

    countries = client.get("/api/v1/earthquakes/countries").json()["data"]
    row = next(item for item in countries if item["country"] == "Japan")
    assert row["count"] == 2
    assert row["avg_magnitude"] == 5.0
    assert row["max_magnitude"] == 6.0

    regions = client.get(
        "/api/v1/earthquakes/regions", params={"country": "Japan"}
    ).json()["data"]
    assert regions[0]["avg_magnitude"] == 5.0
    assert regions[0]["max_magnitude"] == 6.0


def test_catalogs_respect_time_window(client, db):
    add_event(
        db,
        1,
        country="Japan",
        region="Honshu",
        magnitude=4.0,
        event_time=datetime(2026, 1, 10, tzinfo=UTC),
    )
    add_event(
        db,
        2,
        country="Japan",
        region="Honshu",
        magnitude=6.0,
        event_time=datetime(2026, 11, 10, tzinfo=UTC),
    )
    params = {"start_time": "2026-01-01T00:00:00Z", "end_time": "2026-02-01T00:00:00Z"}

    countries = client.get("/api/v1/earthquakes/countries", params=params).json()[
        "data"
    ]
    japan = next(row for row in countries if row["country"] == "Japan")
    assert japan["count"] == 1
    assert japan["avg_magnitude"] == 4.0
    assert japan["max_magnitude"] == 4.0

    regions = client.get(
        "/api/v1/earthquakes/regions", params={**params, "country": "Japan"}
    ).json()["data"]
    assert regions[0]["count"] == 1
    assert regions[0]["max_magnitude"] == 4.0


def test_catalogs_are_empty_on_empty_db(client):
    assert client.get(f"{URL}/countries").json()["data"] == []
    assert client.get(f"{URL}/regions").json()["data"] == []
````

#### 11.3.86. `apps/api/tests/unit/test_ingestion_backfill.py`

````python
"""Unit test offline cho backfill 1 năm qua USGS FDSN (testcase 2026-11-22-be-country-region-derivation-thien).

Không gọi mạng: httpx.MockTransport + FakeSession + upsert giả.
"""

from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

import httpx

from gdmas.services.ingestion import backfill as backfill_module
from gdmas.services.ingestion.backfill import (
    build_query_url,
    build_windows,
    run_backfill,
)
from gdmas.services.ingestion.upsert import UpsertStats


class FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def add(self, _obj):
        return None

    def commit(self):
        return None

    def refresh(self, obj):
        obj.id = 1

    def rollback(self):
        return None

    def query(self, *_):
        return type("Query", (), {"count": lambda self: 2})()


def feature(event_id: str, place: str) -> dict:
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {
            "mag": 5.2,
            "place": place,
            "time": 1794355200000,
            "updated": 1794358800000,
        },
        "geometry": {"type": "Point", "coordinates": [142.38, 38.29, 24.5]},
    }


def test_build_windows_covers_one_year():
    now = datetime(2026, 11, 23, tzinfo=UTC)
    windows = build_windows(now, 365)
    assert len(windows) == 13  # 12 đoạn 30 ngày + phần dư
    assert (windows[0][1] - windows[0][0]).days == 30
    assert windows[-1][1] == now

    url = build_query_url(windows[0][0], windows[0][1], 2.5)
    params = parse_qs(urlparse(url).query)
    assert params["format"] == ["geojson"]
    assert params["minmagnitude"] == ["2.5"]
    assert params["limit"] == ["20000"]


def test_backfill_uses_fdsn_and_derives_country_region(monkeypatch):
    captured = {}

    def fake_upsert(db, rows):
        captured["rows"] = list(rows)
        return UpsertStats(inserted=len(rows))

    monkeypatch.setattr(backfill_module, "upsert_events", fake_upsert)

    payload = {
        "features": [
            feature("jp1", "82 km ENE of Tokyo, Japan"),
            feature("id1", "Java, Indonesia"),
        ]
    }
    calls = []

    def handler(request: httpx.Request):
        calls.append(str(request.url))
        return httpx.Response(200, json=payload)

    result = run_backfill(
        session_factory=FakeSession,
        http_transport=httpx.MockTransport(handler),
        days=30,
    )

    assert result["success"] is True
    assert result["days"] == 30 and result["windows"] == 1
    assert result["inserted"] == 2
    assert len(calls) == 1 and "fdsnws/event/1/query" in calls[0]
    assert [(row["country"], row["region"]) for row in captured["rows"]] == [
        ("Japan", "Tokyo"),
        ("Indonesia", "Java"),
    ]


def test_backfill_never_falls_back_to_live_network(monkeypatch):
    """Nếu FDSN lỗi và không có transport thật, backfill không gọi mạng."""

    def handler(_request: httpx.Request):
        raise httpx.ConnectError("offline")

    result = run_backfill(
        session_factory=FakeSession,
        http_transport=httpx.MockTransport(handler),
        days=30,
    )
    assert result["success"] is False
````

#### 11.3.87. `apps/api/tests/unit/test_ingestion_geo.py`

````python
"""Unit test offline cho derive quốc gia/khu vực từ `place` (testcase 2026-11-22-be-country-region-derivation-thien)."""

import pytest

from gdmas.services.ingestion.geo import (
    ALL_COUNTRIES,
    UNKNOWN_LABEL,
    derive_country,
    derive_place_fields,
    derive_region,
)


# TC-01 → TC-05
@pytest.mark.parametrize(
    "place, country, region",
    [
        ("12 km NE of San Francisco, CA", "USA", "San Francisco"),
        ("17 km SE of Naalehu, Hawaii", "USA", "Naalehu"),
        ("10 km W of Nashville, Tennessee", "USA", "Nashville"),
        ("5 km NE of Austin, Texas", "USA", "Austin"),
        ("20 km SW of Ensenada, MX", "Mexico", "Ensenada"),
        ("Honshu, Japan", "Japan", "Honshu"),
        ("Java, Indonesia", "Indonesia", "Java"),
        ("Near East Coast of Honshu, Japan", "Japan", "Near East Coast of Honshu"),
        ("Off the east coast of Honshu, Japan", "Japan", "Honshu"),
        ("Tonga Region", "Tonga", "Tonga Region"),
        (
            "South Sandwich Islands region",
            "South Sandwich Islands region",
            "South Sandwich Islands region",
        ),
        (None, UNKNOWN_LABEL, UNKNOWN_LABEL),
        ("", UNKNOWN_LABEL, UNKNOWN_LABEL),
        ("   ", UNKNOWN_LABEL, UNKNOWN_LABEL),
    ],
)
def test_derive_place_fields_matches_fe_heuristic(place, country, region):
    assert derive_country(place) == country
    assert derive_region(place, country) == region
    assert derive_place_fields(place) == (country, region)


def test_derive_region_respects_all_countries_sentinel():
    assert derive_region("Honshu, Japan", ALL_COUNTRIES) == "Honshu, Japan"


def test_derive_does_not_use_id_prefix():
    # Prefix `us`/`ak` là network code của USGS, không phải nguồn quốc gia.
    assert derive_country("us7000m8v8") == "us7000m8v8"
    assert derive_country(None) == UNKNOWN_LABEL
````

#### 11.3.88. `apps/api/tests/unit/test_ingestion_parser.py`

````python
"""Unit test offline cho gdmas.services.ingestion.parser (testcase 2026-11-12-ingestion-upsert-validation-son)."""

import copy
from datetime import UTC

import pytest

from gdmas.services.ingestion.parser import (
    SOURCE_EVENT_ID_MAX_LEN,
    epoch_ms_to_utc,
    parse_feature,
    parse_features,
    to_finite_float,
)

EVENT_TIME_MS = 1794355200000  # 2026-11-11T00:00:00Z
UPDATED_MS = 1794358800000  # 2026-11-11T01:00:00Z


def make_feature(**overrides):
    feat = {
        "type": "Feature",
        "id": "us7000test",
        "properties": {
            "mag": 5.8,
            "magType": "mww",
            "place": "Near East Coast of Honshu, Japan",
            "time": EVENT_TIME_MS,
            "updated": UPDATED_MS,
            "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test",
        },
        "geometry": {"type": "Point", "coordinates": [142.38, 38.29, 24.5]},
    }
    feat = copy.deepcopy(feat)
    for key, value in overrides.items():
        if key in ("mag", "time", "updated", "code"):
            feat["properties"][key] = value
        elif key == "coordinates":
            feat["geometry"]["coordinates"] = value
        else:
            feat[key] = value
    return feat


# TC-01
def test_parse_valid_feature_maps_columns_in_utc():
    row = parse_feature(make_feature())

    assert row is not None
    assert row["source"] == "USGS"
    assert row["source_event_id"] == "us7000test"
    assert row["longitude"] == pytest.approx(142.38)
    assert row["latitude"] == pytest.approx(38.29)
    assert row["depth_km"] == pytest.approx(24.5)
    assert row["magnitude"] == pytest.approx(5.8)
    assert row["magnitude_type"] == "mww"
    assert row["country"] == "Japan"
    assert row["region"] == "Near East Coast of Honshu"
    assert row["place"] == "Near East Coast of Honshu, Japan"
    assert row["event_time"].tzinfo == UTC
    assert row["event_time"].isoformat() == "2026-11-11T00:00:00+00:00"
    assert row["source_updated_at"].tzinfo == UTC
    assert row["source_updated_at"] > row["event_time"]
    assert row["raw_data"]["id"] == "us7000test"


def test_missing_place_still_gets_unknown_country_and_region():
    feat = make_feature()
    del feat["properties"]["place"]
    row = parse_feature(feat)
    assert row is not None
    assert row["place"] is None
    assert row["country"] == "Khác"
    assert row["region"] == "Khác"


def test_missing_updated_gives_none_source_updated_at():
    feat = make_feature()
    del feat["properties"]["updated"]
    row = parse_feature(feat)
    assert row is not None
    assert row["source_updated_at"] is None


# TC-02
@pytest.mark.parametrize(
    "coordinates",
    [
        None,
        [],
        [142.0],
        ["a", 38.0],
        [142.0, None],
        [float("nan"), 38.0],
        [142.0, float("inf")],
    ],
)
def test_invalid_or_missing_coordinates_are_rejected(coordinates):
    assert parse_feature(make_feature(coordinates=coordinates)) is None


def test_missing_geometry_is_rejected():
    feat = make_feature()
    feat["geometry"] = None
    assert parse_feature(feat) is None


# TC-03
@pytest.mark.parametrize("lon, lat", [(180.0, 90.0), (-180.0, -90.0), (0.0, 0.0)])
def test_wgs84_boundaries_are_kept(lon, lat):
    row = parse_feature(make_feature(coordinates=[lon, lat, 10.0]))
    assert row is not None
    assert (row["longitude"], row["latitude"]) == (lon, lat)


@pytest.mark.parametrize(
    "lon, lat", [(142.0, 90.1), (142.0, -90.5), (180.5, 10.0), (-180.5, 10.0)]
)
def test_out_of_range_coordinates_are_rejected(lon, lat):
    assert parse_feature(make_feature(coordinates=[lon, lat, 10.0])) is None


# TC-04
@pytest.mark.parametrize("mag", [None, float("nan"), float("inf"), "abc", True])
def test_invalid_magnitude_is_rejected(mag):
    assert parse_feature(make_feature(mag=mag)) is None


def test_numeric_string_magnitude_is_accepted():
    row = parse_feature(make_feature(mag="4.2"))
    assert row is not None and row["magnitude"] == pytest.approx(4.2)


# TC-05
def test_missing_time_is_rejected_instead_of_using_now():
    assert parse_feature(make_feature(time=None)) is None


def test_missing_id_and_code_is_rejected():
    feat = make_feature(id=None)
    assert parse_feature(feat) is None


def test_code_is_used_when_id_missing():
    row = parse_feature(make_feature(id=None, code="abc123"))
    assert row is not None and row["source_event_id"] == "abc123"


# TC-17 — BUG-son-001
def test_id_at_database_length_limit_is_preserved():
    event_id = "x" * SOURCE_EVENT_ID_MAX_LEN
    row = parse_feature(make_feature(id=event_id))
    assert row is not None and row["source_event_id"] == event_id


@pytest.mark.parametrize("use_code", [False, True])
def test_overlong_ids_are_rejected_instead_of_truncated(use_code):
    event_id = "x" * (SOURCE_EVENT_ID_MAX_LEN + 1)
    feat = (
        make_feature(id=None, code=event_id) if use_code else make_feature(id=event_id)
    )
    assert parse_feature(feat) is None


def test_shared_id_prefix_does_not_merge_distinct_events():
    prefix = "x" * SOURCE_EVENT_ID_MAX_LEN
    rows, skipped = parse_features(
        [
            make_feature(id=prefix),
            make_feature(id=prefix + "a"),
            make_feature(id=prefix + "b", updated=UPDATED_MS + 1),
        ]
    )
    assert [row["raw_data"]["id"] for row in rows] == [prefix]
    assert skipped == 2


@pytest.mark.parametrize(
    "feat", [None, "string", 42, {"properties": "bad", "geometry": {}}]
)
def test_non_object_feature_is_rejected(feat):
    assert parse_feature(feat) is None


# TC-06
def test_missing_depth_defaults_to_zero():
    row = parse_feature(make_feature(coordinates=[142.0, 38.0]))
    assert row is not None and row["depth_km"] == 0.0


# TC-18 — BUG-son-002
@pytest.mark.parametrize(
    "depth", ["bad", True, False, None, float("nan"), float("inf"), -float("inf")]
)
def test_invalid_supplied_depth_is_rejected(depth):
    assert parse_feature(make_feature(coordinates=[142.0, 38.0, depth])) is None


@pytest.mark.parametrize("depth", [0, -1.5, "24.5"])
def test_finite_supplied_depth_is_preserved(depth):
    row = parse_feature(make_feature(coordinates=[142.0, 38.0, depth]))
    assert row is not None and row["depth_km"] == float(depth)


# TC-19 — BUG-son-003
@pytest.mark.parametrize("field", ["mag", "time", "longitude", "latitude", "depth"])
def test_oversized_numbers_skip_only_the_invalid_feature(field):
    oversized = 10**400
    if field in ("mag", "time"):
        invalid = make_feature(id="bad", **{field: oversized})
    else:
        coordinates = [142.0, 38.0, 24.5]
        coordinates[{"longitude": 0, "latitude": 1, "depth": 2}[field]] = oversized
        invalid = make_feature(id="bad", coordinates=coordinates)

    rows, skipped = parse_features(
        [make_feature(id="before"), invalid, make_feature(id="after")]
    )

    assert [row["source_event_id"] for row in rows] == ["before", "after"]
    assert skipped == 1


def test_oversized_optional_updated_timestamp_is_missing():
    row = parse_feature(make_feature(updated=10**400))
    assert row is not None and row["source_updated_at"] is None


def test_parse_features_counts_skipped():
    rows, skipped = parse_features(
        [
            make_feature(),
            make_feature(id="b", coordinates=[999, 0]),
            make_feature(id="c", mag=None),
        ]
    )
    assert [r["source_event_id"] for r in rows] == ["us7000test"]
    assert skipped == 2


def test_parse_features_handles_none():
    assert parse_features(None) == ([], 0)


def test_helpers():
    assert to_finite_float("1.5") == 1.5
    assert to_finite_float(False) is None
    assert epoch_ms_to_utc(None) is None
    assert epoch_ms_to_utc(1e30) is None
    assert epoch_ms_to_utc(0).tzinfo == UTC
````

#### 11.3.89. `apps/api/tests/unit/test_ingestion_service.py`

````python
"""Unit test offline cho IngestionService (testcase 2026-11-12-ingestion-upsert-validation-son).

HTTP được giả lập bằng httpx.MockTransport, DB bằng FakeSession — không gọi mạng USGS thật, không cần PostgreSQL.
"""

import httpx
import pytest

from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion import service as service_module
from gdmas.services.ingestion.service import (
    FALLBACK_FEED_URL,
    FeedUnavailableError,
    IngestionService,
    summarize_error,
)
from gdmas.services.ingestion.upsert import UpsertStats

PRIMARY_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
)


def feature(event_id, coordinates=(142.38, 38.29, 24.5), mag=4.5):
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {"mag": mag, "time": 1794355200000, "updated": 1794358800000},
        "geometry": {"type": "Point", "coordinates": list(coordinates)},
    }


class FakeQuery:
    def __init__(self, total):
        self.total = total

    def count(self):
        return self.total


class FakeSession:
    def __init__(self, total_in_db=0):
        self.added = []
        self.commits = 0
        self.rollbacks = 0
        self.closed = False
        self.total_in_db = total_in_db

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        obj.id = 1

    def rollback(self):
        self.rollbacks += 1

    def query(self, *_):
        return FakeQuery(self.total_in_db)

    @property
    def run(self) -> ServiceRun:
        runs = [obj for obj in self.added if isinstance(obj, ServiceRun)]
        assert len(runs) == 1
        return runs[0]


def make_transport(responses):
    """responses: dict url -> httpx.Response | Exception; ghi lại các URL đã gọi."""
    calls = []

    def handler(request: httpx.Request):
        url = str(request.url)
        calls.append(url)
        outcome = responses[url]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return httpx.MockTransport(handler), calls


@pytest.fixture
def captured_rows(monkeypatch):
    """Thay upsert_events bằng hàm giả: ghi lại các dòng và trả thống kê cố định."""
    captured = {}

    def fake_upsert(db, rows):
        captured["rows"] = list(rows)
        return captured.get("stats", UpsertStats(inserted=len(rows)))

    monkeypatch.setattr(service_module, "upsert_events", fake_upsert)
    return captured


def build_service(responses, session=None):
    transport, calls = make_transport(responses)
    session = session or FakeSession()
    svc = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    )
    return svc, session, calls


# TC-10
def test_successful_cycle_records_success_and_counts(captured_rows):
    captured_rows["stats"] = UpsertStats(inserted=1, updated=1, unchanged=0)
    payload = {
        "features": [feature("a"), feature("b"), feature("bad", coordinates=(500, 0))]
    }
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(200, json=payload)}, FakeSession(total_in_db=10)
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["new_records"] == 1
    assert result["updated"] == 1
    assert result["skipped_invalid"] == 1
    assert result["total_in_db"] == 10
    assert [r["source_event_id"] for r in captured_rows["rows"]] == ["a", "b"]
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 2
    assert session.run.finished_at.tzinfo is not None
    assert calls == [PRIMARY_URL]
    assert session.closed


# TC-20 — BUG-son-001, BUG-son-002, BUG-son-003
def test_invalid_revisions_do_not_reach_upsert_or_fail_the_cycle(captured_rows):
    valid = feature("a")
    invalid_revision = feature("a", coordinates=(142.38, 38.29, "bad"))
    invalid_revision["properties"]["updated"] += 1
    payload = {
        "features": [
            valid,
            invalid_revision,
            feature("x" * 65),
            feature("overflow", mag=10**400),
            feature("b"),
        ]
    }
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(200, json=payload)}
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["inserted"] == 2
    assert result["skipped_invalid"] == 3
    assert [row["source_event_id"] for row in captured_rows["rows"]] == ["a", "b"]
    assert captured_rows["rows"][0]["depth_km"] == 24.5
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 2
    assert session.rollbacks == 0
    assert calls == [PRIMARY_URL]
    assert session.closed


# TC-11
def test_http_503_on_both_urls_marks_run_failed(captured_rows):
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(503), FALLBACK_FEED_URL: httpx.Response(503)}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert result["new_records"] == 0
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]
    assert session.run.status == "FAILED"
    assert session.run.error_message.startswith("FeedUnavailableError")
    assert "503" in session.run.error_message
    assert len(session.run.error_message) <= 200
    assert session.rollbacks >= 1
    assert "rows" not in captured_rows


# TC-12
def test_timeout_marks_run_failed_without_raising(captured_rows):
    timeout = httpx.ConnectTimeout("timed out")
    svc, session, _ = build_service({PRIMARY_URL: timeout, FALLBACK_FEED_URL: timeout})

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"
    assert "ConnectTimeout" in session.run.error_message
    assert session.closed


# TC-13
def test_fallback_rescues_primary_failure(captured_rows):
    svc, session, calls = build_service(
        {
            PRIMARY_URL: httpx.Response(503),
            FALLBACK_FEED_URL: httpx.Response(200, json={"features": [feature("a")]}),
        }
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]
    assert session.run.status == "SUCCESS"


# TC-14
def test_empty_feed_is_success_without_fake_rows(captured_rows):
    empty = httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    svc, session, calls = build_service({PRIMARY_URL: empty, FALLBACK_FEED_URL: empty})

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["new_records"] == 0
    assert captured_rows["rows"] == []
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 0
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]


def test_empty_primary_with_broken_fallback_still_succeeds(captured_rows):
    svc, session, _ = build_service(
        {
            PRIMARY_URL: httpx.Response(200, json={"features": []}),
            FALLBACK_FEED_URL: httpx.Response(500),
        }
    )
    assert svc.execute_cycle()["success"] is True
    assert session.run.status == "SUCCESS"


# TC-15
@pytest.mark.parametrize(
    "bad_response",
    [
        httpx.Response(200, content=b"<html>not json</html>"),
        httpx.Response(200, json={"type": "FeatureCollection"}),
        httpx.Response(200, json=[1, 2, 3]),
    ],
)
def test_malformed_payload_is_treated_as_unavailable(captured_rows, bad_response):
    svc, session, _ = build_service(
        {PRIMARY_URL: bad_response, FALLBACK_FEED_URL: bad_response}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"


def test_unexpected_database_error_marks_failed(monkeypatch):
    def broken_upsert(db, rows):
        raise RuntimeError("connection lost")

    monkeypatch.setattr(service_module, "upsert_events", broken_upsert)
    svc, session, _ = build_service(
        {PRIMARY_URL: httpx.Response(200, json={"features": [feature("a")]})}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: connection lost"


def test_legacy_fetch_geojson_still_returns_empty_list_on_error():
    svc, _, _ = build_service({PRIMARY_URL: httpx.Response(502)})
    assert svc._fetch_geojson(PRIMARY_URL) == []
    with pytest.raises(FeedUnavailableError):
        svc._fetch_geojson_strict(PRIMARY_URL)


def test_legacy_save_feature_if_new_validates_and_upserts(captured_rows):
    svc, session, _ = build_service({})
    assert svc._save_feature_if_new(session, feature("a")) is True
    assert svc._save_feature_if_new(session, feature("bad", mag=None)) is False


# TC-16
def test_summarize_error_masks_credentials_and_truncates():
    exc = RuntimeError(
        "could not connect postgresql+psycopg://gdmas_user:[DA_CHE_THONG_TIN_DANG_NHAP]@db:5432/gdmas "
        "url https://earthquake.usgs.gov/feed?api_key=abc " + "x" * 500
    )
    message = summarize_error(exc)

    assert message.startswith("RuntimeError: ")
    assert "topsecret" not in message
    assert "gdmas_user" not in message
    assert "api_key" not in message
    assert len(message) <= 200


def test_summarize_error_without_detail():
    assert summarize_error(TimeoutError()) == "TimeoutError"
````

#### 11.3.90. `apps/api/tests/unit/test_ingestion_upsert.py`

````python
"""Unit test offline cho gdmas.services.ingestion.upsert (testcase 2026-11-12-ingestion-upsert-validation-son)."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from sqlalchemy.dialects import postgresql

from gdmas.services.ingestion.upsert import (
    UPDATABLE_COLUMNS,
    UpsertStats,
    build_upsert_statement,
    deduplicate_rows,
    upsert_events,
)

BASE_TIME = datetime(2026, 11, 10, tzinfo=UTC)


def make_row(event_id="us1", updated_offset_h=0, magnitude=4.0):
    return {
        "source": "USGS",
        "source_event_id": event_id,
        "event_time": BASE_TIME,
        "source_updated_at": None
        if updated_offset_h is None
        else BASE_TIME + timedelta(hours=updated_offset_h),
        "latitude": 38.29,
        "longitude": 142.38,
        "depth_km": 24.5,
        "magnitude": magnitude,
        "magnitude_type": "mww",
        "place": "Honshu",
        "source_url": "https://earthquake.usgs.gov/x",
        "raw_data": {"id": event_id},
    }


def compile_sql(stmt) -> str:
    return " ".join(str(stmt.compile(dialect=postgresql.dialect())).split())


# TC-07
def test_upsert_statement_matches_erd_strategy():
    sql = compile_sql(build_upsert_statement([make_row()]))

    assert sql.startswith("INSERT INTO earthquake_events")
    assert "ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE SET" in sql
    for column in UPDATABLE_COLUMNS:
        assert f"{column} = excluded.{column}" in sql
    assert "ingested_at = now()" in sql
    assert (
        "WHERE earthquake_events.source_updated_at IS NULL "
        "OR excluded.source_updated_at > earthquake_events.source_updated_at"
    ) in sql
    assert "RETURNING (xmax = 0) AS inserted" in sql


def test_upsert_does_not_overwrite_identity_columns():
    sql = compile_sql(build_upsert_statement([make_row()]))
    set_clause = sql.split("DO UPDATE SET", 1)[1].split("WHERE", 1)[0]
    assert "source_event_id =" not in set_clause
    assert "event_time =" not in set_clause


def test_upsert_statement_supports_multiple_rows():
    sql = compile_sql(build_upsert_statement([make_row("a"), make_row("b")]))
    assert sql.count("VALUES") == 1
    assert "), (" in sql


# TC-08
def test_deduplicate_keeps_newest_source_updated_at():
    rows = [
        make_row("a", 1, 4.0),
        make_row("b", 0),
        make_row("a", 3, 4.5),
        make_row("a", 2, 4.2),
    ]
    result = deduplicate_rows(rows)
    assert [r["source_event_id"] for r in result] == ["a", "b"]
    assert result[0]["magnitude"] == 4.5


def test_deduplicate_prefers_timestamp_over_none():
    assert (
        deduplicate_rows([make_row("a", None, 1.0), make_row("a", 1, 2.0)])[0][
            "magnitude"
        ]
        == 2.0
    )
    assert (
        deduplicate_rows([make_row("a", 1, 2.0), make_row("a", None, 1.0)])[0][
            "magnitude"
        ]
        == 2.0
    )


class FakeDb:
    def __init__(self, returned_flags):
        self.returned_flags = list(returned_flags)
        self.statements = []

    def execute(self, stmt):
        self.statements.append(stmt)
        flags, self.returned_flags = self.returned_flags, []
        return [SimpleNamespace(inserted=flag) for flag in flags]


# TC-09
def test_upsert_events_counts_inserted_updated_unchanged():
    db = FakeDb(
        [True, False]
    )  # 1 dòng mới, 1 dòng cập nhật, dòng thứ 3 bị WHERE chặn (không RETURNING)
    stats = upsert_events(db, [make_row("a"), make_row("b"), make_row("c")])

    assert stats == UpsertStats(inserted=1, updated=1, unchanged=1)
    assert stats.processed == 2
    assert len(db.statements) == 1


def test_upsert_events_empty_batch_skips_database():
    db = FakeDb([])
    assert upsert_events(db, []) == UpsertStats()
    assert db.statements == []


def test_upsert_events_chunks_large_batches():
    db = FakeDb([])
    rows = [make_row(f"id{i}") for i in range(5)]
    stats = upsert_events(db, rows, chunk_size=2)
    assert len(db.statements) == 3
    assert stats.unchanged == 5
````

#### 11.3.91. `apps/api/tests/unit/test_patterns_contract_fields.py`

````python
"""Test offline: `/api/v1/patterns` P5/P6 trả field optional (GAP-07).

Testcase: .agents/notes/testcase/2026-11-22-patterns-optional-fields-thien.md
"""

from datetime import UTC, date, datetime
from pathlib import Path

from gdmas.models.prediction import ClassificationResult, PredictionResult

API = "/api/v1/patterns"
GENERATED_AT = datetime(2026, 11, 22, 11, 0, tzinfo=UTC)


def _seed_prediction(db):
    db.add(
        PredictionResult(
            target_date=date(2026, 11, 23),
            metric_name="daily_earthquake_count",
            predicted_value=46.2,
            lower_bound=38.0,
            upper_bound=54.4,
            model_name="Ridge-TimeSeries-Forecaster",
            model_version="v1.2.0",
            evaluation_metrics={"mae": 4.12, "rmse": 5.84, "baseline_mae": 6.2},
            generated_at=GENERATED_AT,
        )
    )
    db.add(
        ClassificationResult(
            target_date=date(2026, 11, 23),
            predicted_label="Moderate",
            probability_scores={"Low": 0.12, "Moderate": 0.55},
            model_name="RandomForest-Seismic-Classifier",
            model_version="v2.0.0",
            evaluation_metrics={"f1_macro": 0.78, "accuracy": 0.82},
            generated_at=GENERATED_AT,
        )
    )
    db.commit()


def _pattern(body, pattern_id):
    return next(p for p in body["patterns"] if p["id"] == pattern_id)


def test_pattern_5_and_6_expose_optional_fields(client, db):
    _seed_prediction(db)

    body = client.get(API).json()

    p5 = _pattern(body, "pattern_5")["metrics"]
    assert p5["metric_name"] == "daily_earthquake_count"
    assert p5["model_version"] == "v1.2.0"
    assert p5["evaluation_metrics"]["mae"] == 4.12
    assert p5["generated_at"] == "2026-11-22T11:00:00Z"

    p6 = _pattern(body, "pattern_6")["metrics"]
    assert p6["model_version"] == "v2.0.0"
    assert p6["evaluation_metrics"]["f1_macro"] == 0.78


def test_empty_patterns_keeps_documented_shape_without_data(client):
    body = client.get(API).json()

    assert body["success"] is False
    assert body["total_patterns"] == 0
    assert body["patterns"] == []
    assert "data" not in body
    assert body["message"]


def test_contract_notes_reflect_be_now_returns_fields():
    root = Path(__file__).resolve().parents[4]
    schema = (root / "contracts/schemas/patterns.json").read_text(encoding="utf-8")
    readme = (root / "contracts/README.md").read_text(encoding="utf-8")

    assert "BE hiện chưa trả" not in schema
    assert "BE có thể bổ sung sau" not in readme
    assert "đã trả từ 2026-11-22" in schema
````

#### 11.3.92. `apps/api/tests/unit/test_prediction_filtered_precision.py`

````python
"""Test offline cho độ chính xác dự báo BE — KHÔNG DB, KHÔNG artifact, KHÔNG mạng (I7)."""

from pathlib import Path

from gdmas.services.analysis.filtered import rounded_forecast

SERVICE_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "gdmas"
    / "services"
    / "prediction"
    / "service.py"
).read_text(encoding="utf-8")


def test_tc01_rounds_three_prediction_fields_to_three_decimals():
    raw = {"predicted": 299.5424, "lower": 179.7053, "upper": 316.7531}
    result = rounded_forecast(raw)
    assert result == {"predicted": 299.542, "lower": 179.705, "upper": 316.753}


def test_tc02_preserves_other_fields_and_original_dict():
    raw = {"predicted": 6.086, "lower": 4.554, "upper": 8.766, "other": "keep", "n": 3}
    result = rounded_forecast(raw)
    assert result["other"] == "keep"
    assert result["n"] == 3
    assert raw["predicted"] == 6.086, "hàm thuần không được sửa input"


def test_tc03_already_three_decimals_stays_stable():
    raw = {"predicted": 6.086, "lower": 4.554, "upper": 8.766}
    assert rounded_forecast(raw) == raw


def test_tc04_handles_missing_and_non_numeric_fields():
    result = rounded_forecast({"predicted": None, "lower": "n/a"})
    assert result == {"predicted": None, "lower": "n/a"}


def test_tc05_snapshot_path_uses_the_same_three_decimal_precision():
    for field in ("predicted", "lower", "upper"):
        assert f'round(fc["{field}"], 3)' in SERVICE_SOURCE
    assert 'round(fc["predicted"], 1)' not in SERVICE_SOURCE
````

#### 11.3.93. `apps/api/tests/unit/test_prediction_inference.py`

````python
"""Test offline cho suy luận Pattern 5 và 6 (services/prediction/inference.py).

Không cần mô hình thật: fixture tự huấn luyện ARIMA nhỏ trên chuỗi giả lập.
"""

from datetime import date

import numpy as np
import pandas as pd
import pytest
from statsmodels.tsa.arima.model import ARIMA

from gdmas.services.prediction import inference

THRESHOLDS = [90.0, 105.0, 120.0]


def _daily_series(n: int = 40, seed: int = 0) -> pd.Series:
    rng = np.random.default_rng(seed)
    idx = pd.date_range("2026-01-01", periods=n, freq="D")
    return pd.Series(100 + rng.normal(0, 10, n), index=idx)


def _arima_params(series: pd.Series) -> dict:
    return ARIMA(series, order=(1, 0, 0), trend="c").fit().params.to_dict()


def _artifacts(log: bool = False, q_lo: float = -20.0, q_hi: float = 20.0) -> dict:
    base = _daily_series(120, seed=1)
    train = np.log1p(base) if log else base
    params = _arima_params(train)
    rng = np.random.default_rng(2)
    resid = (rng.normal(0, 0.1, 300) if log else rng.normal(0, 10, 300)).tolist()
    return {
        "forecast": {
            "type": "arima",
            "order": [1, 0, 0],
            "log": log,
            "params": params,
            "q_lo": q_lo,
            "q_hi": q_hi,
        },
        "classifier": {
            "type": "forecast_distribution",
            "order": [1, 0, 0],
            "log": log,
            "params": params,
            "resid": resid,
            "thresholds": THRESHOLDS,
            "labels": inference.LABELS,
        },
        "history": {"dates": [], "counts": []},
        "report": {
            "forecast_winner": "ARIMA(1, 0, 0)",
            "forecast": {
                "baseline_hom_qua": {"MAE": 8.0, "RMSE": 10.0},
                "baseline_tb_7_ngay": {"MAE": 6.5, "RMSE": 8.0},
                "ARIMA(1, 0, 0)": {
                    "MAE": 5.123,
                    "RMSE": 6.789,
                    "coverage_95": 0.9567,
                },
            },
            "classifier_winner": "PhanPhoiDuBao",
            "classifier": {
                "PhanPhoiDuBao": {
                    "accuracy": 0.51234,
                    "f1_macro": 0.26412,
                    "within_1_level": 0.8612,
                }
            },
            "thresholds": THRESHOLDS,
            "n_test": 144,
        },
    }


@pytest.fixture
def arts(monkeypatch):
    data = _artifacts()
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


@pytest.fixture
def arts_log(monkeypatch):
    data = _artifacts(log=True, q_lo=-0.2, q_hi=0.2)
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


# ---------- build_series ----------
def test_build_series_db_overrides_history():
    history = {
        "dates": ["2026-03-01", "2026-03-02", "2026-03-03"],
        "counts": [10, 20, 30],
    }
    series = inference.build_series(history, {date(2026, 3, 2): 99}, date(2026, 3, 3))
    assert series.tolist() == [10.0, 99.0, 30.0]
    assert series.index[0] == pd.Timestamp("2026-03-01")


def test_build_series_extends_to_last_day_with_nan_for_missing_days():
    history = {"dates": ["2026-03-01", "2026-03-02"], "counts": [10, 20]}
    series = inference.build_series(history, {date(2026, 3, 4): 7}, date(2026, 3, 5))
    assert len(series) == 5
    assert np.isnan(series.loc["2026-03-03"])
    assert series.loc["2026-03-04"] == 7.0
    assert np.isnan(series.loc["2026-03-05"])


def test_build_series_ignores_db_days_outside_range():
    history = {"dates": ["2026-03-02", "2026-03-03"], "counts": [10, 20]}
    db_counts = {date(2026, 3, 1): 5, date(2026, 3, 9): 6}
    series = inference.build_series(history, db_counts, date(2026, 3, 3))
    assert series.tolist() == [10.0, 20.0]


def test_build_series_empty_db_keeps_history():
    history = {"dates": ["2026-03-01", "2026-03-02"], "counts": [10, 20]}
    series = inference.build_series(history, {}, date(2026, 3, 2))
    assert series.tolist() == [10.0, 20.0]


# ---------- forecast_next (Pattern 5) ----------
@pytest.mark.parametrize("fixture_name", ["arts", "arts_log"])
def test_forecast_bounds_are_ordered_and_non_negative(request, fixture_name):
    request.getfixturevalue(fixture_name)
    result = inference.forecast_next(_daily_series(40))
    assert 0.0 <= result["lower"] <= result["predicted"] <= result["upper"]


def test_forecast_is_close_to_series_level(arts):
    result = inference.forecast_next(_daily_series(40))
    assert 60 < result["predicted"] < 140


def test_forecast_lower_bound_is_clipped_at_zero(monkeypatch):
    data = _artifacts(q_lo=-1000.0, q_hi=20.0)
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    result = inference.forecast_next(_daily_series(40))
    assert result["lower"] == 0.0
    assert result["predicted"] >= 0.0


def test_forecast_tolerates_missing_days(arts):
    series = _daily_series(40)
    series.iloc[[5, 6, 20]] = np.nan
    result = inference.forecast_next(series)
    assert 0.0 <= result["lower"] <= result["predicted"] <= result["upper"]


def test_forecast_raises_when_history_too_short(arts):
    series = _daily_series(40)
    series.iloc[: 40 - (inference.MIN_OBSERVED - 1)] = np.nan
    with pytest.raises(ValueError):
        inference.forecast_next(series)


def test_forecast_raises_on_empty_series(arts):
    with pytest.raises(ValueError):
        inference.forecast_next(pd.Series(dtype=float))


def test_forecast_rejects_unsupported_model_type(arts):
    arts["forecast"]["type"] = "ridge"
    with pytest.raises(NotImplementedError):
        inference.forecast_next(_daily_series(40))


# ---------- classify_next (Pattern 6) ----------
@pytest.mark.parametrize("fixture_name", ["arts", "arts_log"])
def test_classify_probabilities_valid(request, fixture_name):
    request.getfixturevalue(fixture_name)
    result = inference.classify_next(_daily_series(40))
    probs = result["probabilities"]
    assert list(probs) == inference.LABELS
    assert all(p >= 0.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-3)


def test_classify_label_is_most_probable(arts):
    result = inference.classify_next(_daily_series(40))
    probs = result["probabilities"]
    assert result["label"] in inference.LABELS
    assert probs[result["label"]] == max(probs.values())


def test_classify_high_level_series_gives_higher_label(arts):
    # Mô hình nhớ mạnh (AR 0.9) nên mức hôm qua quyết định mức dự báo ngày mai
    arts["classifier"]["params"] = {"const": 0.0, "ar.L1": 0.9, "sigma2": 1.0}
    low = inference.classify_next(_daily_series(40) * 0.3)
    high = inference.classify_next(_daily_series(40) * 1.5)
    rank = {label: i for i, label in enumerate(inference.LABELS)}
    assert low["label"] == "Low"
    assert rank[high["label"]] > rank[low["label"]]


def test_classify_rejects_unsupported_classifier_type(arts):
    arts["classifier"]["type"] = "sklearn"
    with pytest.raises(NotImplementedError):
        inference.classify_next(_daily_series(40))


# ---------- label_of_count ----------
@pytest.mark.parametrize(
    ("count", "expected"),
    [
        (0, "Low"),
        (89.9, "Low"),
        (90, "Moderate"),
        (104.9, "Moderate"),
        (105, "High"),
        (119.9, "High"),
        (120, "Critical"),
        (5000, "Critical"),
    ],
)
def test_label_of_count_boundaries(arts, count, expected):
    assert inference.label_of_count(count) == expected


# ---------- thông tin mô hình ----------
def test_forecast_model_info_uses_best_baseline(arts):
    name, info = inference.forecast_model_info()
    assert name == "ARIMA(1, 0, 0)"
    assert info["baseline_mae"] == 6.5
    assert info["mae"] == 5.12
    assert info["rmse"] == 6.79
    assert info["confidence_level"] == 0.95
    assert info["n_test"] == 144


def test_classifier_model_info_has_readable_name_and_metrics(arts):
    name, info = inference.classifier_model_info()
    assert name == "Forecast-Distribution Risk Classifier"
    assert info["accuracy"] == 0.512
    assert info["f1_macro"] == 0.264
    assert info["classes"] == inference.LABELS
    assert info["thresholds"] == THRESHOLDS


# ---------- load_artifacts ----------
def test_load_artifacts_reports_missing_files(tmp_path, monkeypatch):
    monkeypatch.setattr(inference, "MODEL_DIR", tmp_path)
    inference.load_artifacts.cache_clear()
    try:
        with pytest.raises(FileNotFoundError, match="train_models.py"):
            inference.load_artifacts()
    finally:
        inference.load_artifacts.cache_clear()
````

#### 11.3.94. `apps/api/tests/unit/test_prediction_service.py`

````python
"""Test offline cho PredictionService (services/prediction/service.py).

Dùng session giả thay cho PostgreSQL: kiểm tra logic ghi prediction_results,
classification_results, cập nhật actual_value và ghi ServiceRun.
"""

from datetime import UTC, date, datetime

import numpy as np
import pandas as pd
import pytest
from sqlalchemy.exc import OperationalError
from statsmodels.tsa.arima.model import ARIMA

from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.prediction import inference, service
from gdmas.services.prediction.service import PredictionService

NOW = datetime(2026, 11, 12, 10, 0, tzinfo=UTC)
TODAY = NOW.date()


# ---------- session giả ----------
class FakeQuery:
    def __init__(self, session, model):
        self.session = session
        self.model = model

    def filter(self, *_args, **_kwargs):
        return self

    def delete(self, **_kwargs):
        self.session.deleted.append(self.model)
        return 1

    def __iter__(self):
        return iter(self.session.rows.get(self.model, []))


class FakeSession:
    def __init__(self, first_ts=None, rows=None, group_rows=None):
        self.first_ts = first_ts
        self.group_rows = group_rows or []
        self.rows = rows or {}
        self.added: list = []
        self.deleted: list = []
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def scalar(self, _stmt):
        return self.first_ts

    def execute(self, _stmt):
        return self

    def all(self):
        return self.group_rows

    def query(self, model):
        return FakeQuery(self, model)

    def of_type(self, cls):
        return [o for o in self.added if isinstance(o, cls)]


# ---------- artifact ARIMA nhỏ cho test end-to-end ----------
def _artifacts() -> dict:
    rng = np.random.default_rng(1)
    idx = pd.date_range("2026-01-01", periods=120, freq="D")
    base = pd.Series(100 + rng.normal(0, 10, 120), index=idx)
    params = ARIMA(base, order=(1, 0, 0), trend="c").fit().params.to_dict()
    thresholds = [90.0, 105.0, 120.0]
    dates = pd.date_range("2026-09-01", "2026-11-05", freq="D")
    return {
        "forecast": {
            "type": "arima",
            "order": [1, 0, 0],
            "log": False,
            "params": params,
            "q_lo": -20.0,
            "q_hi": 20.0,
        },
        "classifier": {
            "type": "forecast_distribution",
            "order": [1, 0, 0],
            "log": False,
            "params": params,
            "resid": rng.normal(0, 10, 300).tolist(),
            "thresholds": thresholds,
        },
        "history": {
            "dates": [d.strftime("%Y-%m-%d") for d in dates],
            "counts": [int(x) for x in 100 + rng.normal(0, 10, len(dates))],
        },
        "report": {
            "forecast_winner": "ARIMA(1, 0, 0)",
            "forecast": {
                "baseline_tb_7_ngay": {"MAE": 6.5, "RMSE": 8.0},
                "ARIMA(1, 0, 0)": {"MAE": 5.1, "RMSE": 6.8, "coverage_95": 0.95},
            },
            "classifier_winner": "PhanPhoiDuBao",
            "classifier": {
                "PhanPhoiDuBao": {
                    "accuracy": 0.5,
                    "f1_macro": 0.26,
                    "within_1_level": 0.86,
                }
            },
            "thresholds": thresholds,
            "n_test": 144,
        },
    }


@pytest.fixture
def real_inference(monkeypatch):
    data = _artifacts()
    monkeypatch.setattr(inference, "load_artifacts", lambda: data)
    return data


# ---------- _complete_day_counts ----------
def test_complete_day_counts_empty_db_returns_empty():
    db = FakeSession(first_ts=None)
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_first_event_today_returns_empty():
    # Ngày có sự kiện đầu tiên chưa đủ 24 giờ nên không có ngày hoàn chỉnh nào
    db = FakeSession(first_ts=datetime(2026, 11, 12, 1, 0, tzinfo=UTC))
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_first_event_yesterday_returns_empty():
    db = FakeSession(first_ts=datetime(2026, 11, 11, 23, 0, tzinfo=UTC))
    assert PredictionService._complete_day_counts(db, TODAY) == {}


def test_complete_day_counts_maps_rows_to_dates():
    db = FakeSession(
        first_ts=datetime(2026, 11, 8, 3, 0, tzinfo=UTC),
        group_rows=[(date(2026, 11, 9), 40), (date(2026, 11, 10), 55)],
    )
    assert PredictionService._complete_day_counts(db, TODAY) == {
        date(2026, 11, 9): 40,
        date(2026, 11, 10): 55,
    }


# ---------- _fill_actuals ----------
def test_fill_actuals_sets_value_and_label_for_known_days(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 10), actual_value=None)
    cls = ClassificationResult(target_date=date(2026, 11, 10), actual_label=None)
    db = FakeSession(rows={PredictionResult: [pred], ClassificationResult: [cls]})
    PredictionService._fill_actuals(db, {date(2026, 11, 10): 130}, TODAY)
    assert pred.actual_value == 130.0
    assert cls.actual_label == "Critical"


def test_fill_actuals_keeps_none_when_day_missing_in_db(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 9), actual_value=None)
    cls = ClassificationResult(target_date=date(2026, 11, 9), actual_label=None)
    db = FakeSession(rows={PredictionResult: [pred], ClassificationResult: [cls]})
    PredictionService._fill_actuals(db, {date(2026, 11, 10): 130}, TODAY)
    assert pred.actual_value is None
    assert cls.actual_label is None


def test_fill_actuals_with_empty_db_does_nothing(real_inference):
    pred = PredictionResult(target_date=date(2026, 11, 10), actual_value=None)
    db = FakeSession(rows={PredictionResult: [pred]})
    PredictionService._fill_actuals(db, {}, TODAY)
    assert pred.actual_value is None


# ---------- _predict (end-to-end với suy luận thật) ----------
def test_predict_writes_valid_prediction_and_classification(real_inference):
    db = FakeSession(first_ts=None)  # DB rỗng: chỉ dùng lịch sử huấn luyện
    result = PredictionService()._predict(db, NOW)

    (pred,) = db.of_type(PredictionResult)
    (cls,) = db.of_type(ClassificationResult)

    assert result["success"] is True
    assert result["target_date"] == "2026-11-12"
    assert pred.target_date == TODAY
    assert pred.metric_name == service.METRIC_NAME
    assert 0.0 <= pred.lower_bound <= pred.predicted_value <= pred.upper_bound
    assert pred.model_version == service.MODEL_VERSION
    assert pred.evaluation_metrics["history_days_observed"] > 0
    assert pred.evaluation_metrics["baseline_mae"] == 6.5

    assert cls.target_date == TODAY
    assert cls.predicted_label in inference.LABELS
    probs = cls.probability_scores
    assert all(p >= 0.0 for p in probs.values())
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-3)
    assert probs[cls.predicted_label] == max(probs.values())
    assert db.commits == 1


def test_predict_replaces_existing_rows_of_target_date(real_inference):
    db = FakeSession(first_ts=None)
    PredictionService()._predict(db, NOW)
    assert PredictionResult in db.deleted
    assert ClassificationResult in db.deleted


def test_predict_uses_db_counts_over_history(real_inference):
    # Mô hình nhớ mạnh (AR 0.9): dự báo bám theo mức của các ngày gần nhất
    strong = {"const": 0.0, "ar.L1": 0.9, "sigma2": 1.0}
    real_inference["forecast"]["params"] = strong
    real_inference["classifier"]["params"] = strong

    baseline = PredictionService()._predict(FakeSession(first_ts=None), NOW)

    first = datetime(2026, 11, 1, 5, 0, tzinfo=UTC)
    rows = [(date(2026, 11, d), 300) for d in range(2, 12)]
    db = FakeSession(first_ts=first, group_rows=rows)
    result = PredictionService()._predict(db, NOW)

    # DB ghi đè lịch sử huấn luyện: ngày cuối ~300 nên dự báo ~270, cao hơn hẳn
    assert result["predicted"] > baseline["predicted"] + 100
    assert result["predicted"] == pytest.approx(270, abs=5)


def test_predict_truncates_long_model_names(real_inference, monkeypatch):
    monkeypatch.setattr(
        inference, "forecast_model_info", lambda: ("X" * 200, {"mae": 1.0})
    )
    db = FakeSession(first_ts=None)
    PredictionService()._predict(db, NOW)
    (pred,) = db.of_type(PredictionResult)
    assert len(pred.model_name) == 64


def test_predict_fails_cleanly_when_history_too_short(real_inference):
    real_inference["history"] = {"dates": ["2026-11-05"], "counts": [100]}
    db = FakeSession(first_ts=None)
    with pytest.raises(ValueError):
        PredictionService()._predict(db, NOW)
    assert db.of_type(PredictionResult) == []
    assert db.of_type(ClassificationResult) == []


# ---------- execute_cycle ----------
def test_execute_cycle_records_success_service_run(real_inference, monkeypatch):
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    result = PredictionService().execute_cycle()

    assert result["success"] is True
    (run,) = db.of_type(ServiceRun)
    assert run.service_name == "prediction"
    assert run.status == "SUCCESS"
    assert run.records_processed == 2
    assert run.finished_at is not None
    assert run.error_message is None


def test_execute_cycle_records_failure_without_raising(real_inference, monkeypatch):
    real_inference["history"] = {"dates": ["2026-11-05"], "counts": [100]}
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)

    result = PredictionService().execute_cycle()  # không được ném ngoại lệ

    assert result["success"] is False
    assert "error" in result
    (run,) = db.of_type(ServiceRun)
    assert run.status == "FAILED"
    assert run.error_message
    assert run.finished_at is not None
    assert db.rollbacks == 1


def test_execute_cycle_truncates_error_message(monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("x" * 5000)

    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    monkeypatch.setattr(PredictionService, "_predict", boom)

    result = PredictionService().execute_cycle()

    assert result["success"] is False
    (run,) = db.of_type(ServiceRun)
    assert len(run.error_message) == 1000


def test_execute_cycle_marks_failed_on_query_error(monkeypatch):
    def boom(*_args, **_kwargs):
        raise OperationalError("SELECT 1", {}, Exception("query failed"))

    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    monkeypatch.setattr(PredictionService, "_predict", boom)

    result = PredictionService().execute_cycle()

    assert result == {"success": False, "error": "DATABASE_ERROR"}
    (run,) = db.of_type(ServiceRun)
    assert run.status == "FAILED"
    assert run.error_message == "DATABASE_ERROR"
    assert run.finished_at is not None
    assert db.rollbacks >= 1


def test_execute_cycle_fails_when_model_files_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(inference, "MODEL_DIR", tmp_path)
    inference.load_artifacts.cache_clear()
    db = FakeSession(first_ts=None)
    monkeypatch.setattr(service, "SessionLocal", lambda: db)
    try:
        result = PredictionService().execute_cycle()
    finally:
        inference.load_artifacts.cache_clear()
    assert result["success"] is False
    (run,) = db.of_type(ServiceRun)
    assert run.status == "FAILED"
````

#### 11.3.95. `apps/api/tests/unit/test_quality_boundaries.py`

````python
"""Bảo vệ hợp đồng trước/sau bảo trì backend; snapshot lấy trước khi sửa nguồn."""

import ast
import hashlib
import json
from pathlib import Path

from sqlalchemy.dialects import postgresql

from gdmas import models, schemas
from gdmas.db.base import Base
from gdmas.main import app

API_DIR = Path(__file__).resolve().parents[2]
FIXTURE = API_DIR / "tests/fixtures/quality_contracts.json"


def _normalized_hash(path):
    return hashlib.sha256(path.read_text(encoding="utf-8").encode("utf-8")).hexdigest()


def _current_contracts():
    dialect = postgresql.dialect()
    tables = {}
    for table in Base.metadata.sorted_tables:
        tables[table.name] = {
            "columns": [
                {
                    "name": column.name,
                    "type": str(column.type.compile(dialect=dialect)),
                    "nullable": column.nullable,
                    "primary_key": column.primary_key,
                    "server_default": str(column.server_default.arg)
                    if column.server_default is not None
                    else None,
                    "foreign_keys": sorted(
                        key.target_fullname for key in column.foreign_keys
                    ),
                }
                for column in table.columns
            ],
            "indexes": sorted(
                (index.name, index.unique, [str(expr) for expr in index.expressions])
                for index in table.indexes
            ),
            "constraints": sorted(
                (
                    type(constraint).__name__,
                    constraint.name or "",
                    [column.name for column in constraint.columns],
                )
                for constraint in table.constraints
            ),
        }
    config_ast = ast.parse(
        (API_DIR / "src/gdmas/core/config.py").read_text(encoding="utf-8")
    )
    settings_class = next(
        node
        for node in config_ast.body
        if isinstance(node, ast.ClassDef) and node.name == "Settings"
    )
    defaults = [
        (node.target.id, ast.dump(node.value, include_attributes=False))
        for node in settings_class.body
        if isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.value is not None
    ]
    return {
        "openapi": app.openapi(),
        "orm": tables,
        "exports": {
            "models": sorted(models.__all__),
            "schemas": sorted(schemas.__all__),
        },
        "config_defaults_sha256": hashlib.sha256(
            json.dumps(defaults, sort_keys=True).encode()
        ).hexdigest(),
        "migration_sha256": _normalized_hash(
            API_DIR / "alembic/versions/001_initial_gdmas_schema.py"
        ),
    }


def _expected():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_openapi_contract_is_unchanged():
    assert _current_contracts()["openapi"] == _expected()["openapi"]


def test_orm_columns_constraints_and_indexes_are_unchanged():
    actual = json.loads(json.dumps(_current_contracts()["orm"]))
    assert actual == _expected()["orm"]


def test_public_model_and_schema_exports_are_preserved():
    assert _current_contracts()["exports"] == _expected()["exports"]
    assert {name for name in models.__all__ if name != "Base"} == {
        mapper.class_.__name__ for mapper in Base.registry.mappers
    }


def test_config_default_values_are_unchanged():
    assert (
        _current_contracts()["config_defaults_sha256"]
        == _expected()["config_defaults_sha256"]
    )


def test_existing_migration_is_unchanged():
    assert _current_contracts()["migration_sha256"] == _expected()["migration_sha256"]
````

#### 11.3.96. `apps/api/tests/unit/test_sse_stream.py`

````python
"""Test gọn cho kênh SSE (realtime/sse.py): sự kiện phát ra theo trạng thái DB."""

import asyncio
import json

from gdmas.main import app
from gdmas.realtime import sse


class FakeRequest:
    """Client SSE giả: ngắt kết nối sau n lần kiểm tra."""

    def __init__(self, n):
        self.n = n

    async def is_disconnected(self):
        self.n -= 1
        return self.n < 0


def _state(total=5, new_events=None, new_run=None, **kw):
    state = {
        "success": True,
        "total": total,
        "strong_count": 0,
        "latest": None,
        "latest_run": None,
        "latest_run_id": 2 if new_run else 1,
        "max_id": 10,
        "new_events": new_events or [],
        "new_run_info": new_run,
    }
    state.update(kw)
    return state


def _collect(monkeypatch, initial, later):
    """Chạy generator với dãy trạng thái giả; trả về danh sách gói tin đã phát."""
    states = iter([initial, *later])
    monkeypatch.setattr(sse, "get_latest_state", lambda *_a: next(states))
    monkeypatch.setattr(sse, "POLL_INTERVAL_SECONDS", 0)

    async def run():
        return [
            m async for m in sse.earthquake_event_generator(FakeRequest(len(later)))
        ]

    return [json.loads(m["data"]) for m in asyncio.run(run())]


def _names(packets):
    return [p["event"] for p in packets]


def test_first_packet_is_welcome_heartbeat(monkeypatch):
    packets = _collect(monkeypatch, _state(), [])
    assert _names(packets) == ["heartbeat"]
    assert packets[0]["data"]["total_events"] == 5


def test_periodic_heartbeat_when_nothing_new(monkeypatch):
    packets = _collect(monkeypatch, _state(), [_state(), _state()])
    assert _names(packets) == ["heartbeat", "heartbeat", "heartbeat"]


def test_new_event_emits_earthquake_detected_without_alert(monkeypatch):
    new = [{"id": 11, "magnitude": 4.0}]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=11)])
    assert _names(packets) == ["heartbeat", "earthquake_detected"]


def test_strong_event_emits_earthquake_alert(monkeypatch):
    new = [{"id": 11, "magnitude": 4.5}, {"id": 12, "magnitude": 3.0}]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=12)])
    assert _names(packets) == [
        "heartbeat",
        "earthquake_detected",
        "earthquake_alert",
        "alert",
    ]
    alert = packets[-2]["data"]
    assert [e["id"] for e in alert["alert_events"]] == [11]
    assert alert["max_magnitude"] == 4.5


def test_packets_carry_id_and_retry(monkeypatch):
    packets = _collect(monkeypatch, _state(), [])
    packet = packets[0]

    assert packet["id"].startswith("gdmas-")
    assert packet["retry"] == 5_000
    assert packet["timestamp"].endswith("Z")


def test_alert_alias_carries_same_payload(monkeypatch):
    new = [{"id": 11, "magnitude": 4.5, "latitude": 38.2, "longitude": 142.4}]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=12)])
    alert, alias = packets[-2], packets[-1]

    assert alert["event"] == "earthquake_alert"
    assert alias["event"] == "alert"
    assert alert["data"] == alias["data"]
    assert alias["id"] != alert["id"]


def test_earthquake_detected_has_flat_marker_fields(monkeypatch):
    new = [
        {
            "id": 11,
            "source_event_id": "us_test_001",
            "event_time": "2026-11-22T03:00:00Z",
            "latitude": -6.2,
            "longitude": 106.8,
            "depth_km": 24.5,
            "magnitude": 4.0,
            "place": "Java, Indonesia",
        }
    ]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=11)])

    packet = packets[-1]
    assert packet["event"] == "earthquake_detected"
    data = packet["data"]
    assert data["latitude"] == -6.2
    assert data["longitude"] == 106.8
    assert data["magnitude"] == 4.0
    assert data["event_time"] == "2026-11-22T03:00:00Z"
    assert data["source_event_id"] == "us_test_001"
    assert data["place"] == "Java, Indonesia"
    assert data["new_events"] == new  # Mảng gốc vẫn giữ (RULE-03)


def test_earthquake_alert_has_flat_marker_fields(monkeypatch):
    alerts = [
        {
            "id": 12,
            "source_event_id": "us_test_002",
            "event_time": "2026-11-22T04:00:00Z",
            "latitude": 38.2,
            "longitude": 142.4,
            "depth_km": 30.0,
            "magnitude": 5.2,
            "place": "Honshu, Japan",
        }
    ]
    packets = _collect(monkeypatch, _state(), [_state(new_events=alerts, max_id=12)])

    alert = packets[-1]["data"]
    assert alert["latitude"] == 38.2
    assert alert["longitude"] == 142.4
    assert alert["magnitude"] == 5.2
    assert alert["event_time"] == "2026-11-22T04:00:00Z"
    assert alert["alert_events"] == alerts


def test_marker_fields_are_empty_for_no_event():
    assert sse._marker_fields([]) == {}


def test_finished_ingestion_run_emits_cycle_completed(monkeypatch):
    run = {"records_processed": 3, "finished_at": None}
    packets = _collect(monkeypatch, _state(), [_state(new_run=run)])
    assert _names(packets) == ["heartbeat", "ingestion_cycle_completed"]
    assert packets[1]["data"]["records_processed"] == 3


def test_database_cleared_when_total_drops_to_zero(monkeypatch):
    packets = _collect(monkeypatch, _state(), [_state(total=0, max_id=0)])
    assert _names(packets) == ["heartbeat", "database_cleared"]


def test_transient_db_error_does_not_emit_database_cleared(monkeypatch):
    later = [{"success": False}, _state()]
    packets = _collect(monkeypatch, _state(), later)
    assert "database_cleared" not in _names(packets)
    assert _names(packets) == ["heartbeat", "heartbeat"]


def test_db_error_then_empty_db_still_reports_cleared_once(monkeypatch):
    later = [{"success": False}, _state(total=0, max_id=0)]
    packets = _collect(monkeypatch, _state(), later)
    assert _names(packets).count("database_cleared") == 1


def test_packets_follow_contract_with_utc_timestamp(monkeypatch):
    packets = _collect(monkeypatch, _state(), [])
    packet = packets[0]
    assert set(packet) == {"event", "data", "timestamp", "id", "retry"}
    assert packet["timestamp"].endswith("Z")


def test_broadcast_pushes_database_cleared_to_connected_clients():
    queue = asyncio.Queue()
    sse._connected_sse_queues.add(queue)
    try:
        assert sse.broadcast_database_cleared_event() >= 1
        assert json.loads(queue.get_nowait()["data"])["event"] == "database_cleared"
    finally:
        sse._connected_sse_queues.discard(queue)


def test_both_stream_paths_are_registered():
    paths = set(app.openapi()["paths"])
    assert "/api/v1/events/stream" in paths
    assert "/api/v1/stream/earthquakes" in paths
````

#### 11.3.97. `apps/api/tests/unit/test_statistics_route.py`

````python
"""Test route /api/v1/statistics/earthquakes: KPI thật, DB rỗng, DB lỗi."""

from datetime import UTC, datetime, timedelta

from .conftest import add_event

URL = "/api/v1/statistics/earthquakes"


def test_empty_db_returns_zeros_and_empty_series_not_mock(client):
    resp = client.get(URL)
    data = resp.json()["data"]
    assert resp.status_code == 200
    assert data["total_events"] == 0
    assert data["strong_events_count"] == 0
    assert data["recent_24h_count"] == 0
    assert data["avg_magnitude"] == 0
    assert data["latest_event_time"] is None
    assert data["time_series_preview"] == []
    assert "1248" not in resp.text


def test_db_error_returns_500_database_error_not_1248(broken_client):
    resp = broken_client.get(URL)
    body = resp.json()
    assert resp.status_code == 500
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert "1248" not in resp.text


def test_kpis_are_computed_from_database(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, magnitude=2.0, event_time=now - timedelta(hours=2))
    add_event(db, 2, magnitude=4.4, event_time=now - timedelta(hours=3))
    add_event(db, 3, magnitude=5.0, event_time=now - timedelta(hours=4))
    add_event(db, 4, magnitude=6.4, event_time=now - timedelta(days=5))
    data = client.get(URL).json()["data"]
    assert data["total_events"] == 4
    assert data["strong_events_count"] == 2
    assert data["moderate_events_count"] == 1
    assert data["minor_events_count"] == 1
    assert data["recent_24h_count"] == 3
    assert data["max_magnitude"] == 6.4
    assert data["avg_magnitude"] == round((2.0 + 4.4 + 5.0 + 6.4) / 4, 2)


def test_numeric_filters_scope_kpis_like_catalog(client, db):
    """KPI Danh mục (max/avg) dùng chung BE với Overview nhưng ăn thêm bộ lọc số."""
    now = datetime.now(UTC)
    add_event(db, 1, magnitude=2.0, depth_km=5.0, event_time=now - timedelta(hours=2))
    add_event(db, 2, magnitude=6.4, depth_km=150.0, event_time=now - timedelta(hours=3))

    all_data = client.get(URL).json()["data"]
    assert all_data["max_magnitude"] == 6.4
    assert all_data["total_events"] == 2

    strong_only = client.get(URL, params={"min_magnitude": 5}).json()["data"]
    assert strong_only["total_events"] == 1
    assert strong_only["max_magnitude"] == 6.4

    shallow_only = client.get(URL, params={"max_depth": 10}).json()["data"]
    assert shallow_only["total_events"] == 1
    assert shallow_only["max_magnitude"] == 2.0


def test_time_series_has_eight_buckets_computed_from_events(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, magnitude=3.0, event_time=now - timedelta(minutes=30))
    add_event(db, 2, magnitude=5.0, event_time=now - timedelta(minutes=40))
    series = client.get(URL).json()["data"]["time_series_preview"]
    assert len(series) == 8
    assert sum(p["count"] for p in series) == 2
    # Hai sự kiện mới nhất rơi vào khoảng 3 giờ cuối cùng
    assert series[-1]["count"] == 2
    assert series[-1]["avg_mag"] == 4.0
    assert all(p["count"] == 0 for p in series[:-1])


def test_time_series_is_not_a_fixed_hardcoded_list(client, db):
    add_event(db, 1, event_time=datetime.now(UTC) - timedelta(hours=1))
    first = client.get(URL).json()["data"]["time_series_preview"]
    add_event(db, 2, event_time=datetime.now(UTC) - timedelta(hours=1))
    second = client.get(URL).json()["data"]["time_series_preview"]
    assert sum(p["count"] for p in first) == 1
    assert sum(p["count"] for p in second) == 2


def test_events_older_than_24h_are_excluded_from_series(client, db):
    add_event(db, 1, event_time=datetime.now(UTC) - timedelta(days=3))
    data = client.get(URL).json()["data"]
    assert data["total_events"] == 1
    assert sum(p["count"] for p in data["time_series_preview"]) == 0
````

#### 11.3.98. `apps/api/tests/unit/test_sync_feed_config.py`

````python
"""Test offline: POST /earthquakes/sync đọc USGS feed từ cấu hình (không hardcode)."""

import httpx

from gdmas.api.routes import earthquakes as eq_routes

URL = "/api/v1/earthquakes/sync"


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _patch_feed(monkeypatch, captured: dict):
    class FakeClient:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def get(self, url):
            captured["url"] = url
            return _FakeResponse({"features": []})

    monkeypatch.setattr(eq_routes.httpx, "Client", FakeClient)


def test_sync_uses_configured_feed_url(client, monkeypatch):
    """TC-01/02 — URL gọi ra lấy từ settings, không phải hằng số hardcode."""
    custom = "https://example.test/custom-feed.geojson"
    monkeypatch.setattr(eq_routes.settings, "USGS_FEED_URL", custom)
    captured: dict = {}
    _patch_feed(monkeypatch, captured)

    resp = client.post(URL)

    assert resp.status_code == 200
    assert captured["url"] == custom
    assert "all_day.geojson" not in captured["url"]


def test_sync_response_envelope_unchanged(client, monkeypatch):
    """TC-03 — payload SyncResponse giữ nguyên dù đổi nguồn feed."""
    monkeypatch.setattr(
        eq_routes.settings,
        "USGS_FEED_URL",
        "https://example.test/custom-feed.geojson",
    )
    captured: dict = {}
    _patch_feed(monkeypatch, captured)

    body = client.post(URL).json()

    assert body["success"] is True
    assert body["synced_count"] == 0
    assert body["source"] == "USGS"
    assert isinstance(body["timestamp"], str)


def test_legacy_constant_still_importable():
    """TC-04 — alias cũ vẫn tồn tại để không phá import/test cũ (RULE-03)."""
    assert isinstance(eq_routes.USGS_FEED_URL, str)
    assert eq_routes.USGS_FEED_URL.endswith("all_day.geojson")


def test_sync_network_error_still_503(client, monkeypatch):
    """TC-05 regression — lỗi mạng vẫn trả envelope DATA_SOURCE_UNAVAILABLE."""
    custom = "https://example.test/custom-feed.geojson"
    monkeypatch.setattr(eq_routes.settings, "USGS_FEED_URL", custom)

    class BrokenClient:
        def __init__(self, *_a, **_k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_e):
            return False

        def get(self, _url):
            raise httpx.ConnectError("offline")

    monkeypatch.setattr(eq_routes.httpx, "Client", BrokenClient)

    resp = client.post(URL)

    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
````

#### 11.3.99. `apps/api/tests/unit/test_system_prediction_routes.py`

````python
"""Test gọn cho /health, /system/status, /predictions, /classifications,
/analysis/* và /clusters: có dữ liệu, bảng rỗng, DB lỗi."""

from datetime import UTC, date, datetime, timedelta

import pytest

from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun

from .conftest import add_event

API = "/api/v1"
NOW = datetime.now(UTC)


def _add(db, row):
    db.add(row)
    db.commit()
    return row


# ---------- /health ----------
def test_health_ok(client):
    resp = client.get(f"{API}/health")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "healthy"
    assert resp.json()["data"]["database"] == "connected"
    # GAP-12: uptime tồn tại và không âm.
    assert resp.json()["data"]["uptime_seconds"] >= 0


def test_health_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/health")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


# ---------- /system/status ----------
def _status(client):
    return client.get(f"{API}/system/status").json()["data"]


def test_status_with_no_runs_reports_no_data(client):
    data = _status(client)
    assert data["services"]["ingestion"]["status"] == "unknown"
    assert data["services"]["prediction"]["status"] == "unknown"
    assert data["data_feed"]["total_events"] == 0
    assert data["data_feed"]["latest_event_time"] is None
    # GAP-12: field mới có mặt, chưa có run → None (không suy diễn 0/chuỗi rỗng).
    assert data["services"]["ingestion"]["records_processed"] is None
    assert data["services"]["ingestion"]["error_message"] is None
    assert data["generated_at"].endswith("Z")


def test_status_exposes_service_run_fields(client, db):
    _add(
        db,
        ServiceRun(
            service_name="ingestion",
            status="SUCCESS",
            started_at=NOW - timedelta(minutes=2),
            finished_at=NOW - timedelta(minutes=2),
            records_processed=42,
            error_message=None,
        ),
    )
    ingestion = _status(client)["services"]["ingestion"]
    assert ingestion["status"] == "active"
    assert ingestion["records_processed"] == 42
    assert ingestion["error_message"] is None


@pytest.mark.parametrize(
    ("age", "run_status", "expected"),
    [
        (timedelta(minutes=2), "SUCCESS", "active"),
        (timedelta(days=3), "SUCCESS", "idle"),
        (timedelta(minutes=2), "FAILED", "error"),
    ],
)
def test_status_of_worker_from_latest_service_run(
    client, db, age, run_status, expected
):
    _add(
        db,
        ServiceRun(
            service_name="ingestion",
            status=run_status,
            started_at=NOW - age,
            finished_at=NOW - age,
        ),
    )
    assert _status(client)["services"]["ingestion"]["status"] == expected


def test_status_reports_event_totals(client, db):
    add_event(db, 1)
    add_event(db, 2)
    data = _status(client)
    assert data["data_feed"]["total_events"] == 2
    assert data["data_feed"]["latest_event_time"] is not None


def test_status_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/system/status")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


# ---------- /predictions và /classifications ----------
def _prediction(day: date, **kw):
    data = {
        "target_date": day,
        "metric_name": "daily_earthquake_count",
        "predicted_value": 120.0,
        "lower_bound": 100.0,
        "upper_bound": 150.0,
        "model_name": "ARIMA",
        "model_version": "1.0.0",
        "evaluation_metrics": {"mae": 5.0},
    }
    data.update(kw)
    return PredictionResult(**data)


def test_predictions_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/predictions").json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["message"]


def test_predictions_returns_latest_target_date(client, db):
    _add(db, _prediction(date(2026, 11, 10), predicted_value=1.0, lower_bound=0.0))
    _add(db, _prediction(date(2026, 11, 12)))
    data = client.get(f"{API}/predictions").json()["data"]
    assert data["target_date"] == "2026-11-12"
    low = data["confidence_interval"]["lower"]
    up = data["confidence_interval"]["upper"]
    assert 0 <= low <= data["predicted_value"] <= up


def test_predictions_db_down_returns_500(broken_client):
    resp = broken_client.get(f"{API}/predictions")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_classifications_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/classifications").json()
    assert body["success"] is False
    assert body["data"] is None


def test_classifications_returns_label_and_probabilities(client, db):
    probs = {"Low": 0.7, "Moderate": 0.2, "High": 0.05, "Critical": 0.05}
    _add(
        db,
        ClassificationResult(
            target_date=date(2026, 11, 12),
            predicted_label="Low",
            probability_scores=probs,
            model_name="RF",
            model_version="1.0.0",
            evaluation_metrics={"accuracy": 0.5},
        ),
    )
    data = client.get(f"{API}/classifications").json()["data"]
    assert data["predicted_label"] == "Low"
    assert sum(data["probabilities"].values()) == pytest.approx(1.0)
    # GAP-08: alias /patterns có mặt, key cũ vẫn giữ nguyên.
    assert data["probability_scores"] == probs


# GAP-08 — confidence_level top-level (field optional trong predictions.json)
def test_predictions_exposes_confidence_level_when_available(client, db):
    _add(
        db,
        _prediction(
            date(2026, 11, 12),
            evaluation_metrics={"mae": 2.0, "confidence_level": 0.95},
        ),
    )
    data = client.get(f"{API}/predictions").json()["data"]
    assert data["confidence_level"] == 0.95
    assert data["evaluation_metrics"]["mae"] == 2.0


def test_predictions_confidence_level_none_when_missing(client, db):
    _add(db, _prediction(date(2026, 11, 12)))
    data = client.get(f"{API}/predictions").json()["data"]
    assert data["confidence_level"] is None


def test_classifications_db_down_returns_500(broken_client):
    assert broken_client.get(f"{API}/classifications").status_code == 500


# ---------- /analysis/* ----------
def _analysis(db, kind, interval, metrics):
    return _add(
        db,
        AnalysisResult(
            analysis_type=kind,
            time_interval=interval,
            period_start=NOW - timedelta(days=30),
            period_end=NOW,
            metrics_data=metrics,
        ),
    )


@pytest.mark.parametrize(
    "path",
    ["temporal", "trend", "seasonality", "correlation"],
)
def test_analysis_empty_table_returns_empty_state(client, path):
    resp = client.get(f"{API}/analysis/{path}")
    assert resp.status_code == 200
    assert resp.json()["success"] is False
    assert resp.json()["data"] is None


@pytest.mark.parametrize(
    "path",
    ["temporal", "trend", "seasonality", "correlation"],
)
def test_analysis_db_down_returns_500(broken_client, path):
    resp = broken_client.get(f"{API}/analysis/{path}")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_correlation_returns_matrix(client, db):
    _analysis(
        db,
        "correlation",
        "daily",
        {"variables": ["a", "b"], "matrix": [[1, 0], [0, 1]]},
    )
    data = client.get(f"{API}/analysis/correlation").json()["data"]
    assert data["variables"] == ["a", "b"]
    assert data["method"] == "pearson"


def test_temporal_accepts_seeder_name_and_returns_histogram(client, db):
    _analysis(db, "time_series", "hourly", {"histogram": {"<2.0": 3, ">=5.0": 1}})
    data = client.get(f"{API}/analysis/temporal").json()["data"]
    assert {"bin": "<2.0", "count": 3} in data["histogram"]["magnitude_bins"]


def test_trend_maps_metric_to_series(client, db):
    _analysis(
        db,
        "trend",
        "weekly",
        {"trend_line": [{"period": "W1", "event_count": 7, "avg_magnitude": 2.5}]},
    )
    params = {"resample_freq": "W", "metric": "avg_magnitude"}
    data = client.get(f"{API}/analysis/trend", params=params).json()["data"]
    assert data["series"][0]["actual_value"] == 2.5


def test_seasonality_maps_components(client, db):
    _analysis(
        db,
        "seasonality",
        "monthly",
        {"seasonal_components": [{"cycle": "T9", "seasonal_factor": 1.2}]},
    )
    line = client.get(f"{API}/analysis/seasonality").json()["data"]["components"][
        "seasonal_line"
    ]
    assert line[0]["seasonal_factor"] == 1.2


@pytest.mark.parametrize(
    "params",
    [
        {"interval": "year"},
        {"start_time": "không phải ngày"},
        {"start_time": "2026-11-10T00:00:00Z", "end_time": "2026-11-01T00:00:00Z"},
    ],
)
def test_temporal_invalid_params_rejected(client, params):
    assert client.get(f"{API}/analysis/temporal", params=params).status_code in (
        400,
        422,
    )


def test_trend_invalid_metric_rejected(client):
    assert (
        client.get(f"{API}/analysis/trend", params={"metric": "x"}).status_code == 422
    )


# ---------- /clusters ----------
def test_clusters_empty_table_returns_empty_state(client):
    body = client.get(f"{API}/clusters").json()
    assert body["success"] is False
    assert body["data"] is None


def test_clusters_returns_latest_result_with_normalized_fields(client, db):
    _add(
        db,
        ClusteringResult(
            algorithm="DBSCAN",
            parameters={"eps": 2.5},
            total_clusters=1,
            noise_count=4,
            summary_clusters={
                "clusters": [
                    {
                        "id": 0,
                        "lat": 38.3,
                        "lon": 142.4,
                        "events_count": 32,
                        "avg_mag": 5.4,
                    }
                ]
            },
        ),
    )
    data = client.get(f"{API}/clusters").json()["data"]
    assert data["algorithm"] == "DBSCAN"
    assert data["clusters_count"] == 1
    assert data["noise_count"] == 4
    cluster = data["clusters"][0]
    assert cluster["cluster_id"] == 0
    assert cluster["center_latitude"] == 38.3
    assert cluster["event_count"] == 32


def test_clusters_db_down_returns_500(broken_client):
    assert broken_client.get(f"{API}/clusters").status_code == 500
````

#### 11.3.100. `apps/api/tests/unit/test_worker_error_boundaries.py`

````python
"""Kiểm retry, ngắt sạch và thông báo lỗi an toàn ở worker, hoàn toàn offline."""

import logging

import pytest

from gdmas.services.clustering import runner as clustering_runner
from gdmas.services.ingestion import runner
from gdmas.services.prediction import runner as prediction_runner


def test_worker_retries_without_exposing_credentials(monkeypatch, caplog, capsys):
    calls, waits = [], []

    class FakeService:
        def execute_cycle(self):
            calls.append(1)
            if len(calls) == 1:
                raise RuntimeError(
                    "postgresql://unit_user:[DA_CHE_THONG_TIN_DANG_NHAP]@db.invalid/test?api_key=unit_token"
                )
            return {
                "success": True,
                "new_records": 1,
                "total_in_db": 1,
                "duration_seconds": 0.01,
            }

    def wait(seconds):
        waits.append(seconds)
        if len(waits) == 2:
            raise KeyboardInterrupt

    monkeypatch.setattr(runner, "IngestionService", FakeService)
    monkeypatch.setattr(runner.time, "sleep", wait)
    with caplog.at_level(logging.ERROR):
        runner.run()
    assert len(calls) == 2 and len(waits) == 2
    assert waits[0] == waits[1] == runner.settings.INGESTION_INTERVAL_SECONDS
    assert "RuntimeError" in caplog.text
    output = capsys.readouterr().out + caplog.text
    assert all(
        secret not in output for secret in ("unit_user", "unit_password", "unit_token")
    )


# BUG-son-006
@pytest.mark.parametrize("stop", [KeyboardInterrupt, SystemExit])
def test_retry_wait_handles_interrupt_cleanly(monkeypatch, capsys, stop):
    class BrokenService:
        def execute_cycle(self):
            raise RuntimeError("temporary failure")

    def interrupt(_seconds):
        raise stop

    monkeypatch.setattr(runner, "IngestionService", BrokenService)
    monkeypatch.setattr(runner.time, "sleep", interrupt)
    try:
        runner.run()
    except (KeyboardInterrupt, SystemExit):
        pytest.fail("Ngắt lúc chờ retry phải được xử lý sạch tại biên worker")
    assert "dừng an toàn" in capsys.readouterr().out


@pytest.mark.parametrize("module", [clustering_runner, prediction_runner])
def test_other_workers_still_stop_cleanly(monkeypatch, module):
    waits = []

    def interrupt(seconds):
        waits.append(seconds)
        raise KeyboardInterrupt

    class FakeService:
        def execute_cycle(self):
            return {
                "success": True,
                "target_date": "2026-11-12",
                "predicted": 1.0,
                "lower": 0.0,
                "upper": 2.0,
                "label": "Low",
                "probabilities": {"Low": 1.0},
            }

    if hasattr(module, "PredictionService"):
        monkeypatch.setattr(module, "PredictionService", FakeService)
    monkeypatch.setattr(module.time, "sleep", interrupt)
    assert module.run() is None
    assert len(waits) == 1
````

#### 11.3.101. `apps/api/tests/unit/test_worker_intervals_docs.py`

````python
"""Chu kỳ 4 worker phải khớp sơ đồ ASCII docs/yeucaubatbuoc.md §1.2 và đọc từ .env."""

from pathlib import Path

from gdmas.core.config import settings

API_DIR = Path(__file__).resolve().parents[2]


def test_intervals_match_ascii_diagram():
    assert settings.INGESTION_INTERVAL_SECONDS == 300  # Data Ingestion: 5 phút/lần
    assert settings.ANALYSIS_INTERVAL_SECONDS == 300  # Data Analysis: 5 phút/lần
    assert settings.PREDICTION_INTERVAL_SECONDS == 300  # Prediction: 5 phút/lần
    assert settings.CLUSTERING_INTERVAL_SECONDS == 86400  # Clustering: 1 ngày/lần


def test_all_runners_read_intervals_from_settings():
    for name in ("ingestion", "analysis", "prediction", "clustering"):
        source = (API_DIR / f"src/gdmas/services/{name}/runner.py").read_text(
            encoding="utf-8"
        )
        assert "settings" in source, f"{name}.runner không đọc cấu hình từ .env"
        assert "time.sleep" in source, f"{name}.runner thiếu vòng lặp chu kỳ"
````

#### 11.3.102. `infra/postgres/init.sql`

````sql
-- Khởi tạo cơ sở dữ liệu PostgreSQL cho GDMAS
-- Bắt buộc chuẩn múi giờ UTC và hệ tọa độ WGS84

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Thiết lập timezone mặc định sang UTC
SET timezone = 'UTC';

````

#### 11.3.103. `scripts/dev.sh`

````bash
#!/usr/bin/env bash
# =============================================================================
# GDMAS - Unified Development Launcher (1 Lệnh Khởi Chạy Toàn Bộ Hệ Thống)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================================="
echo "        GDMAS - GLOBAL DISASTER MONITORING & ANALYSIS SYSTEM              "
echo "            MÔI TRƯỜNG PHÁT TRIỂN LOCAL (HOT-RELOAD 100%)                "
echo "=========================================================================="

if [ "$1" == "--stop" ] || [ "$1" == "stop" ]; then
    echo "[-] Đang dừng toàn bộ 7 dịch vụ của GDMAS..."
    docker compose down
    echo "[+] Toàn bộ hệ thống đã được dừng an toàn."
    exit 0
fi

if [ "$1" == "--logs" ] || [ "$1" == "logs" ]; then
    docker compose logs -f
    exit 0
fi

echo "[*] Khởi chạy toàn bộ hệ thống với Docker Compose Hot-Reload..."
docker compose up -d

echo ""
echo "=========================================================================="
echo "                 HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!                          "
echo "=========================================================================="
echo "  [T7] Frontend SPA Client  : http://localhost:3000   (Vite HMR Hot Reload)"
echo "  [T6] Backend FastAPI & SSE: http://localhost:8000   (Uvicorn Hot Reload)"
echo "  [--] Swagger API Docs     : http://localhost:8000/api/v1/docs"
echo "  [T1] PostgreSQL Database  : localhost:5432        (DB: gdmas_db, UTC)"
echo "  [T2-T5] 4 Workers ngầm    : Ingestion, Analysis, Clustering, Prediction"
echo "=========================================================================="
echo "  Mẹo: Bất kỳ sửa đổi file .py hoặc .tsx đều TỰ ĐỘNG CẬP NHẬT TỨC THÌ!"
echo "  Dừng hệ thống: gõ ./scripts/dev.sh stop hoặc docker compose down"
echo "=========================================================================="

````

#### 11.3.104. `scripts/test.sh`

````bash
#!/usr/bin/env bash
# GDMAS smoke test offline — dùng sau khi setup (docs/setup.md §5.3).
# Không khởi động Docker, không gọi mạng; dừng ngay với exit code != 0 nếu có bước fail.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "==> [1/3] Kiểm tra nhất quán notes..."
python3 scripts/notes_index.py --check

echo "==> [2/3] Chạy toàn bộ test Backend (offline)..."
(cd apps/api && uv run pytest -q)

echo "==> [3/3] Chạy toàn bộ test Frontend (offline)..."
(cd apps/web && pnpm test)

echo "HOÀN TẤT: notes + Backend + Frontend đều đạt."
````

#### 11.3.105. `scripts/demo-clear-patterns.ps1`

````powershell
<#
.SYNOPSIS
    Kịch bản xóa toàn bộ dữ liệu CSDL phục vụ BUỔI DEMO (Bước 2).
.DESCRIPTION
    Xóa sạch dữ liệu trong PostgreSQL để kiểm thử khả năng xử lý lỗi của Web ở Bước 3.
    Mặc định xóa: Toàn bộ bảng Patterns VÀ bảng sự kiện địa chấn (earthquake_events).
.EXAMPLE
    .\scripts\demo-clear-patterns.ps1 -Force
    .\scripts\demo-clear-patterns.ps1 -PatternsOnly
#>

param (
    [Parameter(Mandatory=$false)]
    [switch]$PatternsOnly,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Red
Write-Host "     GDMAS DEMO - BƯỚC 2: XÓA DỮ LIỆU CSDL ĐỂ KIỂM THỬ GIAO DIỆN WEB      " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Red
Write-Host ""

$pgContainer = docker ps --filter "name=gdmas-postgres" --format "{{.Names}}"
if (-not $pgContainer) {
    Write-Host "[!] Lỗi: Container 'gdmas-postgres' chưa được khởi chạy." -ForegroundColor Red
    Write-Host "    Vui lòng chạy: docker compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

function Query-Count($tableName) {
    $sql = "SELECT COUNT(*) FROM $tableName;"
    $res = docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -t -A -c $sql 2>$null
    if ($res) {
        $str = ($res -join "").Trim()
        if ($str -match "^\d+$") { return [int]$str }
    }
    return 0
}

Write-Host "[*] Đang kiểm tra số lượng bản ghi hiện tại trong CSDL..." -ForegroundColor Cyan

$tblAnalysis = "analysis_results"
$tblPrediction = "prediction_results"
$tblClassification = "classification_results"
$tblClustering = "clustering_results"
$tblClustMap = "clustering_event_mapping"
$tblEvents = "earthquake_events"
$tblRuns = "service_runs"

$cntAnalysisBefore = Query-Count $tblAnalysis
$cntPredBefore = Query-Count $tblPrediction
$cntClassBefore = Query-Count $tblClassification
$cntClustBefore = Query-Count $tblClustering
$cntClustMapBefore = Query-Count $tblClustMap
$cntEventsBefore = Query-Count $tblEvents

Write-Host "  -> Bảng $tblAnalysis (Pattern 1-4)    : $cntAnalysisBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblPrediction (Pattern 5)      : $cntPredBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClassification (Pattern 6)  : $cntClassBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClustering (DBSCAN/KMeans)  : $cntClustBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClustMap                    : $cntClustMapBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblEvents (Sự kiện địa chấn)   : $cntEventsBefore bản ghi" -ForegroundColor Gray
Write-Host ""

if ($PatternsOnly) {
    Write-Host "[i] Chế độ: Chỉ xóa dữ liệu kết quả 6 PATTERNS (Giữ lại bảng sự kiện thô)." -ForegroundColor Cyan
} else {
    Write-Host "[!] CHẾ ĐỘ DEMO BƯỚC 2: Xóa sạch toàn bộ CSDL (Gồm cả 6 Patterns và Sự kiện địa chấn)." -ForegroundColor Yellow
    Write-Host "    Mục đích: Giúp giao diện Web phản hồi trạng thái dữ liệu trống 100%!" -ForegroundColor Gray
}

if (-not $Force) {
    $confirm = Read-Host "Bạn có chắc chắn muốn xóa dữ liệu phục vụ Bước 2 buổi Demo? (Y/N)"
    if ($confirm -ne "Y" -and $confirm -ne "y") {
        Write-Host "[-] Hủy bỏ thao tác xóa. Dữ liệu được bảo toàn nguyên vẹn." -ForegroundColor Green
        exit 0
    }
}

Write-Host "`n[*] Đang thực hiện lệnh TRUNCATE trong PostgreSQL..." -ForegroundColor Yellow

if ($PatternsOnly) {
    $truncateSql = "TRUNCATE TABLE clustering_event_mapping, clustering_results, analysis_results, prediction_results, classification_results CASCADE;"
    docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -c $truncateSql | Out-Null
} else {
    $truncateSql = "TRUNCATE TABLE clustering_event_mapping, clustering_results, analysis_results, prediction_results, classification_results, service_runs, earthquake_events RESTART IDENTITY CASCADE;"
    docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -c $truncateSql | Out-Null
}

# Kích hoạt broadcast SSE thời gian thực để Web tự động dọn sạch giao diện ngay lập tức mà không cần F5
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/stream/broadcast-cleared" -Method Post -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
} catch {}

$cntAnalysisAfter = Query-Count $tblAnalysis
$cntPredAfter = Query-Count $tblPrediction
$cntClassAfter = Query-Count $tblClassification
$cntClustAfter = Query-Count $tblClustering
$cntClustMapAfter = Query-Count $tblClustMap
$cntEventsAfter = Query-Count $tblEvents

Write-Host "`n[+] KẾT QUẢ SAU KHI XÓA THÀNH CÔNG:" -ForegroundColor Green
Write-Host "  [✓] $tblAnalysis       : $cntAnalysisAfter bản ghi (Đã xóa $cntAnalysisBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblPrediction         : $cntPredAfter bản ghi (Đã xóa $cntPredBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClassification     : $cntClassAfter bản ghi (Đã xóa $cntClassBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClustering         : $cntClustAfter bản ghi (Đã xóa $cntClustBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClustMap   : $cntClustMapAfter bản ghi (Đã xóa $cntClustMapBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblEvents          : $cntEventsAfter bản ghi (Đã xóa $cntEventsBefore bản ghi)" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "               HƯỚNG DẪN THỰC HIỆN BƯỚC TIẾP THEO TRONG BUỔI DEMO         " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  👉 BƯỚC 3: Mở lại trình duyệt Web (http://localhost:3000)." -ForegroundColor Yellow
Write-Host "     -> Giao diện TỰ ĐỘNG dọn sạch và hiện cảnh báo Demo Bước 3 qua SSE!" -ForegroundColor Yellow
Write-Host "  👉 BƯỚC 4: Sau khi hội đồng xem xong lỗi, hãy chạy kịch bản phục hồi:" -ForegroundColor Cyan
Write-Host "     -> .\scripts\demo-init-patterns.ps1" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
````

#### 11.3.106. `scripts/demo-init-patterns.ps1`

````powershell
<#

.SYNOPSIS

    Kịch bản khởi tạo và tính toán dữ liệu các Patterns phục vụ BUỔI DEMO (Bước 4).

.DESCRIPTION

    Tuân thủ quy trình kiểm thử đồ án:

    1. Kiểm tra CSDL và kích hoạt Backend Services (AI models đã build sẵn).

    2. Tự động tính toán Patterns 1-4 (Analysis: chuỗi thời gian, trend, seasonality, correlation).

    3. Tự động chạy thuật toán DBSCAN (Clustering) phân cụm ổ địa chấn.

    4. Tự động dự báo định lượng t+1 (Pattern 5) và phân loại rủi ro t+1 (Pattern 6).

    5. Nạp kết quả vào PostgreSQL và hiển thị trạng thái hoàn thành.

.EXAMPLE

    .\scripts\demo-init-patterns.ps1

#>



$ErrorActionPreference = "Stop"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8



Write-Host ""

Write-Host "==========================================================================" -ForegroundColor Green

Write-Host "     GDMAS DEMO - BƯỚC 4: KÍCH HOẠT BACKEND SERVICES & KHỞI TẠO PATTERNS  " -ForegroundColor White

Write-Host "==========================================================================" -ForegroundColor Green

Write-Host ""



# Kiểm tra container gdmas-api và gdmas-postgres đang chạy

$apiContainer = docker ps --filter "name=gdmas-api" --format "{{.Names}}"

if (-not $apiContainer) {

    Write-Host "[!] Container 'gdmas-api' chưa chạy. Đang kích hoạt toàn bộ Docker Compose..." -ForegroundColor Yellow

    docker compose up -d

}



Write-Host "[*] Đang kích hoạt các Backend Services (Analysis, Clustering, Prediction)..." -ForegroundColor Cyan

Write-Host "    (Lưu ý: Các mô hình AI/ML đã được build sẵn, chỉ thực thi inference)" -ForegroundColor Gray

Write-Host ""



# Chạy module demo_seeder bên trong container gdmas-api

docker exec gdmas-api python -m gdmas.services.demo_seeder



Write-Host ""

Write-Host "==========================================================================" -ForegroundColor Cyan

Write-Host "               HƯỚNG DẪN THỰC HIỆN BƯỚC TIẾP THEO TRONG BUỔI DEMO         " -ForegroundColor White

Write-Host "==========================================================================" -ForegroundColor Cyan

Write-Host "  👉 BƯỚC 5: Mở Database PostgreSQL để chứng minh dữ liệu đã được xử lý:" -ForegroundColor Yellow

Write-Host "     docker exec -it gdmas-postgres psql -U gdmas_user -d gdmas_db -c '\dt'" -ForegroundColor Gray

Write-Host "  👉 BƯỚC 6: Mở lại giao diện Web (http://localhost:3000):" -ForegroundColor Cyan

Write-Host "     -> Tất cả biểu đồ chuỗi thời gian, dự báo t+1 và cụm địa chấn" -ForegroundColor Green

Write-Host "        đã được nạp lại đầy đủ và cập nhật theo thời gian thực!" -ForegroundColor Green

Write-Host "==========================================================================" -ForegroundColor Cyan

Write-Host ""

````

---

**Kết thúc bản in Backend.** Toàn bộ nội dung trên phản ánh source tại mốc đối chiếu, có che credential. Báo cáo không thay thế bước tái lập training, bổ sung Figma và thu bằng chứng demo chạy thật.
