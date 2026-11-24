/**
 * Cấu hình AI — CHỈ Gemini. Model/key do người dùng nhập qua dialog aside nav,
 * lưu tạm trong browser 24h (ai-storage.ts) rồi BE validate và ghi vào .env.
 * FE không đưa key vào bundle: VITE_AI_API_KEY đã bị bỏ (I6).
 */

import type { AiCache } from "./ai-storage.ts";

export const DEFAULT_AI_MODEL = "gemini-2.0-flash";
export const DEFAULT_API_BASE_URL = "http://localhost:8000";
export const CREDENTIAL_CACHE_KEY = "credential";
export const GEMINI_MODEL_PATTERN = /^gemini[-.A-Za-z0-9_]+$/u;

export interface AiConfig {
  model: string;
  /** Base URL của BE (không phải Gemini) — mọi call AI đi qua /ai/generate. */
  baseUrl: string;
  apiKey: string;
}

export interface AiCredential extends AiConfig {
  savedAt: number;
}

type EnvSource = Partial<Record<string, string | undefined>>;

/** import.meta.env chỉ có trong Vite — Node test dùng injected source. */
function readViteEnv(): EnvSource {
  const meta = import.meta as unknown as { env?: EnvSource };
  return meta.env ?? {};
}

export function isGeminiModel(model: string): boolean {
  return GEMINI_MODEL_PATTERN.test(model.trim());
}

export function readAiConfig(source: EnvSource = readViteEnv()): AiConfig {
  const model = source.VITE_AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  const baseUrl = (source.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL).replace(/\/+$/u, "");
  return { model, baseUrl, apiKey: "" };
}

/** Lưu key/model vào cache 24h khi user xác nhận; ngược lại đọc lại bản đã lưu. */
export function resolveCredential(config: AiConfig, cache: AiCache): AiConfig {
  if (config.apiKey) {
    cache.write(CREDENTIAL_CACHE_KEY, { ...config, savedAt: Date.now() });
    return config;
  }
  return cache.read<AiCredential>(CREDENTIAL_CACHE_KEY) ?? config;
}

/** Khoá cache theo phạm vi — đổi phạm vi/giờ/mô hình thì câu trả lời cũ không còn dùng lại. */
export function answerScopeKey(params: {
  model: string;
  country?: string | null;
  region?: string | null;
  timezone: string;
  interval: string;
}): string {
  return [
    "answer",
    params.model,
    params.country ?? "all",
    params.region ?? "all",
    params.timezone,
    params.interval,
  ].join(":");
}
