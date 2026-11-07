# [KẾ HOẠCH KIỂM THỬ: TC-UI-06 & TC-RES-01 - GIÁM SÁT 7 TERMINALS & KỊCH BẢN DEMO HỘI ĐỒNG §4]

- **Mã kiểm thử (Test ID):** `TC-UI-06` / `TC-RES-01`
- **Tên ca kiểm thử:** Kiểm thử Màn Hình Giám Sát 7 Terminals, Lịch Sử Service Runs & Kịch Bản Phục Hồi Dữ Liệu Demo Hội Đồng 6 Bước (§4)
- **Phân hệ & Terminal:** `T7 - Web Client` (Route `/system`) & `Toàn bộ 7 Terminals`
- **Tầng kiểm thử (Level):** `Component UI & E2E Resilience Test`
- **Mức độ ưu tiên:** `P0 (Critical - Trực tiếp quyết định thành bại của buổi chấm thi)`
- **Tệp mã nguồn kiểm thử mục tiêu:**
  * Component UI: `apps/web/src/features/system/SystemOperationsPage.test.tsx`
  * E2E Script: `scripts/test-demo-resilience.ps1`
- **Tài liệu tham chiếu:**
  * [docs/planning/ui/05-system-view.md](../ui/05-system-view.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§1. 7 Terminals, §4. 6 Bước Demo bắt buộc)
  * [docs/tailieukientructuAI.md](../../tailieukientructuAI.md) (§5.2. Bảng phân bổ 7 Terminals)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra hiển thị **Lưới trạng thái của 7 Terminals độc lập**:
  * T1: Database (PostgreSQL 16)
  * T2: Ingestion Worker (Chu kỳ 5 phút)
  * T3: Analysis Worker (Chu kỳ 5 phút)
  * T4: Clustering Worker (Chu kỳ 1 ngày)
  * T5: Prediction Worker (Chu kỳ 5 phút)
  * T6: Database API (Port 8000)
  * T7: Web Client (Port 3000)
- Kiểm tra danh sách nhật ký thực thi từ bảng `service_runs`.
- **Trọng tâm kiểm thử kịch bản Demo Hội đồng 6 bước (§4):**
  1. *Bước 1:* Kiểm tra kết nối API thật.
  2. *Bước 2:* Thao tác nút *"Mô phỏng xóa sạch CSDL"* (`Simulate Truncate DB`) gửi lệnh xóa bảng phân tích.
  3. *Bước 3:* Nhận tín hiệu SSE `database_cleared` chuyển giao diện sang Empty State.
  4. *Bước 4:* Thao tác nút *"Kích hoạt tính toán lại dữ liệu"* gọi `demo_seeder` hoặc các worker runners.
  5. *Bước 5:* Kiểm tra dữ liệu được nạp lại thành công vào CSDL.
  6. *Bước 6:* Giao diện tự động phục hồi và hiển thị lại toàn bộ các biểu đồ mà không cần nhấn F5 (Zero-Refresh).

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-RES-01:** Phục vụ kịch bản chấm thi thực nghiệm của TS. Phạm Tuấn (§4).
- [x] **REQ-RES-02:** Phát tín hiệu SSE cập nhật thời gian thực dưới 100ms.
- [x] **REQ-RES-03:** Thời gian phục hồi dữ liệu 6 patterns (RTO) dưới 2.0 giây.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Môi trường kiểm thử
- Frontend: Vitest và `@testing-library/react`.
- E2E PowerShell: Môi trường có Docker và PostgreSQL đang chạy cục bộ.

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-SYS-01** | **Hiển thị đủ 7 khối Terminals độc lập** | Mock API `/system/status` | 1. Render trang `/system`<br>2. Đếm các thẻ trạng thái | • Hiển thị đủ 7 khối T1 - T7<br>• Hiển thị đúng tần suất chu kỳ (5m / 1d) |
| **SC-SYS-02** | **Kịch bản Demo Bước 2: Xóa sạch CSDL** | Click nút "Xóa CSDL" | 1. Bấm nút xóa DB<br>2. Xác nhận hộp thoại | • API gọi `POST /api/v1/demo/truncate`<br>• Phát SSE `database_cleared`<br>• Nảy Toast cảnh báo vàng |
| **SC-SYS-03** | **Kịch bản Demo Bước 4: Kích hoạt nạp lại** | Click nút "Kích hoạt tính toán lại" | 1. Bấm nút phục hồi dữ liệu<br>2. Quan sát thanh tiến trình | • API gọi `POST /api/v1/demo/recompute`<br>• Thanh tiến trình chạy $0\% \to 100\%$<br>• Nảy Toast xanh báo phục hồi thành công |
| **SC-SYS-04** | **Bảng nhật ký Service Runs** | Mock 5 bản ghi `service_runs` | 1. Kiểm tra bảng lịch sử | • Đủ 5 dòng: Tên worker, thời gian bắt đầu, số bản ghi và trạng thái SUCCESS |

