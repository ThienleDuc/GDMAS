import React, { useEffect, useState } from "react";
import type { HealthResponse } from "../../contracts/health.ts";
import type { SystemStatusResponse } from "../../contracts/system-status.ts";
import { ApiError } from "../../lib/api-client.ts";
import { getHealthOptional, getSystemStatusOptional } from "../../services/earthquake-api.ts";
import {
  summarizeTerminalRows,
  terminalStatusLabel,
  terminalStatusRows,
} from "./header-data.ts";

type PanelState = "idle" | "loading" | "ready" | "unavailable" | "error";

/**
 * Widget nhỏ trong header hiển thị trạng thái 7 Terminals từ `/system/status` + `/health`.
 * Chỉ gọi REST T6 (I1) — không SSE/poll riêng; fetch khi mount và khi mở panel.
 * 404 → "Chưa có dữ liệu trạng thái" (I5 — không mock).
 */
export const SystemStatusPanel: React.FC = () => {
  const [payload, setPayload] = useState<SystemStatusResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<PanelState>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    setMessage(undefined);

    Promise.all([
      getSystemStatusOptional(controller.signal),
      getHealthOptional(controller.signal),
    ])
      .then(([statusResult, healthResult]) => {
        if (controller.signal.aborted) return;
        setPayload(statusResult.data ?? null);
        setHealth(healthResult.data ?? null);
        setState(statusResult.unavailable && healthResult.unavailable ? "unavailable" : "ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState("error");
        setMessage(reason instanceof ApiError ? reason.message : "Lỗi không xác định.");
      });

    return () => controller.abort();
  }, [reloadKey]);

  const rows = terminalStatusRows(payload);
  const summary = summarizeTerminalRows(rows);
  const chip =
    state === "ready"
      ? `Hệ thống ${summary.healthy}/${summary.total}`
      : state === "unavailable"
        ? "Hệ thống: —"
        : "Hệ thống…";

  return (
    <details
      className="layout__system"
      onToggle={(event) => {
        if (event.currentTarget.open) setReloadKey((key) => key + 1);
      }}
    >
      <summary className="layout__header-widget layout__system-summary" aria-label="Trạng thái 7 Terminals">
        {chip}
      </summary>

      {state === "unavailable" && (
        <p className="layout__service-status-caption">Chưa có dữ liệu trạng thái</p>
      )}
      {state === "error" && (
        <div className="layout__system-body" role="alert">
          <p className="layout__service-status-caption">{message ?? "Lỗi không xác định."}</p>
          <button className="ds-button ds-button-primary" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {state === "ready" && (
        <div className="layout__system-body">
          <ul className="layout__system-list">
            {rows.map((row) => (
              <li key={row.key} className="layout__system-row">
                <span className="layout__service-dot" aria-hidden="true" />
                <span className="layout__system-name">
                  {row.terminalId} · {row.name}
                </span>
                <span className="layout__system-meta">
                  {terminalStatusLabel(row.status)} · {row.freshnessLabel} · {row.lastRunLabel}
                </span>
              </li>
            ))}
          </ul>
          {payload?.data?.data_feed && (
            <p className="layout__service-status-caption">
              Nguồn {payload.data.data_feed.source ?? "—"} · {payload.data.data_feed.total_events ?? 0} sự kiện
            </p>
          )}
          {health && (
            <p className="layout__service-status-caption">
              Cơ sở dữ liệu: {health.data.database === "connected" ? "kết nối" : "mất kết nối"}
            </p>
          )}
        </div>
      )}
    </details>
  );
};
