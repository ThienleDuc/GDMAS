import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../earthquakes/region-filter.ts";
import { useCatalogSelection } from "../earthquakes/useCatalogSelection.ts";
import { NEXT_DAY_EXPLANATION } from "./statistics-view.ts";
import { PATTERN_NAV, patternPath } from "./pattern-nav.ts";
import { StatisticsDataProvider } from "./statistics-data.tsx";
import { ExpertInsightsPanel } from "./ExpertInsightsPanel.tsx";

/** Sublayout cho 6 nhóm phân tích: điều hướng con dọc + vùng nội dung riêng từng pattern. */
export const StatisticsLayout: React.FC = () => {
  const { country, region, withSelection } = useCatalogSelection();
  return (
    <StatisticsDataProvider>
      <section className="stat-page">
        <header className="stat-page__heading">
          <div>
            <h1 className="stat-page__title">6 nhóm phân tích chuỗi thời gian</h1>
            <p className="stat-page__subtitle">Dữ liệu phân tích từ luồng xử lý · hiển thị qua dịch vụ dữ liệu</p>
            <p className="stat-page__subtitle">{NEXT_DAY_EXPLANATION}</p>
            {(country !== ALL_COUNTRIES || region !== ALL_REGIONS) && (
              <span className="stat-filter-chip" title="Bộ lọc dùng chung tại header">
                Đang xem: {country !== ALL_COUNTRIES ? country : "Tất cả quốc gia"}
                {region !== ALL_REGIONS ? ` / ${region}` : ""}
              </span>
            )}
          </div>

          <div className="stat-page__filters">
            <ExpertInsightsPanel />
          </div>
        </header>

        <div className="stat-shell">
          <nav className="stat-subnav" aria-label="Điều hướng 6 nhóm phân tích">
            {PATTERN_NAV.map((item) => (
              <NavLink
                key={item.slug}
                to={withSelection(patternPath(item.slug))}
                className={({ isActive }) =>
                  `stat-subnav__item ${isActive ? "is-active" : ""}`
                }
              >
                <span className="stat-subnav__index">{item.index}</span>
                <span className="stat-subnav__body">
                  <span className="stat-subnav__label">{item.label}</span>
                  <span className="stat-subnav__desc">{item.description}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="stat-shell__content">
            <React.Suspense
              fallback={<p className="stat-pattern-loading" role="status">Đang tải biểu đồ…</p>}
            >
              <Outlet />
            </React.Suspense>
          </div>
        </div>
      </section>
    </StatisticsDataProvider>
  );
};
