import type { CacheStore } from './cache-store.js';

/**
 * Entrada interna do cache em memória.
 */
interface Entry {
  value: unknown;
  /** Timestamp (ms) em que a entrada expira; obtido com Date.now(). */
  expiresAt: number;
}

/**
 * Implementação de CacheStore em memória do processo.
 *
 * Características:
 *   - Não persiste (perde tudo no restart).
 *   - Não compartilha entre processos (cada instância tem o seu).
 *   - Útil para testes, dev local e fallback.
 *
 * Para produção em Cloudflare Workers, use KvCacheStore.
 */
export class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key); // limpeza preguiçosa
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1) {
      throw new Error(`ttlSeconds deve ser >= 1, recebido: ${ttlSeconds}`);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}