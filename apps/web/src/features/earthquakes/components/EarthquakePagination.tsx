import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface EarthquakePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function pageNumbers(page: number, totalPages: number): Array<number | "…"> {
  const pages: Array<number | "…"> = [];
  const push = (value: number | "…") => pages.push(value);
  const candidates = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...candidates].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) push("…");
    push(value);
  });
  return pages;
}

export const EarthquakePagination: React.FC<EarthquakePaginationProps> = ({
  page,
  totalPages,
  total,
  onPageChange,
}) => (
  <div className="eq-pagination">
    <span className="text-caption">{total} trận · Trang {page} / {totalPages}</span>
    <div className="eq-pagination__controls">
      <button className="ds-button ds-button-secondary" disabled={page <= 1}
        onClick={() => onPageChange(1)} type="button" aria-label="Trang đầu">
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button className="ds-button ds-button-secondary" disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))} type="button" aria-label="Trang trước">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pageNumbers(page, totalPages).map((value, index) =>
        value === "…" ? (
          <span key={`gap-${index}`} className="eq-pagination__gap">…</span>
        ) : (
          <button
            key={value}
            className={`ds-button ds-button-secondary ${value === page ? "eq-pagination__current" : ""}`}
            onClick={() => onPageChange(value)}
            type="button"
            aria-label={`Trang ${value}`}
            aria-current={value === page ? "page" : undefined}
          >
            {value}
          </button>
        ),
      )}
      <button className="ds-button ds-button-secondary" disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))} type="button" aria-label="Trang sau">
        <ChevronRight className="h-4 w-4" />
      </button>
      <button className="ds-button ds-button-secondary" disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)} type="button" aria-label="Trang cuối">
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  </div>
);
