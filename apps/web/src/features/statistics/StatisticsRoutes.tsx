import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StatisticsLayout } from "./StatisticsLayout.tsx";
import { PATTERN_NAV, patternPath } from "./pattern-nav.ts";

// Mỗi pattern page là một chunk riêng — vào /statistics không tải cả 5 sub-layout.
const TemporalPatternPage = React.lazy(() =>
  import("./patterns/TemporalPatternPage").then((module) => ({ default: module.TemporalPatternPage })),
);
const TrendPatternPage = React.lazy(() =>
  import("./patterns/TrendPatternPage").then((module) => ({ default: module.TrendPatternPage })),
);
const SeasonalityPatternPage = React.lazy(() =>
  import("./patterns/SeasonalityPatternPage").then((module) => ({ default: module.SeasonalityPatternPage })),
);
const CorrelationPatternPage = React.lazy(() =>
  import("./patterns/CorrelationPatternPage").then((module) => ({ default: module.CorrelationPatternPage })),
);
const ForecastClassificationPatternPage = React.lazy(() =>
  import("./patterns/ForecastClassificationPatternPage").then((module) => ({
    default: module.ForecastClassificationPatternPage,
  })),
);

/**
 * Cây route con của /statistics — mỗi pattern là một route, dùng chung sublayout.
 * LƯU Ý: component này nằm dưới route cha `/statistics/*` trong App.tsx, nên React Router
 * đã cắt bỏ prefix `/statistics`. Các `path` ở đây PHẢI là tương đối (slug), không được
 * viết lại `/statistics/...` nếu không vùng `<Outlet/>` sẽ trống.
 */
export const StatisticsRoutes: React.FC = () => (
  <Routes>
    <Route element={<StatisticsLayout />}>
      <Route index element={<Navigate to={patternPath(PATTERN_NAV[0].slug)} replace />} />
      <Route path={PATTERN_NAV[0].slug} element={<TemporalPatternPage />} />
      <Route path={PATTERN_NAV[1].slug} element={<TrendPatternPage />} />
      <Route path={PATTERN_NAV[2].slug} element={<SeasonalityPatternPage />} />
      <Route path={PATTERN_NAV[3].slug} element={<CorrelationPatternPage />} />
      <Route path={PATTERN_NAV[4].slug} element={<ForecastClassificationPatternPage />} />
      <Route path="*" element={<Navigate to={patternPath(PATTERN_NAV[0].slug)} replace />} />
    </Route>
  </Routes>
);
