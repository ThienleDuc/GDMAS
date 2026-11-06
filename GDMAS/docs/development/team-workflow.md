# QUY TRÌNH PHỐI HỢP NHÓM VÀ VẬN HÀNH PHÁT TRIỂN (TEAM WORKFLOW)

# HỆ THỐNG GIÁM SÁT VÀ PHÂN TÍCH THIÊN TAI TOÀN CẦU (GDMAS)

- **Mục tiêu:** Thống nhất quy trình phối hợp, phân công trách nhiệm, quản lý nhánh, kiểm thử và nghiệm thu sản phẩm giữa toàn bộ các thành viên phát triển GDMAS.
- **Nguyên tắc xuyên suốt:** **Không sửa mã nguồn hiện có – Chỉ bổ sung thêm mới (Open-Closed Principle)**.

---

## Mục lục
1. [Phân công Trách nhiệm & Vai trò](#1-phân-công-trách-nhiệm--vai-trò)
2. [Quy trình Phát triển từ Task đến Bàn giao](#2-quy-trình-phát-triển-từ-task-đến-bàn-giao)
3. [Quy trình Vận hành 7 Khối Dịch vụ Độc lập trên 7 Terminals](#3-quy-trình-vận-hành-7-khối-dịch-vụ-độc-lập-trên-7-terminals)
4. [Quy chuẩn Pull Request & Đánh giá Mã nguồn (Code Review)](#4-quy-chuẩn-pull-request--đánh-giá-mã-nguồn-code-review)
5. [Tiêu chuẩn Nghiệm thu Hoàn thành (Definition of Done - DoD)](#5-tiêu-chuẩn-nghiệm-thu-hoàn-thành-definition-of-done---dod)
6. [Cơ chế Giao tiếp & Giải quyết Xung đột Kỹ thuật](#6-cơ-chế-giao-tiếp--giải-quyết-xung-đột-kỹ-thuật)

---

## 1. Phân công Trách nhiệm & Vai trò

Dự án áp dụng mô hình phân tách trách nhiệm rõ ràng theo các khối dịch vụ:

| Vai trò thành viên | Phạm vi phụ trách chính | Khối Service đảm nhiệm |
| :--- | :--- | :--- |
| **Tech Lead / Database** | Kiến trúc tổng thể, hạ tầng PostgreSQL, Docker Compose, Alembic migrations | `Terminal 1: PostgreSQL` |
| **Backend Ingestion & API**| Thu thập dữ liệu USGS (chu kỳ 5p), xây dựng REST API FastAPI và SSE | `Terminal 2: Ingestion`<br>`Terminal 6: Database API` |
| **Data Analysis Engineer** | Xử lý Time-Series: Pattern 1 (Temporal), Pattern 2 (Trend), Pattern 3 (Seasonality), Pattern 4 (Correlation) | `Terminal 3: Data Analysis` (chu kỳ 5p) |
| **Machine Learning Engineer**| Phân cụm không gian (Clustering - chu kỳ 1 ngày), Dự báo định lượng $t+1$ (Pattern 5), Phân loại $t+1$ (Pattern 6) | `Terminal 4: Clustering`<br>`Terminal 5: Prediction` (chu kỳ 5p) |
| **Frontend UI/UX Engineer**| Phát triển giao diện React/Vite, bản đồ tương tác, hiển thị trực quan thẩm mỹ trọn vẹn 6 patterns, bộ lọc thời gian | `Terminal 7: Frontend Web` |

### Nguyên tắc phân công:
- Mỗi task chỉ có **duy nhất 01 người chịu trách nhiệm chính (Assignee)**.
- Người phụ trách tự chủ thực hiện, kiểm thử cục bộ và chịu trách nhiệm về chất lượng trước khi mở Pull Request.
- **Tuyệt đối không để hai thành viên cùng sửa vào một tệp mã nguồn** mà không có sự thống nhất trước.

---

## 2. Quy trình Phát triển từ Task đến Bàn giao

Quy trình chuẩn gồm 6 bước khép kín:

```text
[Nhận Task] ──► [Tạo Branch từ develop] ──► [Viết Code Bổ Sung Mới]
                                                     │
                                                     ▼
[Hợp nhất vào develop] ◄── [Code Review & Test Pass] ◄── [Test 7 Terminals & Mở PR]
```

### Bước 1: Tiếp nhận Task & Tạo nhánh mới
- Đọc kỹ yêu cầu và đối chiếu với tài liệu kiến trúc [SAD.md](file:///D:/KHDLKPDL/GDMAS/GDMAS/docs/architecture/SAD.md) và [API.md](file:///D:/KHDLKPDL/GDMAS/GDMAS/docs/api/API.md).
- Kéo mã nguồn mới nhất từ `origin/develop` và tạo nhánh theo quy chuẩn:
  ```bash
  git switch develop
  git pull origin develop
  git switch -c feature/your-feature-name
  ```

### Bước 2: Phát triển theo nguyên tắc Open-Closed
- Không sửa đổi mã nguồn sẵn có của các thành viên khác.
- Tạo file runner mới, router mới hoặc component mới độc lập.
- Thường xuyên commit các thay đổi nhỏ kèm message chuẩn Conventional Commits.

### Bước 3: Kiểm thử độc lập trên máy cục bộ
- Chạy service của mình trên terminal riêng và kiểm tra kết nối với Database PostgreSQL.
- Chạy kiểm thử tự động:
  ```bash
  # Backend
  uv run pytest
  uv run ruff check .

  # Frontend
  pnpm run build
  ```

### Bước 4: Đồng bộ code & Mở Pull Request
- Rebase nhánh của bạn lên đỉnh mới nhất của `develop`:
  ```bash
  git fetch origin
  git rebase origin/develop
  git push -u origin feature/your-feature-name
  ```
- Mở Pull Request hướng vào nhánh đích `develop`.

### Bước 5: Code Review & Phê duyệt
- Thành viên khác hoặc Tech Lead tiến hành review code trong vòng 24 giờ.
- Nếu có yêu cầu chỉnh sửa, tác giả commit bổ sung trên chính nhánh đó.

### Bước 6: Merge & Dọn dẹp
- Sử dụng phương thức **Squash and Merge** trên giao diện GitHub.
- Xóa nhánh feature trên GitHub và xóa nhánh local trên máy.

---

## 3. Quy trình Vận hành 7 Khối Dịch vụ Độc lập trên 7 Terminals

Theo yêu cầu bắt buộc của đồ án, khi kiểm thử tích hợp toàn bộ hệ thống, mỗi thành viên phải mở 7 cửa sổ terminal riêng biệt:

```powershell
# Terminal 1: Khởi động CSDL PostgreSQL
docker compose up postgres

# Terminal 2: Chạy Worker thu thập dữ liệu (Chu kỳ 5 phút/lần)
python -m gdmas.services.ingestion.runner

# Terminal 3: Chạy Worker phân tích chuỗi thời gian (Chu kỳ 5 phút/lần)
python -m gdmas.services.analysis.runner

# Terminal 4: Chạy Worker phân cụm địa chấn (Chu kỳ 1 ngày/lần)
python -m gdmas.services.clustering.runner

# Terminal 5: Chạy Worker dự báo & phân loại t+1 (Chu kỳ 5 phút/lần)
python -m gdmas.services.prediction.runner

# Terminal 6: Khởi động Database API Server (Port 8000)
cd apps/api; uv run uvicorn gdmas.main:app --reload --port 8000

# Terminal 7: Khởi động Frontend Web Client (Port 3000)
cd apps/web; pnpm dev --port 3000
```

> 💡 **Quy tắc vận hành:** Một service gặp sự cố hoặc tạm dừng không được phép kéo theo sự sụp đổ của các service ở terminal khác.

---

## 4. Quy chuẩn Pull Request & Đánh giá Mã nguồn (Code Review)

### Mẫu mô tả Pull Request (PR Template) chuẩn:
Mọi PR gửi lên nhóm phải điền đầy đủ các mục:

```markdown
## 📌 Tóm tắt chức năng bổ sung
- Bổ sung module tính toán phân tích xu hướng sau khi Re-sampling theo tháng (Pattern 2).
- Bổ sung router `/api/v1/analysis/trend` phục vụ frontend.

## 🔗 Liên kết Task / Yêu cầu
Liên quan đến: Pattern 2 (Trend Analysis) trong `yeucaubatbuoc.md`.

## 🧪 Kết quả kiểm thử cục bộ
- [x] Đã chạy độc lập trên Terminal 3 (Data Analysis) thành công.
- [x] Đã chạy unit test `uv run pytest tests/unit/test_trend.py` (PASS 100%).
- [x] Đã kiểm tra Ruff format và Type Hints.

## 📋 Checklist tuân thủ quy ước
- [x] Tuân thủ nguyên tắc Open-Closed (Không sửa mã nguồn hiện có, chỉ bổ sung mới).
- [x] Không đưa thông tin nhạy cảm (.env) lên commit.
- [x] Đã rebase với origin/develop mới nhất.
```

### Tiêu chí phê duyệt (Review Criteria):
- **Bảo toàn mã nguồn:** PR có vô tình sửa đổi, xóa hoặc phá vỡ các hàm/module đang chạy của người khác không?
- **Khả năng chạy độc lập:** Service mới có thể chạy riêng trên terminal mà không phụ thuộc vòng đời của API không?
- **Tiêu chuẩn thẩm mỹ (đối với Frontend):** Biểu đồ có hiển thị rõ ràng, phối màu trực quan và có bộ lọc thời gian tương tác tốt không?

---

## 5. Tiêu chuẩn Nghiệm thu Hoàn thành (Definition of Done - DoD)

### 5.1. DoD cho từng Task
- [ ] Đúng chức năng theo yêu cầu phân công.
- [ ] Tuân thủ nguyên tắc không sửa code cũ, chỉ bổ sung thêm mới.
- [ ] Code có Type Hints, định dạng chuẩn qua Ruff (Python) hoặc ESLint (TypeScript).
- [ ] Đã kiểm thử chức năng và không còn lỗi nghiêm trọng đã biết.
- [ ] Đã tạo Pull Request, vượt qua kiểm thử tự động cục bộ (`scripts/test.sh`) và được ít nhất 1 thành viên review duyệt.

### 5.2. DoD cho từng Service
- [ ] Có entrypoint riêng (file runner độc lập).
- [ ] Chạy độc lập tại một terminal riêng biệt không phụ thuộc service khác.
- [ ] Kết nối đúng PostgreSQL thông qua biến môi trường `DATABASE_URL`.
- [ ] Có logging rõ ràng về thời điểm bắt đầu, chu kỳ và kết thúc.
- [ ] Chạy đúng tần suất quy định (5 phút / 1 ngày).

### 5.3. DoD cho Toàn bộ Hệ thống
- [ ] Toàn bộ 7 khối dịch vụ hoạt động đồng thời trên 7 terminals hoặc qua Docker Compose.
- [ ] Dữ liệu động đất tự động nạp từ USGS mỗi 5 phút, lưu trữ chính xác và khử trùng lặp.
- [ ] **Hiển thị đầy đủ trọn vẹn 6 patterns phân tích Time-Series trên giao diện:**
  1. Biểu diễn thời gian (Line, Scatter, Histogram).
  2. Trend Analysis sau Re-sampling.
  3. Seasonality (Seasonal line).
  4. Correlation Matrix / Heatmap đa biến.
  5. Dự báo định lượng ngày tiếp theo ($t + 1$).
  6. Phân loại mức độ hoạt động địa chấn ngày tiếp theo ($t + 1$).
- [ ] **Giao diện Frontend đạt yêu cầu thẩm mỹ cao**, bản đồ tương tác mượt mà, hỗ trợ lọc khoảng thời gian trực quan.
- [ ] Tài liệu kỹ thuật đầy đủ, đồng bộ tại `docs/` (`API.md`, `ERD.md`, `SAD.md`, `setup.md`).

---

## 6. Cơ chế Giao tiếp & Giải quyết Xung đột Kỹ thuật

- **Báo cáo tiến độ (Daily Standup):** Cập nhật định kỳ 15 phút mỗi ngày:
  1. Hôm qua đã làm xong gì?
  2. Hôm nay sẽ làm gì?
  3. Đang gặp khó khăn hoặc cần ai hỗ trợ?
- **Giải quyết xung đột kỹ thuật:**
  1. Khi có bất đồng về cấu trúc API hoặc bảng cơ sở dữ liệu, ưu tiên đối chiếu tài liệu [API.md](file:///D:/KHDLKPDL/GDMAS/GDMAS/docs/api/API.md) và [ERD.md](file:///D:/KHDLKPDL/GDMAS/GDMAS/docs/architecture/ERD.md).
  2. Tech Lead giữ quyền quyết định cuối cùng dựa trên tiêu chí: *Đơn giản, hoạt động được, không phá vỡ nguyên tắc độc lập của các service*.
  3. Mọi thống nhất kỹ thuật mới phải được cập nhật lại vào tài liệu tương ứng trong thư mục `docs/`.

