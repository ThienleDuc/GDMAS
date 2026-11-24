import React, { useEffect, useState } from "react";
import { getAiCredentialsStatus } from "../../services/ai-settings-api.ts";
import { AiKeyDialog } from "./AiKeyDialog.tsx";

/**
 * Nút SVG khoá trong footer aside — nằm dưới đồng hồ đếm ngược, trên nút đổi theme.
 * Click mở dialog nhập model/key Gemini (chỉ Gemini).
 */
export const AiKeyButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAiCredentialsStatus(controller.signal)
      .then((status) => {
        if (!controller.signal.aborted) setConfigured(status.configured);
      })
      .catch(() => {
        /* BE chưa sẵn sàng — vẫn cho mở dialog để cấu hình */
      });
    return () => controller.abort();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="layout__ai-key"
        onClick={() => setOpen(true)}
        aria-label="Cấu hình AI Gemini"
        title={configured ? "Gemini đã cấu hình — nhấn để đổi" : "Cấu hình AI (Gemini)"}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="7.5" cy="15.5" r="3.5" />
          <path d="M10.2 12.8 20 3m-4 1 3 3m-6 0 3 3" />
        </svg>
        {configured && <span className="layout__ai-key-dot" aria-hidden="true" />}
      </button>
      <AiKeyDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
