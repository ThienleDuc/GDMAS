import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshToast } from "./RefreshToast.tsx";

interface RefreshToastHostProps {
  /** Key đổi khi SSE xác nhận worker T2 hoàn thành chu kỳ 5 phút (GAP-13). */
  dataRefreshKey?: string | null;
}

/**
 * Tách phần toast khỏi DataRefreshLabel để countdown có thể dời xuống aside mà không mất
 * thông báo "Dữ liệu đã được cập nhật" bắn theo SSE thật (GAP-13).
 */
export const RefreshToastHost: React.FC<RefreshToastHostProps> = ({ dataRefreshKey }) => {
  const [open, setOpen] = useState(false);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!dataRefreshKey || dataRefreshKey === lastKey.current) return;
    lastKey.current = dataRefreshKey;
    setOpen(true);
  }, [dataRefreshKey]);

  const closeToast = useCallback(() => setOpen(false), []);

  return <RefreshToast open={open} onClose={closeToast} />;
};
