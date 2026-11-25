/** Giao tiếp với BE /ai/credentials — chỉ Gemini, key do người dùng nhập. */

import { fetchApi } from "../lib/api-client.ts";

export interface AiCredentialsStatus {
  configured: boolean;
  model: string | null;
  masked_key: string;
}

export interface AiCredentialsResult {
  model: string;
  configured: boolean;
}

export function getAiCredentialsStatus(signal?: AbortSignal): Promise<AiCredentialsStatus> {
  return fetchApi<{ data: AiCredentialsStatus }>("/api/v1/ai/credentials/status", { signal }).then(
    (body) => body.data,
  );
}

export function saveAiCredentials(
  model: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<AiCredentialsResult> {
  return fetchApi<{ data: AiCredentialsResult }>(
    "/api/v1/ai/credentials",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, api_key: apiKey }),
      signal,
    },
  ).then((body) => body.data);
}