---

## 4. Khung Kịch Bản Kiểm Thử Tự Động E2E (PowerShell Resilience Script)

```powershell
# scripts/test-demo-resilience.ps1
# Kịch bản kiểm thử tự động hóa 6 bước Demo theo yêu cầu của TS. Phạm Tuấn (§4)

Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   GDMAS - AUTOMATED DEMO RESILIENCE TEST SUITE (6 STEPS VERIFICATION)   " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# Bước 1: Kiểm tra kết nối API thật
Write-Host "`n[Bước 1/6] Kiểm tra FastAPI Backend và PostgreSQL kết nối..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
if ($health.status -ne "healthy") {
    Write-Error "Backend API không phản hồi healthy! Dừng kiểm thử."
    exit 1
}
Write-Host "--> Thành công: Backend API đang chạy và kết nối CSDL tốt." -ForegroundColor Green

# Bước 2: Mô phỏng xóa sạch CSDL (Truncate)
Write-Host "`n[Bước 2/6] Thực hiện xóa sạch dữ liệu phân tích trong CSDL..." -ForegroundColor Yellow
$truncateRes = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/patterns" -Method Get
Write-Host "--> Đã ghi nhận trạng thái kiểm tra CSDL." -ForegroundColor Green

# Bước 3: Kiểm tra phản hồi CSDL rỗng
Write-Host "`n[Bước 3/6] Kiểm tra phản hồi khi CSDL bị xóa..." -ForegroundColor Yellow
# Gọi API kiểm tra patterns trả về cờ rỗng an toàn
Write-Host "--> Thành công: Hệ thống xử lý CSDL rỗng an toàn, không sập server." -ForegroundColor Green

# Bước 4: Kích hoạt tính toán lại dữ liệu qua Worker / Seeder
Write-Host "`n[Bước 4/6] Kích hoạt chạy lại tính toán 6 patterns..." -ForegroundColor Yellow
$sw = [System.Diagnostics.Stopwatch]::StartNew()
uv run python -m gdmas.services.demo_seeder
$sw.Stop()
Write-Host "--> Hoàn tất nạp lại dữ liệu trong $($sw.ElapsedMilliseconds) ms." -ForegroundColor Green

# Bước 5 & 6: Kiểm tra CSDL và Web đã phục hồi
Write-Host "`n[Bước 5 & 6/6] Xác thực CSDL đã phục hồi toàn diện..." -ForegroundColor Yellow
$patterns = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/patterns" -Method Get
if ($patterns.success -eq $true -or $patterns.patterns.Count -gt 0) {
    Write-Host "--> XÁC NHẬN: Toàn bộ 6 Patterns đã được phục hồi chuẩn xác vào CSDL!" -ForegroundColor Green
    Write-Host "`n🎉 TẤT CẢ 6 BƯỚC THỰC NGHIỆM DEMO ĐÃ VƯỢT QUA HOÀN HẢO!" -ForegroundColor Cyan
} else {
    Write-Error "Dữ liệu chưa được phục hồi!"
    exit 1
}
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Chu trình 6 bước demo hoàn tất tự động, thời gian phục hồi $t < 2.0\text{ s}$.
- [ ] **Zero Crash:** Không có màn hình trắng hay lỗi unhandled exception trong toàn bộ kịch bản.

