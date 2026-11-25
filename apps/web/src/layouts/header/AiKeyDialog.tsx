import React, { useEffect, useState } from "react";
import {
  isGeminiModel,
  readAiConfig,
  resolveCredential,
} from "../../features/statistics/ai-config.ts";
import { aiCache } from "../../features/statistics/ai-storage.ts";
import {
  getAiCredentialsStatus,
  saveAiCredentials,
  type AiCredentialsStatus,
} from "../../services/ai-settings-api.ts";

interface AiKeyDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Dialog nhập model + API key Gemini. Key lưu browser 24h rồi gửi BE validate;
 * BE ghi vào .env máy chủ — không lưu database (web mở, không auth).
 */
export const AiKeyDialog: React.FC<AiKeyDialogProps> = ({ open, onClose }) => {
  const [model, setModel] = useState(readAiConfig().model);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<AiCredentialsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setError(null);
    setSaved(false);
    getAiCredentialsStatus(controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setStatus(value);
        if (value.model) setModel(value.model);
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus(null);
      });
    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!isGeminiModel(model)) {
      setError("Chỉ hỗ trợ mô hình Gemini — tên phải bắt đầu bằng 'gemini-'.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Vui lòng nhập API key.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveAiCredentials(model.trim(), apiKey.trim());
      // Copy vào bộ nhớ trình duyệt 24h — BE đã validate và ghi .env.
      resolveCredential(
        { model: result.model, baseUrl: readAiConfig().baseUrl, apiKey: apiKey.trim() },
        aiCache,
      );
      setSaved(true);
      setStatus({ configured: true, model: result.model, masked_key: status?.masked_key ?? "" });
      setApiKey("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không lưu được cấu hình AI.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="ai-key-dialog__backdrop" onClick={onClose}>
      <section
        className="ai-key-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-key-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ai-key-dialog__header">
          <h2 id="ai-key-dialog-title">Cấu hình AI (Gemini)</h2>
          <button type="button" className="ai-key-dialog__close" aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="ai-key-dialog__hint">
          Chỉ hỗ trợ Gemini. Key được lưu trong trình duyệt 24 giờ rồi gửi lên máy chủ để kiểm tra;
        </p>

        <p className="ai-key-dialog__status" role="status">
          {status?.configured
            ? `Đã cấu hình: ${status.model ?? "—"} (${status.masked_key || "key đã lưu"})`
            : "Chưa có cấu hình Gemini trên máy chủ."}
        </p>

        <form className="ai-key-dialog__form" onSubmit={handleSubmit}>
          <label className="ai-key-dialog__label">
            Model Gemini
            <input
              className="ai-key-dialog__input"
              type="text"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gemini-2.0-flash"
              autoComplete="off"
            />
          </label>
          <label className="ai-key-dialog__label">
            API key
            <input
              className="ai-key-dialog__input"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Nhập API key Gemini"
              autoComplete="off"
            />
          </label>

          {error !== null && (
            <p className="ai-key-dialog__error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="ai-key-dialog__success" role="status">
              Đã xác nhận key hợp lệ và lưu cấu hình vào .env. Bạn có thể đóng dialog.
            </p>
          )}

          <div className="ai-key-dialog__actions">
            <button type="button" className="ai-key-dialog__cancel" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="ai-key-dialog__submit" disabled={saving}>
              {saving ? "Đang kiểm tra…" : "Xác nhận"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
