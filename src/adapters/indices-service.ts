import { fetchSgsSerie } from './bcb-client.js';
import {
  normalizarCdi,
  normalizarIgpm,
  normalizarIpca,
  normalizarSelic,
} from './bcb-normalizer.js';
import type { CacheStore } from './cache-store.js';
import {
  SGS_SERIES,
  type IndiceAnual,
  type IndiceMensal,
  type IndicesSnapshot,
} from '../shared/types.js';

const CACHE_KEY_SNAPSHOT = 'indices:snapshot';

/**
 * Serviço de orquestração dos índices financeiros.
 *
 * Responsabilidades:
 *   1. Verificar cache antes de ir ao BCB.
 *   2. Buscar as 4 séries em paralelo quando necessário.
 *   3. Normalizar cada série usando os normalizadores específicos.
 *   4. Tolerar falha de uma série sem invalidar o snapshot todo.
 *   5. Salvar o snapshot no cache para próximas chamadas.
 *
 * Recebe o CacheStore por injeção de dependência — em produção é
 * KvCacheStore, em testes é MemoryCacheStore.
 */
export class IndicesService {
  constructor(
    private readonly cache: CacheStore,
    private readonly ttlSeconds: number,
  ) {}

  /**
   * Retorna um snapshot atualizado dos 4 índices.
   *
   * Estratégia:
   *   - Se o cache tem snapshot válido → retorna direto (origem: 'cache')
   *   - Caso contrário → busca tudo no BCB em paralelo (origem: 'live')
   *   - Se alguma série falha → o índice fica null e origem vira 'parcial'
   */
  async getSnapshot(): Promise<IndicesSnapshot> {
    // Tenta servir do cache primeiro
    const cached = await this.cache.get<IndicesSnapshot>(CACHE_KEY_SNAPSHOT);
    if (cached) {
      return { ...cached, origem: 'cache' };
    }

    // Cache miss — busca tudo do BCB em paralelo
    const [ipca, igpm, selic, cdi] = await Promise.all([
      this.buscarIpca(),
      this.buscarIgpm(),
      this.buscarSelic(),
      this.buscarCdi(),
    ]);

    const houveFalha = [ipca, igpm, selic, cdi].some((v) => v === null);
    const origem: IndicesSnapshot['origem'] = houveFalha ? 'parcial' : 'live';

    const snapshot: IndicesSnapshot = {
      ipca,
      igpm,
      selic,
      cdi,
      geradoEm: new Date().toISOString(),
      origem,
    };

    // Só cacheia snapshots completos (não cacheamos parciais para
    // dar chance de re-buscar a série faltante na próxima requisição)
    if (!houveFalha) {
      try {
        await this.cache.set(CACHE_KEY_SNAPSHOT, snapshot, this.ttlSeconds);
      } catch {
        // Falha de cache não derruba a resposta — só loga em produção (não aqui)
      }
    }

    return snapshot;
  }

  // ─── Helpers privados de busca ──────────────────────────────────────────

  private async buscarIpca(): Promise<IndiceMensal | null> {
    try {
      const raw = await fetchSgsSerie(SGS_SERIES.IPCA, 12);
      return normalizarIpca(raw);
    } catch {
      return null;
    }
  }

  private async buscarIgpm(): Promise<IndiceMensal | null> {
    try {
      const raw = await fetchSgsSerie(SGS_SERIES.IGPM, 12);
      return normalizarIgpm(raw);
    } catch {
      return null;
    }
  }

  private async buscarSelic(): Promise<IndiceAnual | null> {
    try {
      const raw = await fetchSgsSerie(SGS_SERIES.SELIC_META, 1);
      return normalizarSelic(raw);
    } catch {
      return null;
    }
  }

  private async buscarCdi(): Promise<IndiceAnual | null> {
    try {
      const raw = await fetchSgsSerie(SGS_SERIES.CDI, 1);
      return normalizarCdi(raw);
    } catch {
      return null;
    }
  }
}