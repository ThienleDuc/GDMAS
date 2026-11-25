/**
 * Tên 5 phần của báo cáo chuyên gia — phải khớp docs/analysis/insights-structure.md §3.
 * Test `insight-structure.test.ts` đọc file docs để chặn drift.
 */

export interface InsightSection {
  id: "summary" | "insights" | "outlook" | "recommendations" | "caveats";
  title: string;
}

export const INSIGHT_SECTIONS: readonly InsightSection[] = [
  { id: "summary", title: "Tổng quan" },
  { id: "insights", title: "Nhận xét theo 6 nhóm" },
  { id: "outlook", title: "Triển vọng ngày kế tiếp" },
  { id: "recommendations", title: "Khuyến nghị" },
  { id: "caveats", title: "Lưu ý phương pháp" },
];

export function sectionTitle(id: InsightSection["id"]): string {
  return INSIGHT_SECTIONS.find((item) => item.id === id)?.title ?? "";
}
