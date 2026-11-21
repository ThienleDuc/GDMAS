import {
  CHART_GUIDES,
  GUIDE_HIGHLIGHTS,
  RMSE_EXPLANATION,
  type ChartGuideKey,
} from "./chart-guides.ts";

interface ChartReadingGuideProps {
  pattern: ChartGuideKey;
}

/** Khối hướng dẫn nằm bên phải biểu đồ, có từ khóa được tô màu. */
export function ChartReadingGuide({ pattern }: ChartReadingGuideProps) {
  const lines = CHART_GUIDES[pattern];
  const highlights = GUIDE_HIGHLIGHTS[pattern];

  return (
    <aside className="stat-reading-guide stat-reading-guide--side">
      <strong className="stat-reading-guide__title">Cách đọc biểu đồ</strong>
      <ul className="stat-reading-guide__list">
        {lines.map((line, index) => {
          const hit = highlights.find((item) => line.includes(item.term));
          if (!hit) return <li key={line}>{line}</li>;

          const start = line.indexOf(hit.term);
          const before = line.slice(0, start);
          const after = line.slice(start + hit.term.length);
          const title =
            hit.term === "Sai số căn quân phương" ? RMSE_EXPLANATION : undefined;

          return (
            <li key={`${line}-${index}`}>
              {before}
              <span className={`stat-reading-guide__hl stat-reading-guide__hl--${hit.tone}`} title={title}>
                {hit.term}
              </span>
              {after}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
