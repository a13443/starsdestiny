import type { Sdk } from './sdk';

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface WebStorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

/** 토스 안: 앱인토스 Storage(앱 종료 후에도 유지). 일반 브라우저: localStorage, 둘 다 안 되면 메모리. */
export function createKV(sdk: Pick<Sdk, 'Storage'> | null, web: WebStorageLike | null = safeLocalStorage()): KV {
  const mem = new Map<string, string>();
  return {
    async get(key) {
      if (sdk) { try { return await sdk.Storage.getItem(key); } catch { return mem.get(key) ?? null; } }
      if (web) { try { return web.getItem(key); } catch { /* 아래 메모리로 */ } }
      return mem.get(key) ?? null;
    },
    async set(key, value) {
      mem.set(key, value);
      if (sdk) { try { await sdk.Storage.setItem(key, value); } catch { /* 메모리 유지 */ } return; }
      if (web) { try { web.setItem(key, value); } catch { /* 메모리 유지 */ } }
    },
    async remove(key) {
      mem.delete(key);
      if (sdk) { try { await sdk.Storage.removeItem(key); } catch { /* ignore */ } return; }
      if (web) { try { web.removeItem(key); } catch { /* ignore */ } }
    },
  };
}
function safeLocalStorage(): WebStorageLike | null { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } }

export async function getJSON<T>(kv: KV, key: string, fallback: T): Promise<T> {
  try { const s = await kv.get(key); return s == null ? fallback : (JSON.parse(s) as T); } catch { return fallback; }
}
export function setJSON(kv: KV, key: string, value: unknown): Promise<void> { return kv.set(key, JSON.stringify(value)); }
