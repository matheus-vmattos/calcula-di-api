import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { fetchSgsSerie } from '../../src/adapters/bcb-client.js';
import { SGS_SERIES } from '../../src/shared/types.js';

const BCB_ORIGIN = 'https://api.bcb.gov.br';

let mockAgent: MockAgent;
let originalDispatcher: Dispatcher;

beforeEach(() => {
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect(); // garante que nada real escape
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

describe('fetchSgsSerie - sucesso', () => {
  it('busca uma série e retorna as observações', async () => {
    const fakeData = [
      { data: '01/02/2026', valor: '0.70' },
      { data: '01/03/2026', valor: '0.88' },
      { data: '01/04/2026', valor: '0.67' },
    ];

    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(200, fakeData);

    const result = await fetchSgsSerie(SGS_SERIES.IPCA, 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ data: '01/02/2026', valor: '0.70' });
    expect(result[2].valor).toBe('0.67');
  });

  it('usa quantidade default quando não especificado', async () => {
    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/12?formato=json`,
        method: 'GET',
      })
      .reply(200, []);

    const result = await fetchSgsSerie(SGS_SERIES.IPCA);
    expect(result).toEqual([]);
  });
});

describe('fetchSgsSerie - tratamento de erros', () => {
  it('lança erro quando BCB retorna 500 (após esgotar retries)', async () => {
    const interceptor = mockAgent.get(BCB_ORIGIN);

    // O cliente faz até 3 tentativas (1 inicial + 2 retries em config.retries)
    interceptor
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(500, 'Internal Server Error')
      .times(3);

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/500/);
  }, 10_000); // timeout do teste estendido (delays do retry somam ~1.5s)

  it('lança erro quando BCB retorna 404', async () => {
    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.99999/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(404, '');

    // @ts-expect-error - testando série inexistente em runtime
    await expect(fetchSgsSerie(99999, 3)).rejects.toThrow(/404/);
  });

  it('lança erro quando resposta não é um array', async () => {
    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(200, { erro: 'formato inesperado' });

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/formato inesperado/);
  });

  it('lança erro com observação malformada', async () => {
    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(200, [{ data: '01/04/2026' }]); // falta o campo "valor"

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow();
  });

  it('faz retry em erros 5xx e sucede se uma tentativa funcionar', async () => {
    const interceptor = mockAgent.get(BCB_ORIGIN);
    const path = `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`;

    // 1ª tentativa falha com 503
    interceptor
      .intercept({ path, method: 'GET' })
      .reply(503, 'Service Unavailable');

    // 2ª tentativa retorna sucesso
    interceptor
      .intercept({ path, method: 'GET' })
      .reply(200, [{ data: '01/04/2026', valor: '0.67' }]);

    const result = await fetchSgsSerie(SGS_SERIES.IPCA, 3);
    expect(result).toEqual([{ data: '01/04/2026', valor: '0.67' }]);
  }, 10_000);

  it('NÃO faz retry quando payload é inválido (erro definitivo)', async () => {
    let tentativas = 0;
    mockAgent
      .get(BCB_ORIGIN)
      .intercept({
        path: `/dados/serie/bcdata.sgs.${SGS_SERIES.IPCA}/dados/ultimos/3?formato=json`,
        method: 'GET',
      })
      .reply(200, () => {
        tentativas++;
        return { erro: 'formato inesperado' };
      });

    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 3)).rejects.toThrow(/formato inesperado/);
    expect(tentativas).toBe(1); // só UMA chamada, sem retry
  });
});

describe('fetchSgsSerie - validação de input', () => {
  it('rejeita quantidade <= 0', async () => {
    await expect(fetchSgsSerie(SGS_SERIES.IPCA, 0)).rejects.toThrow();
    await expect(fetchSgsSerie(SGS_SERIES.IPCA, -1)).rejects.toThrow();
  });
});