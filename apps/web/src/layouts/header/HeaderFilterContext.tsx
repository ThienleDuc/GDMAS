import React from "react";
import { MapPin } from "lucide-react";
import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { useCatalogSelection } from "../../features/earthquakes/useCatalogSelection.ts";

/** Chip ngữ cảnh: có mặt trên mọi giao diện FE nhờ đặt trong header. */
export const HeaderFilterContext: React.FC = () => {
  const { country } = useCatalogSelection();
  if (country === ALL_COUNTRIES) return null;

  return (
    <span className="layout__filter-chip" title="Bộ lọc quốc gia dùng chung toàn cục">
      <MapPin className="layout__header-icon h-3.5 w-3.5" aria-hidden="true" />
      Đang xem: {country}
    </span>
  );
};
