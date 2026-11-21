/**
 * Cấu hình điều hướng dùng chung cho shell (Terminal 7) — thuần, không React/DOM.
 * Nguồn nhãn: docs/task/thien.md (4 route), docs/yeucaubatbuoc.md.
 * I3/I5: chỉ là nhãn hiển thị tiếng Việt, không đổi route hay payload.
 */

export interface NavMeta {
  path: string;
  label: string;
  description: string;
  badge?: string;
}

export const NAV_META: readonly NavMeta[] = [
  { path: "/", label: "Tổng quan", description: "Tổng quan hệ thống và các chỉ số chính" },
  {
    path: "/monitoring",
    label: "Bản đồ Giám sát",
    description: "Địa chấn realtime theo quốc gia và khu vực",
    badge: "Trực tiếp",
  },
  { path: "/earthquakes", label: "Danh mục Động đất", description: "Danh sách sự kiện, lọc và phân trang" },
  { path: "/statistics", label: "6 nhóm phân tích", description: "Trực quan hóa 6 nhóm phân tích chuỗi thời gian" },
];

/** Tìm meta của route hiện tại; hỗ trợ route con, bỏ dấu `/` thừa ở cuối. */
export function navMetaFor(pathname: string): NavMeta | null {
  const clean = pathname.replace(/\/+$/u, "") || "/";
  if (clean === "/") return NAV_META[0];
  return NAV_META.find((item) => clean === item.path || clean.startsWith(`${item.path}/`)) ?? null;
}

/** Nhãn breadcrumb — KHÔNG trả slug tiếng Anh cho route lạ. */
export function routeLabel(pathname: string): string {
  return navMetaFor(pathname)?.label ?? "Trang";
}
