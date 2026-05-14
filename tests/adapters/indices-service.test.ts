import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IndicesService } from '../../src/adapters/indices-service.js';
import { MemoryCacheStore } from '../../src/adapters/memory-cache-store.js';
import type { SgsObservation } from '../../src/shared/types.js';

/**
 * Helper: gera 12 observações mensais sintéticas com valor constante.
 */
function obsMensais(valor: string, ano = 2025): SgsObservation[] {
  return Array.from({ length: 12 }, (_, i) => ({
    data: `01/${String(i + 1).padStart(2, '0')}/${ano}`,
    valor,
  }));
}

/**
 * Mock baseado em URL: responde de acordo com a série SGS chamada.
 * Robusto a paralelismo (Promise.all) — diferente de mockResolvedValueOnce
 * que depende da ordem.
 */
function mockarPorSerie(
  fetchSpy: ReturnType<typeof vi.spyOn>,
  respostas: {
    ipca?: SgsObservation[] | { status: number };
    igpm?: SgsObservation[] | { status: number };
    selic?: SgsObservation[] | { status: number };
    cdi?: SgsObservation[] | { status: number };
  },
): void {
  fetchSpy.mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : (input as Request).url;

    const responder = (
      r: SgsObservation[] | { status: number } | undefined,
    ): Response => {
      if (!r) return new Response('no mock', { status: 500 });
      if ('status' in r) return new Response('mocked error', { status: r.status });
      return new Response(JSON.stringify(r), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    if (url.includes('bcdata.sgs.433')) return responder(respostas.ipca);
    if (url.includes('bcdata.sgs.189')) return responder(respostas.igpm);
    if (url.includes('bcdata.sgs.432')) return responder(respostas.selic);
    if (url.includes('bcdata.sgs.12')) return responder(respostas.cdi);
    return new Response('not found', { status: 404 });
  });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;
let cache: MemoryCacheStore;
let service: IndicesService;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch');
  cache = new MemoryCacheStore();
  service = new IndicesService(cache, 60);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('IndicesService.getSnapshot', () => {
  it('retorna snapshot completo com 4 índices na primeira chamada', async () => {
    mockarPorSerie(fetchSpy, {
      ipca: obsMensais('0.50'),
      igpm: obsMensais('0.40'),
      selic: [{ data: '15/06/2026', valor: '14.50' }],
      cdi: [{ data: '13/05/2026', valor: '0.053400' }],
    });

    const snap = await service.getSnapshot();

    expect(snap.origem).toBe('live');
    expect(snap.ipca).not.toBeNull();
    expect(snap.igpm).not.toBeNull();
    expect(snap.selic).not.toBeNull();
    expect(snap.cdi).not.toBeNull();
    expect(snap.ipca?.nome).toBe('IPCA');
    expect(snap.igpm?.nome).toBe('IGP-M');
    expect(snap.selic?.nome).toBe('SELIC');
    expect(snap.cdi?.nome).toBe('CDI');
    expect(snap.geradoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('fez 4 chamadas HTTP na primeira execução (uma por série)', async () => {
    mockarPorSerie(fetchSpy, {
      ipca: obsMensais('0.50'),
      igpm: obsMensais('0.40'),
      selic: [{ data: '15/06/2026', valor: '14.50' }],
      cdi: [{ data: '13/05/2026', valor: '0.053400' }],
    });

    await service.getSnapshot();
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it('segunda chamada usa cache (zero chamadas HTTP novas)', async () => {
    mockarPorSerie(fetchSpy, {
      ipca: obsMensais('0.50'),
      igpm: obsMensais('0.40'),
      selic: [{ data: '15/06/2026', valor: '14.50' }],
      cdi: [{ data: '13/05/2026', valor: '0.053400' }],
    });

    const primeira = await service.getSnapshot();
    expect(primeira.origem).toBe('live');
    expect(fetchSpy).toHaveBeenCalledTimes(4);

    const segunda = await service.getSnapshot();
    expect(segunda.origem).toBe('cache');
    expect(fetchSpy).toHaveBeenCalledTimes(4); // não chamou de novo
  });

  it('expiração do cache provoca nova busca', async () => {
    vi.useFakeTimers();
    try {
      mockarPorSerie(fetchSpy, {
        ipca: obsMensais('0.50'),
        igpm: obsMensais('0.40'),
        selic: [{ data: '15/06/2026', valor: '14.50' }],
        cdi: [{ data: '13/05/2026', valor: '0.053400' }],
      });

      await service.getSnapshot();
      expect(fetchSpy).toHaveBeenCalledTimes(4);

      vi.advanceTimersByTime(61_000); // TTL é 60s

      const segunda = await service.getSnapshot();
      expect(segunda.origem).toBe('live');
      expect(fetchSpy).toHaveBeenCalledTimes(8);
    } finally {
      vi.useRealTimers();
    }
  });

  it('falha em UMA série não derruba o snapshot inteiro (parcial)', async () => {
    mockarPorSerie(fetchSpy, {
      ipca: { status: 500 }, // IPCA sempre falha (vai esgotar retry)
      igpm: obsMensais('0.40'),
      selic: [{ data: '15/06/2026', valor: '14.50' }],
      cdi: [{ data: '13/05/2026', valor: '0.053400' }],
    });

    const snap = await service.getSnapshot();

    expect(snap.ipca).toBeNull();
    expect(snap.igpm?.nome).toBe('IGP-M');
    expect(snap.selic?.nome).toBe('SELIC');
    expect(snap.cdi?.nome).toBe('CDI');
    expect(snap.origem).toBe('parcial');
  }, 15_000);
});