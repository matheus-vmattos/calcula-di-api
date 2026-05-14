import type { CacheStore } from './cache-store.js';

/**
 * Implementação de CacheStore usando Cloudflare Workers KV.
 *
 * Características:
 *   - Persistência distribuída (replicado globalmente no edge).
 *   - TTL nativo (KV expira a chave automaticamente).
 *   - Latência baixíssima (leitura ~10-30ms em qualquer região).
 *   - Eventually consistent (escritas levam até 60s para propagar globalmente).
 *
 * A interface KVNamespace é fornecida pelo runtime do Cloudflare Workers
 * e está tipada via @cloudflare/workers-types.
 */
export class KvCacheStore implements CacheStore {
  constructor(private readonly kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    // KV.get com type 'json' já desserializa automaticamente.
    // Retorna null se a chave não existe ou se já expirou.
    return await this.kv.get<T>(key, { type: 'json' });
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!Number.isFinite(ttlSeconds) || ttlSeconds < 60) {
      // KV exige TTL mínimo de 60 segundos.
      throw new Error(`ttlSeconds deve ser >= 60 para KV, recebido: ${ttlSeconds}`);
    }
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }
}