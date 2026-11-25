import React, { useEffect, useReducer, useRef, useState } from "react";
import { syncUsgsData } from "../../../services/earthquake-api.ts";
import { formatSyncMessage, syncErrorMessage, syncReducer } from "../usgs-sync.ts";

interface UsgsSyncButtonProps {
  /** Gọi sau khi BE xác nhận đã ghi dữ liệu — trang refresh danh sách/KPI. */
  onSynced: () => void;
}

/**
 * Nút đồng bộ USGS — bấm lần 1 hiện xác nhận, bấm "Xác nhận" mới gọi POST.
 * Không dùng `window.confirm()` (không test được), không mock runtime (I5).
 */
export const UsgsSyncButton: React.FC<UsgsSyncButtonProps> = ({ onSynced }) => {
  const [state, dispatch] = useReducer(syncReducer, "idle");
  const [message, setMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const handleConfirm = () => {
    dispatch({ type: "start" });
    setMessage(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    syncUsgsData(controller.signal)
      .then((result) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setMessage(formatSyncMessage(result));
        dispatch({ type: "success" });
        if (result.success) onSynced();
      })
      .catch((reason: unknown) => {
        if (!mountedRef.current || controller.signal.aborted) return;
        setMessage(syncErrorMessage(reason));
        dispatch({ type: "failure" });
      });
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    dispatch({ type: "cancel" });
  };

  if (state === "confirming") {
    return (
      <div className="eq-sync-confirm">
        <span className="eq-sync-question">Đồng bộ dữ liệu USGS? Thao tác này ghi vào CSDL.</span>
        <button className="ds-button ds-button-primary" type="button" onClick={handleConfirm}>
          Xác nhận
        </button>
        <button className="ds-button ds-button-secondary" type="button" onClick={handleCancel}>
          Hủy
        </button>
      </div>
    );
  }

  return (
    <div className="eq-sync">
      <button
        className="ds-button ds-button-secondary"
        type="button"
        disabled={state === "loading"}
        aria-busy={state === "loading"}
        onClick={() => dispatch({ type: "ask" })}
      >
        {state === "loading" ? "Đang đồng bộ…" : "Đồng bộ ngay"}
      </button>
      {message && (
        <p className="eq-sync-message" role={state === "error" ? "alert" : "status"}>
          {message}
        </p>
      )}
      {(state === "done" || state === "error") && (
        <button
          className="ds-button"
          type="button"
          onClick={() => {
            setMessage(null);
            dispatch({ type: "dismiss" });
          }}
        >
          Đóng
        </button>
      )}
    </div>
  );
};
