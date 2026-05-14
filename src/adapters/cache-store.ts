/**
 * Contrato para armazenamento chave-valor com expiração.
 *
 * Implementações conhecidas:
 *   - MemoryCacheStore: cache em RAM (testes, dev local sem KV)
 *   - KvCacheStore: Cloudflare Workers KV (produção)
 *
 * A interface é assíncrona porque a maioria das implementações reais
 * (KV, Redis, etc) envolvem rede. A versão em memória só "promete" sem
 * realmente esperar, mantendo a assinatura compatível.
 */
export interface CacheStore {
  /**
   * Lê um valor pelo nome da chave.
   * @returns o valor armazenado, ou null se não existir ou estiver expirado.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Escreve um valor com TTL (tempo até expirar) em segundos.
   * @param key - chave única
   * @param value - valor a armazenar (será serializado como JSON)
   * @param ttlSeconds - tempo de vida em segundos (>= 1)
   */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * Remove uma chave (best-effort; não falha se a chave não existir).
   */
  delete(key: string): Promise<void>;
}