/**
 * Bộ nhớ tạm 24h cho câu trả lời AI và API key — CHỈ localStorage/sessionStorage,
 * KHÔNG ghi database (web mở, không có auth/bảng lưu). Hết hạn tự xoá (I6/I7).
 */

export const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = "gdmas:ai:v1:";

export interface CacheEntry<T> {
  value: T;
  savedAt: number;
  expiresAt: number;
}

/** Storage tối thiểu để test offline bằng object giả — không cần window. */
export interface AiStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStore(): AiStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function resolveStore(): AiStore {
  if (typeof window === "undefined") return memoryStore();
  try {
    // Ưu tiên localStorage; nếu bị chặn (private mode) → sessionStorage.
    return window.localStorage ?? window.sessionStorage ?? memoryStore();
  } catch {
    return memoryStore();
  }
}

export interface AiCache {
  read<T>(key: string, now?: number): T | null;
  write<T>(key: string, value: T, now?: number): void;
  remove(key: string): void;
  remainingMs(key: string, now?: number): number;
}

export function createAiCache(store: AiStore): AiCache {
  const fullKey = (key: string): string => `${PREFIX}${key}`;

  return {
    read<T>(key: string, now: number = Date.now()): T | null {
      try {
        const raw = store.getItem(fullKey(key));
        if (!raw) return null;
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
          store.removeItem(fullKey(key));
          return null;
        }
        return entry.value;
      } catch {
        // Dữ liệu cũ/hỏng → bỏ qua thay vì làm hỏng UI.
        return null;
      }
    },

    write<T>(key: string, value: T, now: number = Date.now()): void {
      try {
        const entry: CacheEntry<T> = { value, savedAt: now, expiresAt: now + AI_CACHE_TTL_MS };
        store.setItem(fullKey(key), JSON.stringify(entry));
      } catch {
        // Đầy quota / chế độ riêng tư: vẫn trả lời được, chỉ là không cache.
      }
    },

    remove(key: string): void {
      try {
        store.removeItem(fullKey(key));
      } catch {
        /* bỏ qua */
      }
    },

    remainingMs(key: string, now: number = Date.now()): number {
      try {
        const raw = store.getItem(fullKey(key));
        if (!raw) return 0;
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        if (!Number.isFinite(entry.expiresAt)) return 0;
        return Math.max(0, entry.expiresAt - now);
      } catch {
        return 0;
      }
    },
  };
}

export const aiCache: AiCache = createAiCache(resolveStore());
