# [ĐẶC TẢ CHỨC NĂNG: <TÊN CHỨC NĂNG>]

- **Mã chức năng:** FEAT-0X
- **Mã định danh (Slug):** `<slug-tieng-anh-rut-gon>` (ví dụ: `02-usgs-ingestion`)
- **Terminal đảm nhiệm:** Terminal X - `<Tên Terminal>` (ví dụ: `T2 - Ingestion Worker`)
- **Trạng thái:** `Planning` | `In-Progress` | `Implemented` | `Verified`
- **Mức độ ưu tiên:** `P0 (Bắt buộc)` | `P1 (Quan trọng)` | `P2 (Nâng cao)`
- **Tài liệu tham chiếu:** 
  * `docs/yeucaubatbuoc.md` (§Mục liên quan)
  * `docs/architecture/SAD.md` (§Kiến trúc hệ thống)
  * `docs/architecture/ERD.md` (§Bảng CSDL liên quan)
  * `contracts/` (§Hợp đồng dữ liệu)

---

## 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ (Objectives & Scope)

### 1.1. Bài toán giải quyết
- Mô tả chức năng này làm nhiệm vụ gì và giải quyết vấn đề gì trong bài toán giám sát & phân tích địa chấn toàn cầu.

### 1.2. Phạm vi chức năng (Scope Boundaries)
- **Trong phạm vi (In-Scope):**
  * Những việc chức năng này **chịu trách nhiệm trực tiếp**.
  * Các loại dữ liệu và luồng xử lý do chức năng này đảm nhận.
- **Ngoài phạm vi (Out-of-Scope):**
  * Những việc chức năng này **không làm** (để tránh chồng chéo với các Terminal khác).

---

## 2. Vị Trí Kiến Trúc & Quan Hệ Phụ Thuộc (System Context & Dependencies)

### 2.1. Sơ đồ luồng tương tác (Context Flow)
```mermaid
flowchart LR
    Upstream["Dịch vụ đầu nguồn (Upstream)"] --> ThisFeat["[FEAT-0X] <Chức năng này>"]
    ThisFeat --> Downstream["Dịch vụ tiêu thụ (Downstream)"]
```

### 2.2. Quan hệ phụ thuộc (Dependencies)
- **Dịch vụ phụ thuộc (Upstream):** Chức năng này cần dịch vụ nào chạy trước để có dữ liệu hoạt động? (ví dụ: Cần CSDL T1 sẵn sàng, cần dữ liệu từ T2).
- **Dịch vụ tiêu thụ (Downstream):** Những thành phần nào sẽ đọc kết quả từ chức năng này? (ví dụ: FastAPI T6, React Web T7).

---

## 3. Hợp Đồng Dữ Liệu & Giao Thức (Data Contracts & Schemas)

### 3.1. Dữ liệu đầu vào (Inputs)
- **Nguồn nhận:** (Từ REST API USGS, từ bảng CSDL `earthquake_events`, từ request query, hay từ SSE event).
- **Cấu trúc dữ liệu:** Liệt kê các trường dữ liệu đầu vào bắt buộc kèm kiểu dữ liệu.

### 3.2. Dữ liệu đầu ra (Outputs)
- **Nơi lưu / Phát:** (Lưu vào bảng PostgreSQL nào, phát event SSE nào, hay trả về JSON schema nào).
- **Cấu trúc dữ liệu:** Liệt kê schema Pydantic / TypeScript interface đại diện.

### 3.3. Quy chuẩn bất biến về dữ liệu (Mandatory Data Standards)
- **Múi giờ:** Bắt buộc chuẩn hóa sang múi giờ **UTC** (`TIMESTAMPTZ` trong PostgreSQL / ISO 8601 định dạng `YYYY-MM-DDTHH:mm:ssZ`).
- **Hệ tọa độ:** Bắt buộc chuẩn không gian **WGS84** (`latitude`: [-90, 90], `longitude`: [-180, 180], `depth`: km).

---

## 4. Logic Xử Lý Cốt Lõi & Thuật Toán (Core Processing Logic)

