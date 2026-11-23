/**
 * Overlay khi không có sự kiện để hiển thị — bản đồ vẫn nạp, tuyệt đối không fallback mock (I5).
 * Thông báo phân biệt DB rỗng và "khu vực đang chọn rỗng" để người dùng hiểu bản đồ vẫn sẵn sàng.
 */
interface MapEmptyOverlayProps {
  /** Có sự kiện trong dữ liệu đã tải nhưng không khớp bộ lọc hiện tại. */
  hasEvents?: boolean;
}

export function MapEmptyOverlay({ hasEvents = false }: MapEmptyOverlayProps) {
  const message = hasEvents
    ? "Không có sự kiện trong khu vực đang chọn — bản đồ vẫn sẵn sàng nhận dữ liệu mới."
    : "Cơ sở dữ liệu đang rỗng — bản đồ vẫn sẵn sàng nhận dữ liệu mới.";

  return (
    <div className="gm-map__overlay" role="status">
      <div className="gm-map__overlay-card">
        <strong>Không có sự kiện</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
