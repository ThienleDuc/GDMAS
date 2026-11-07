# [KẾ HOẠCH KIỂM THỬ: TC-PAT-04 - GOM CỤM KHÔNG GIAN ĐỊA CHẤN DBSCAN]

- **Mã kiểm thử (Test ID):** `TC-PAT-04`
- **Tên ca kiểm thử:** Kiểm thử Thuật Toán Gom Cụm Mật Độ Không Gian DBSCAN & Lọc Điểm Nhiễu Địa Chấn
- **Phân hệ & Terminal:** `T4 - Clustering Worker` (`python -m gdmas.services.clustering.runner`)
- **Tầng kiểm thử (Level):** `Unit & Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Bắt buộc theo kiến trúc 7 Terminals và SAD §6.3)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_clustering.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/04-spatial-clustering.md](../features/04-spatial-clustering.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§1. Khối Clustering chu kỳ 1 ngày/lần)
  * [docs/api/API.md](../../api/API.md) (§3.4. Endpoints Phân Cụm `/api/v1/clusters`)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra thuật toán **DBSCAN** khi thực hiện phân cụm trên các tọa độ địa lý (Vĩ độ, Kinh độ, Độ sâu chấn tiêu) bằng công thức khoảng cách Haversine hoặc khoảng cách Euclid chuẩn hóa.
- Đảm bảo thuật toán phân tách chính xác:
  * Các chùm sự kiện mật độ cao thành các cụm có nhãn nhị phân / số nguyên (`cluster_label >= 0`).
  * Các sự kiện đơn lẻ phân tán thành điểm nhiễu (`cluster_label = -1` / `noise`).
- Kiểm tra tính toán tâm cụm (`center_latitude`, `center_longitude`), độ lớn cực đại ($M_{max}$) và lưu kết quả vào 2 bảng CSDL: `clustering_results` và `clustering_event_mapping`.
- Đảm bảo chu kỳ chạy 1 ngày/lần được ghi nhật ký vào `service_runs`.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-CLU-01:** Sử dụng DBSCAN với tham số bán kính $\epsilon$ (khoảng $100 - 200$ km) và $MinPts \ge 3$.
- [x] **REQ-CLU-02:** Lưu trữ kết quả phân cụm và ánh xạ sự kiện - cụm vào CSDL PostgreSQL.
- [x] **REQ-CLU-03:** Cung cấp dữ liệu trực quan cho View 04 (`/clusters`).

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- CSDL Test sẵn sàng. Cần có ít nhất 2 nhóm sự kiện phân bố rõ rệt theo địa lý (ví dụ: nhóm 1 tại Nhật Bản, nhóm 2 tại California, Mỹ) và vài điểm nhiễu cô lập giữa đại dương.

### 2.2. Dữ liệu mẫu (Spatial Cluster Fixture)
* Tạo 10 sự kiện quanh tọa độ Tokyo, Nhật Bản ($35.6^\circ\text{N}, 139.6^\circ\text{E}$ bán kính $<50$ km).
* Tạo 8 sự kiện quanh tọa độ Los Angeles, Mỹ ($34.0^\circ\text{N}, -118.2^\circ\text{W}$ bán kính $<50$ km).
* Tạo 3 sự kiện cô lập tại Nam Băng Dương và Thái Bình Dương (khoảng cách $>1.000$ km).

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-CLU-01** | **Phát hiện đúng số cụm và điểm nhiễu** | 10 điểm JP + 8 điểm US + 3 điểm cô lập | 1. Chạy hàm DBSCAN clustering<br>2. Đếm số cụm và số nhiễu | • `total_clusters == 2`<br>• `noise_count == 3`<br>• Các điểm JP gán cùng nhãn cụm 0, điểm US nhãn 1 |
| **SC-CLU-02** | **Tính toán tâm cụm và thống kê cụm** | Dữ liệu cụm Nhật Bản | 1. Trích xuất metadata cụm 0 | • `center_latitude` xấp xỉ $35.6^\circ$<br>• `center_longitude` xấp xỉ $139.6^\circ$<br>• `event_count == 10` |
| **SC-CLU-03** | **Lưu trữ CSDL quan hệ cha - con** | Kết quả phân cụm | 1. Lưu `ClusteringResult`<br>2. Lưu `ClusteringEventMapping` | • `clustering_event_mapping` trỏ đúng `event_id` và `cluster_result_id`<br>• Truy vấn SQL JOIN trả về đúng sự kiện |
| **SC-CLU-04** | **Khả năng chịu lỗi khi CSDL rỗng (Demo §4)** | Bảng sự kiện có 0 bản ghi | 1. Xóa sạch DB<br>2. Chạy clustering runner | • Trả về `total_clusters = 0`, `noise_count = 0`<br>• Không văng lỗi `ValueError` từ Scikit-learn |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_clustering.py
import pytest
import numpy as np
from sklearn.cluster import DBSCAN

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.clustering import ClusteringResult, ClusteringEventMapping


def test_dbscan_algorithm_identifies_clusters_and_noise():
    """Kiểm tra thuật toán DBSCAN phát hiện đúng 2 cụm địa chấn và điểm nhiễu."""
    # 1. Arrange: Tọa độ Nhật Bản (10 điểm), California (8 điểm) và 2 điểm nhiễu
    jp_pts = [[35.6 + np.random.normal(0, 0.1), 139.6 + np.random.normal(0, 0.1)] for _ in range(10)]
    us_pts = [[34.0 + np.random.normal(0, 0.1), -118.2 + np.random.normal(0, 0.1)] for _ in range(8)]
    noise_pts = [[-50.0, 0.0], [0.0, 100.0]]  # Điểm cô lập giữa đại dương

    all_coords = np.radians(np.array(jp_pts + us_pts + noise_pts))

    # 2. Act: Chạy DBSCAN với bán kính Haversine 150km (150 / 6371 radians)
    kms_per_radian = 6371.0088
    epsilon = 150.0 / kms_per_radian
    db = DBSCAN(eps=epsilon, min_samples=3, metric="haversine")
    labels = db.fit_predict(all_coords)

    # 3. Assert
    unique_labels = set(labels)
    assert -1 in unique_labels  # Phải có điểm nhiễu
    clusters = [l for l in unique_labels if l != -1]
    assert len(clusters) == 2  # Phải phát hiện đúng 2 cụm độc lập

    # 10 điểm đầu phải chung 1 cụm
    assert len(set(labels[:10])) == 1
    # 8 điểm tiếp theo phải chung 1 cụm khác
    assert len(set(labels[10:18])) == 1
    assert labels[0] != labels[10]
    # 2 điểm cuối là nhiễu
    assert labels[-1] == -1 and labels[-2] == -1
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** DBSCAN phân nhóm chuẩn xác tọa độ địa lý WGS84, lưu đầy đủ 2 bảng CSDL.
- [ ] **Resilience:** Không bị lỗi khi số lượng sự kiện $< MinPts$ hoặc CSDL rỗng.
- [ ] **Coverage:** `gdmas.services.clustering` đạt độ phủ $\ge 80\%$.

