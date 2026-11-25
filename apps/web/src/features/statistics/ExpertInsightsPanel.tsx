import React, { useEffect, useRef, useState } from "react";
import { answerScopeKey, readAiConfig, resolveCredential, type AiConfig } from "./ai-config.ts";
import { aiCache } from "./ai-storage.ts";
import { runAiExtraction, type ExtractedAnswer } from "./ai-extract.ts";
import { useCatalogSelection } from "../earthquakes/useCatalogSelection.ts";
import { sectionTitle } from "./insight-structure.ts";
import { useStatisticsData } from "./statistics-data.tsx";

/** Bảng phân tích chuyên gia nổi trên header sublayout — dùng chung dữ liệu 6 pattern. */
export const ExpertInsightsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const { timezone, interval } = useStatisticsData();
  const { country, region } = useCatalogSelection();
  const [config] = useState<AiConfig>(() => resolveCredential(readAiConfig(), aiCache));
  const scopeKey = answerScopeKey({ model: config.model, country, region, timezone, interval });

  const [cached, setCached] = useState<ExtractedAnswer | null>(() =>
    aiCache.read<ExtractedAnswer>(scopeKey),
  );
  useEffect(() => {
    setCached(aiCache.read<ExtractedAnswer>(scopeKey));
    setConfirming(false);
    setError(null);
  }, [scopeKey]);

  useEffect(() => {
    if (!cached) return;
    const timer = window.setInterval(() => {
      if (aiCache.remainingMs(scopeKey) === 0) {
        aiCache.remove(scopeKey);
        setCached(null);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [cached, scopeKey]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const handleExtract = async (): Promise<void> => {
    setConfirming(false);
    setExtracting(true);
    setError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const answer = await runAiExtraction(
        { geo: { country, region }, interval, timezone },
        config,
        { signal: controller.signal, scopeKey },
      );
      aiCache.write(scopeKey, answer);
      setCached(answer);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Không trích xuất được nhận xét AI.");
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setExtracting(false);
    }
  };

  return (
    <div className={`stat-ai ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="stat-ai__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Thu bảng phân tích" : "Phân tích chuyên gia"}
      </button>

      {open && (
        <section className="stat-ai__panel" aria-label="Bảng phân tích chuyên gia">
          <header className="stat-ai__header">
            <div>
              <h2 className="stat-ai__title">Nhận xét chuyên gia</h2>
              <p className="stat-ai__subtitle">Tổng hợp từ 6 nhóm phân tích</p>
            </div>
            <button
              type="button"
              className="stat-ai__close"
              aria-label="Thu bảng phân tích"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="stat-ai__actions">
            <p className="stat-ai__config">
              Model Gemini: <strong>{config.model}</strong> · nhập model/key qua nút khoá ở aside nav
            </p>
            <button
              type="button"
              className="stat-ai__extract"
              disabled={extracting}
              onClick={() => (cached !== null ? setConfirming(true) : void handleExtract())}
            >
              {extracting
                ? "Đang trích xuất…"
                : cached !== null
                  ? "Trích xuất lại"
                  : "Trích xuất nhận xét AI"}
            </button>
          </div>

          {confirming && (
            <div className="stat-ai__confirm" role="alertdialog" aria-label="Xác nhận trích xuất lại">
              <p>
                Kết quả trước đó sẽ bị ghi đè. Bạn có muốn trích xuất lại theo bộ lọc và cửa sổ đang
                xem không?
              </p>
              <div className="stat-ai__confirm-actions">
                <button type="button" className="stat-ai__cancel" onClick={() => setConfirming(false)}>
                  Hủy
                </button>
                <button type="button" className="stat-ai__extract" onClick={handleExtract}>
                  Trích xuất lại
                </button>
              </div>
            </div>
          )}

          {error !== null && <p className="stat-ai__error" role="alert">{error}</p>}

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("summary")}</h3>
            <div
              className="stat-ai__summary-slot"
              aria-label={cached === null ? "Chưa có nội dung AI" : "Nội dung do AI tạo"}
            >
              {cached !== null && (
                <>
                  <p className="stat-ai__text stat-ai__answer">{cached.answer}</p>
                  <p className="stat-ai__note">{cached.note}</p>
                  <p className="stat-ai__notice" role="status">
                    Nội dung AI chỉ được lưu tạm thời, sẽ tự xoá khi hết hạn.
                  </p>
                </>
              )}
            </div>
          </section>

          {cached?.advice && (
            <section className="stat-ai__section stat-ai__safety">
              <h3 className="stat-ai__section-title">
                {cached.advice.title}
                <span className={`stat-ai__safety-level stat-ai__safety-level--${cached.advice.level}`}>
                  Ngoài phân tích AI
                </span>
              </h3>
              <p className="stat-ai__text">{cached.advice.intro}</p>
              <ul className="stat-ai__bullets">
                {cached.advice.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="stat-ai__safety-sources">Tham khảo: {cached.advice.sources.join(" · ")}</p>
              <p className="stat-ai__note">{cached.advice.disclaimer}</p>
            </section>
          )}

        </section>
      )}
    </div>
  );
};
