// Định nghĩa cấu hình routes cho Frontend Client
export const APP_ROUTES = {
  HOME: "/",
  MONITORING: "/monitoring",
  EARTHQUAKES: "/earthquakes",
  STATISTICS: "/statistics",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];


