# Đội ngũ phát triển GDMAS

Nguồn duy nhất về thành viên và định danh (`handle`). `handle` là chuỗi chữ thường dùng trong ID note
(`yyyy-mm-dd-<slug>-<handle>`), mã bug (`BUG-<handle>-NNN`) và tên nhánh (`<type>/<id>`);
`./scripts/git-ship.sh me <handle>` chỉ nhận `handle` có trong bảng này.

| handle | Tên | GitHub | Vai trò | Mảng phụ trách |
|---|---|---|---|---|
| `thien` | Lê Đức Thiện | `ThienleDuc` | **Techlead / Frontend Developer** | Kiến trúc tổng thể, Frontend (`apps/web/`), T7 |
| `son` | Lê Trung Sơn | — | Backend Dev 1 | `FEAT-03`: Time-Series Analysis Worker (`apps/api/src/gdmas/services/analysis/`, T3) |
| `van` | Nguyễn Đình Văn | — | Backend Dev 2 | `FEAT-04`: Spatial Clustering DBSCAN Worker (`apps/api/src/gdmas/services/clustering/`, T4) |
| `tai` | Trần Đức Tài | — | Backend Dev 3 | `FEAT-05`: Seismic Prediction & Risk $t+1$ Worker (`apps/api/src/gdmas/services/prediction/`, T5) |

## Cách AI agent dùng bảng này

- **Nhận diện người đang thao tác:** chạy `./scripts/git-ship.sh me` để đọc `.agents/me` (file cục bộ được `.gitignore`).
  Nếu chưa có, hỏi người dùng một lần (*"Bạn là ai trong danh sách team (`thien`, `son`, `van`, `tai`)?"*), rồi chạy
  `./scripts/git-ship.sh me <handle>`. Không đoán bừa từ `git config user.name` nếu máy dùng chung.
- **Duyệt proposal (§9) — THẢ LỎNG:** bất kỳ thành viên nào trong bảng này (kể cả **tác giả tự duyệt** hoặc đồng đội bất kỳ)
  đều có thể ký `Decision: Approved` tại `## 9. Human Review` của proposal. **Không yêu cầu `thien` (`ThienleDuc`) phải đồng ý ở bước proposal.**
- **Merge Pull Request — CHỈ CẦN KHÔNG XUNG ĐỘT:** Không bắt buộc phải là `ThienleDuc` (`thien`) mới được phép merge PR vào `develop`.
  Bất kỳ thành viên nào (hoặc chạy `./scripts/git-ship.sh merge` khi được yêu cầu) đều được phép merge PR miễn đã **kiểm tra không có xung đột (`0 conflicts`)**, `notes_index.py --check` và validation đạt chuẩn.
- **Chủ vùng (Area Owner):** khi thay đổi hoặc xung đột chạm vùng phụ trách của thành viên khác hoặc vùng hạ tầng dùng chung (`contracts/`, `apps/api/alembic/`, `apps/api/src/gdmas/main.py`), ghi rõ tên chủ vùng vào mô tả PR để nhóm nắm trước khi merge.