### 4.1. Quy trình xử lý từng bước (Step-by-Step Pipeline)
1. **Bước 1 (Thu nhận / Kích hoạt):** Cách thức kích hoạt (Cron scheduler định kỳ, API request, hay lắng nghe event).
2. **Bước 2 (Xử lý & Biến đổi):** Logic nghiệp vụ cốt lõi, công thức toán học hoặc thuật toán ML/Data Science:
   - *Thuật toán áp dụng:* (ví dụ: DBSCAN $\epsilon, MinPts$, Resampling chuỗi thời gian, hồi quy dự báo $t+1$).
   - *Khử trùng lặp (Deduplication):* Cơ chế ngăn trùng lặp dữ liệu (Unique constraint, UPSERT).
3. **Bước 3 (Lưu trữ & Xuất bản):** Ghi nhận vào DB và phát tín hiệu thông báo (nếu có).

### 4.2. Xử lý lỗi & Tự phục hồi (Error Handling & Resilience)
- Xử lý khi mất kết nối mạng / timeout từ dịch vụ bên ngoài.
- Xử lý khi cơ sở dữ liệu bận hoặc tạm thời ngắt kết nối.
- Chiến lược retry (Exponential backoff) và ghi log lỗi.

---

## 5. Bất Biến Kiến Trúc & Ràng Buộc Kỹ Thuật (Architecture Invariants)

- **Độc lập Terminal (I1):** Chạy trên một terminal riêng biệt thông qua tệp `runner.py` độc lập. **Tuyệt đối cấm nhúng worker vào `apps/api/src/gdmas/main.py`**.
- **Nguyên tắc Open-Closed (I2 - RULE-03):** Viết mã nguồn dưới dạng bổ sung tệp mới, không sửa đổi signature các hàm cũ đang chạy ổn định.
- **Tần suất & Chu kỳ chạy (Frequency/SLA):** (ví dụ: 5 phút/lần đối với Ingestion & Analysis; 1 ngày/lần đối với Clustering; Realtime đối với SSE).
- **Môi trường & Công nghệ sử dụng:** (ví dụ: Python 3.12, `uv`, SQLAlchemy, Pydantic, Scikit-learn / Statsmodels, Vite, Leaflet).

---

## 6. Tiêu Chí Nghiệm Thu & Kiểm Thử (Acceptance Criteria & Test Matrix)

### 6.1. Tiêu chí nghiệm thu chức năng (Functional Acceptance Criteria)
- [ ] **AC-1:** <Mô tả tiêu chí nghiệm thu 1 - Hành vi mong đợi khi dữ liệu hợp lệ>
- [ ] **AC-2:** <Mô tả tiêu chí nghiệm thu 2 - Hành vi khi dữ liệu biên hoặc rỗng>
- [ ] **AC-3:** <Mô tả tiêu chí nghiệm thu 3 - Dữ liệu lưu trữ đúng schema và múi giờ UTC>

### 6.2. Tiêu chí phi chức năng (Non-Functional Acceptance Criteria)
- [ ] Thời gian xử lý không vượt quá ngưỡng cho phép (SLA latency).
- [ ] Không rò rỉ bộ nhớ khi chạy tiến trình dài ngày (Long-running process).
- [ ] Không để lộ thông tin nhạy cảm trong log.

---

## 7. Kế Hoạch Phân Rã Nhiệm Vụ (Task Breakdown Checklist)

### Pha 1: Chuẩn bị CSDL & Hợp đồng dữ liệu
- [ ] Khai báo Schema Pydantic và Model SQLAlchemy (nếu có).
- [ ] Tạo file migration Alembic mới (`uv run alembic revision --autogenerate`).

### Pha 2: Lập trình Logic Cốt Lõi
- [ ] Xây dựng module xử lý logic / thuật toán trong `apps/api/src/gdmas/services/<service>/`.
- [ ] Viết file khởi chạy `runner.py` phục vụ Terminal độc lập.
- [ ] Bổ sung route FastAPI hoặc Component Web (nếu chức năng liên quan).

### Pha 3: Kiểm Thử & Thẩm Định
- [ ] Viết unit test / integration test trong `docs/testing/` hoặc `tests/`.
- [ ] Chạy thẩm định qua `/source-guard` đảm bảo không vi phạm Open-Closed.
- [ ] Kiểm thử thủ công trên môi trường dev cục bộ.

