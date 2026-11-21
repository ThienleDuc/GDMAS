import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { StatisticsLayout } from "./StatisticsLayout.tsx";
import { PATTERN_NAV, patternPath } from "./pattern-nav.ts";
import {
  CorrelationPatternPage,
  ForecastClassificationPatternPage,
  SeasonalityPatternPage,
  TemporalPatternPage,
  TrendPatternPage,
} from "./patterns/index.ts";

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
