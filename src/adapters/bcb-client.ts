import { BCB_CONFIG } from '../config/bcb.js';
import type { SgsObservation, SgsSerieCode } from '../shared/types.js';

/**
 * Erro lançado quando a comunicação com a API SGS falha.
 *
 * - statusCode: status HTTP da resposta (quando aplicável).
 * - serieCode: código da série que falhou.
 * - retryable: indica se uma nova tentativa pode resolver o problema.
 *   Erros não-retryable são "definitivos" (input ruim, payload malformado,
 *   etc) — repetir não muda o resultado e só desperdiça recursos.
 */
export class BcbApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly serieCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'BcbApiError';
  }
}

/**
 * Busca as últimas N observações de uma série do SGS (Banco Central do Brasil).
 *
 * Usa `fetch` nativo (compatível com Cloudflare Workers, Node 18+ e browsers).
 * Implementa retry com backoff linear para tolerar falhas transitórias.
 *
 * @param serie - código numérico da série SGS (ex: 433 para IPCA)
 * @param quantidade - número de observações a buscar (default: 12)
 * @returns array de observações no formato { data, valor }
 * @throws BcbApiError em caso de falha após todas as tentativas
 */
export async function fetchSgsSerie(
  serie: SgsSerieCode,
  quantidade: number = BCB_CONFIG.defaultObservations,
): Promise<SgsObservation[]> {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new BcbApiError(`quantidade deve ser inteiro > 0, recebido: ${quantidade}`);
  }

  const totalTentativas = BCB_CONFIG.retries + 1;
  let ultimoErro: BcbApiError | undefined;

  for (let tentativa = 1; tentativa <= totalTentativas; tentativa++) {
    try {
      return await executarRequisicao(serie, quantidade);
    } catch (err) {
      ultimoErro = err instanceof BcbApiError ? err : new BcbApiError(String(err));

      // Erros definitivos (não-retryable) param na hora.
      if (!ultimoErro.retryable) {
        throw ultimoErro;
      }

      // Se ainda há tentativas, aguarda e tenta de novo
      if (tentativa < totalTentativas) {
        await delay(BCB_CONFIG.retryDelayMs * tentativa); // backoff linear
      }
    }
  }

  throw ultimoErro ?? new BcbApiError('falha inesperada após todas as tentativas');
}

/**
 * Executa uma única tentativa de requisição HTTP contra a API SGS.
 * Separada de `fetchSgsSerie` para isolar a lógica de retry.
 */
async function executarRequisicao(
  serie: SgsSerieCode,
  quantidade: number,
): Promise<SgsObservation[]> {
  const url = `${BCB_CONFIG.baseUrl}/bcdata.sgs.${serie}/dados/ultimos/${quantidade}?formato=json`;

  // AbortController para implementar timeout no fetch nativo
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BCB_CONFIG.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    // Erros de rede e timeouts SÃO retryable (podem ser transitórios)
    const detail = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    const msg = isTimeout
      ? `timeout (${BCB_CONFIG.timeoutMs}ms) ao consultar BCB`
      : `falha de rede ao consultar BCB: ${detail}`;
    throw new BcbApiError(msg, undefined, serie, true);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    // 5xx é retryable; 4xx não.
    const retryable = response.status >= 500;
    throw new BcbApiError(
      `BCB retornou status ${response.status} para série ${serie}`,
      response.status,
      serie,
      retryable,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new BcbApiError(`payload JSON inválido do BCB: ${detail}`, response.status, serie, false);
  }

  if (!Array.isArray(payload)) {
    throw new BcbApiError(
      `formato inesperado: esperado array, recebido ${typeof payload}`,
      response.status,
      serie,
      false,
    );
  }

  for (const item of payload) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).data !== 'string' ||
      typeof (item as Record<string, unknown>).valor !== 'string'
    ) {
      throw new BcbApiError(
        `observação malformada: ${JSON.stringify(item)}`,
        response.status,
        serie,
        false,
      );
    }
  }

  return payload as SgsObservation[];
}

/**
 * Promise que resolve após N milissegundos.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}