import React from "react";
import { Navigate } from "react-router-dom";
import { PATTERN_NAV, patternPath } from "./pattern-nav.ts";

/**
 * `/statistics` giờ là入口 của sublayout — chuyển tới pattern đầu tiên.
 * Giữ file/module cũ để tương thích import (RULE-03).
 */
export const StatisticsPage: React.FC = () => (
  <Navigate to={patternPath(PATTERN_NAV[0].slug)} replace />
);
