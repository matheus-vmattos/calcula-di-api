import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchSgsSerie } from '../../src/adapters/bcb-client.js';
import { SGS_SERIES } from '../../src/shared/types.js';

/**
 * Helper: cria uma Response mockada compatível com a API do fetch.
 */
function mockResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Helper: cria uma Response com payload textual (para simular JSON inválido).
 */
function mockTextResponse(text: string, status: number = 200): Response {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Cria um spy do fetch global; cada teste configura o comportamento.
  fetchSpy = vi.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('fetchSgsSerie - sucesso', () => {
  it('busca uma série e retorna as observações', async () => {
    const fakeData = [
      { data: '01/02/2026', valor: '0.70' },
      { data: '01/03/2026', valor: '0.88' },
      { data: '01/04/2026', valor: '0.67' },
    ];
    fetchSpy.mockResolvedValueOnce(mockResponse(fakeData));

    const result = await fetchSgsSerie(SGS_SERIES.IPCA, 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ data: '01/02/2026', valor: '0.70' });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0][0]).toContain('bcdata.sgs.433/dados/ultimos/3');
  });

  it('usa quantidade default quando não especificado', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse([]));

    const result = await fetchSgsSerie(SGS_SERIES.IPCA);

    expect(result).toEqual([]);
    expect(fetchSpy.mock.calls[0][0]).toContain('ultimos/12');
  });
});

describe('fetchSgsSerie - tratamento de erros', () => {
  it('lança erro quando BCB retorna 500 (após esgotar retries)', async () => {
    // 3 tentativas: 1 inicial + 2 retries (config.retries = 2)
    fetchSpy.mockResolvedValue(mockTextResponse('Internal Server Error', 500));

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/500/);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  }, 10_000);

  it('lança erro quando BCB retorna 404 (sem retry)', async () => {
    fetchSpy.mockResolvedValueOnce(mockTextResponse('', 404));

    // @ts-expect-error - testando série inexistente em runtime
    await expect(fetchSgsSerie(99999, 3)).rejects.toThrow(/404/);
    expect(fetchSpy).toHaveBeenCalledOnce(); // 4xx não faz retry
  });

  it('lança erro quando resposta não é um array', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ erro: 'formato inesperado' }));

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/formato inesperado/);
    expect(fetchSpy).toHaveBeenCalledOnce(); // erro definitivo não faz retry
  });

  it('lança erro com observação malformada', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse([{ data: '01/04/2026' }]));

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow();
  });

  it('faz retry em erros 5xx e sucede se uma tentativa funcionar', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockTextResponse('Service Unavailable', 503))
      .mockResolvedValueOnce(mockResponse([{ data: '01/04/2026', valor: '0.67' }]));

    const result = await fetchSgsSerie(SGS_SERIES.IPCA, 3);

    expect(result).toEqual([{ data: '01/04/2026', valor: '0.67' }]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }, 10_000);

  it('NÃO faz retry quando payload é inválido (erro definitivo)', async () => {
    fetchSpy.mockResolvedValueOnce(mockResponse({ erro: 'formato inesperado' }));

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/formato inesperado/);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('trata erro de rede como retryable', async () => {
    fetchSpy.mockRejectedValue(new Error('network failure'));

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/falha de rede/);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // tentou as 3 vezes
  }, 10_000);
});

describe('fetchSgsSerie - validação de input', () => {
  it('rejeita quantidade <= 0', async () => {
    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 0)).rejects.toThrow();
    await expect(fetchSgsSerie(SGS_SERIES.IPCA, -1)).rejects.toThrow();
  });
});