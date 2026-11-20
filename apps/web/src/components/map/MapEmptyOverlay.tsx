/** Overlay khi DB rỗng — bản đồ vẫn nạp, tuyệt đối không fallback mock (I5). */
export function MapEmptyOverlay() {
  return (
    <div className="gm-map__overlay" role="status">
      <div className="gm-map__overlay-card">
        <strong>Không có sự kiện</strong>
        <span>Cơ sở dữ liệu đang rỗng — bản đồ vẫn sẵn sàng nhận dữ liệu mới.</span>
      </div>
    </div>
  );
}
