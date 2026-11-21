import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { nextToastTick, TOAST_SECONDS } from "./header-data.ts";

interface RefreshToastProps {
  open: boolean;
  onClose: () => void;
}

/** Thông báo góc trên bên phải — tự đóng sau 5 giây. */
export const RefreshToast: React.FC<RefreshToastProps> = ({ open, onClose }) => {
  const [remaining, setRemaining] = useState(TOAST_SECONDS);

  useEffect(() => {
    if (!open) return;
    setRemaining(TOAST_SECONDS);
    const timer = window.setInterval(() => setRemaining((current) => nextToastTick(current)), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (open && remaining === 0) onClose();
  }, [open, remaining, onClose]);

  if (!open) return null;

  return (
    <div
      className="layout__refresh-toast"
      style={{ "--toast-progress": `${(remaining / TOAST_SECONDS) * 100}%` } as React.CSSProperties}
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="layout__header-icon h-4 w-4" aria-hidden="true" />
      <div className="layout__refresh-toast-body">
        <strong>Dữ liệu đã được cập nhật</strong>
        <span>Tự đóng sau {remaining}s</span>
      </div>
    </div>
  );
};
