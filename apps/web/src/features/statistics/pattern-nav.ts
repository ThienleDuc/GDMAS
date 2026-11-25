/**
 * Điều hướng con cho 6 nhóm phân tích — thuần, không React/DOM.
 * Tên theo docs/yeucaubatbuoc.md §2 = docs/architecture.md §12.
 */

export const PATTERN_BASE_PATH = "/statistics";

export interface PatternNavItem {
  /** Slug dùng trong URL con, không đổi để giữ bookmark ổn định. */
  slug: string;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const PATTERN_NAV: readonly PatternNavItem[] = [
  {
    slug: "bieu-dien-thoi-gian",
    index: 1,
    label: "Biểu diễn theo thời gian",
    shortLabel: "Thời gian",
    description: "Line · Scatter · Histogram theo Ngày / Tuần / Tháng",
  },
  {
    slug: "xuan-huong",
    index: 2,
    label: "Phân tích xu hướng",
    shortLabel: "Xu hướng",
    description: "Xu hướng sau lấy mẫu lại, kèm độ dốc và độ phù hợp mô hình",
  },
  {
    slug: "mua-vu",
    index: 3,
    label: "Phân tích chu kỳ",
    shortLabel: "Chu kỳ",
    description: "Đường chu kỳ sau re-sampling và diễn giải",
  },
  {
    slug: "tuong-quan",
    index: 4,
    label: "Tương quan",
    shortLabel: "Tương quan",
    description: "Ma trận 5 biến đo đạc · không suy diễn nhân quả",
  },
  {
    slug: "du-bao-phan-loai",
    index: 5,
    label: "Dự báo và Phân loại (ngày kế tiếp)",
    shortLabel: "Dự báo và Phân loại",
    description: "Giá trị dự báo, khoảng tin cậy 95% và nhóm rủi ro ngày kế tiếp",
  },
];

/** Đường dẫn đầy đủ của một pattern. */
export function patternPath(slug: string): string {
  return `${PATTERN_BASE_PATH}/${slug}`;
}

/** Slug đang active theo pathname; fallback về pattern đầu tiên. */
export function patternSlugFor(pathname: string): string {
  const clean = pathname.replace(/\/+$/u, "") || PATTERN_BASE_PATH;
  const match = PATTERN_NAV.find((item) => clean === patternPath(item.slug));
  return match?.slug ?? PATTERN_NAV[0].slug;
}
