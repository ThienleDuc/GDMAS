/**
 * Utility quản lý 2 chế độ múi giờ: UTC (+00:00) và UTC + 7:00 (Giờ Việt Nam / ICT)
 */

export type TimezoneMode = "UTC" | "UTC+7";

const STORAGE_KEY = "gdmas_timezone_mode";

/**
 * Lấy chế độ múi giờ đã lưu trong LocalStorage (mặc định là UTC+7)
 */
export function getStoredTimezone(): TimezoneMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "UTC" || val === "UTC+7") return val;
  } catch {
    // fallback
  }
  return "UTC+7";
}

/**
 * Lưu chế độ múi giờ vào LocalStorage
 */
export function setStoredTimezone(mode: TimezoneMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

/**
 * Định dạng thời gian sự kiện theo chế độ múi giờ đã chọn
 * @param isoString Chuỗi thời gian chuẩn ISO 8601 (UTC)
 * @param mode "UTC" hoặc "UTC+7"
 */
export function formatEventTime(isoString: string, mode: TimezoneMode = "UTC+7"): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    if (mode === "UTC") {
      return (
        d.toLocaleString("vi-VN", {
          timeZone: "UTC",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " UTC"
      );
    } else {
      // UTC + 7:00 (Asia/Ho_Chi_Minh)
      return (
        d.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " (UTC+7)"
      );
    }
  } catch {
    return isoString;
  }
}

/**
 * Tính khoảng thời gian tương đối so với hiện tại (ví dụ: "5 phút trước")
 */
export function getRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (isNaN(diffMs)) return "";
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    return `${Math.floor(diffHour / 24)} ngày trước`;
  } catch {
    return "";
  }
}

