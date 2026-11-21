import React from "react";
import { DataRefreshLabel } from "./DataRefreshLabel.tsx";
import { GlobalCountryFilter } from "./GlobalCountryFilter.tsx";
import { HeaderFilterContext } from "./HeaderFilterContext.tsx";
import { RealtimeClock } from "./RealtimeClock.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";

interface HeaderActionsProps {
  onRefresh: () => void;
}

/** Cụm widget phía tay phải header — dùng chung mọi giao diện FE. */
export const HeaderActions: React.FC<HeaderActionsProps> = ({ onRefresh }) => (
  <div className="layout__header-actions app-header-actions">
    <HeaderFilterContext />
    <GlobalCountryFilter />
    <DataRefreshLabel onRefresh={onRefresh} />
    <RealtimeClock />
    <ThemeToggle />
  </div>
);
