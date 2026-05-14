import { request, getGlobalDispatcher } from 'undici';
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
 * Implementa retry com backoff linear para tolerar falhas transitórias
 * (timeouts intermitentes do BCB, especialmente da série IGP-M).
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

      // Só faz retry em erros marcados como retryable (5xx, timeouts, falhas de rede).
      // Erros definitivos (4xx, payload inválido, validação) param na hora.
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

  let response;
  try {
    response = await request(url, {
      method: 'GET',
      headersTimeout: BCB_CONFIG.timeoutMs,
      bodyTimeout: BCB_CONFIG.timeoutMs,
      dispatcher: getGlobalDispatcher(),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // Erros de rede SÃO retryable (timeout pode ser transitório)
    throw new BcbApiError(`falha de rede ao consultar BCB: ${detail}`, undefined, serie, true);
  }

  const { statusCode, body } = response;

  if (statusCode < 200 || statusCode >= 300) {
    await body.dump();
    // 5xx é retryable (servidor pode se recuperar); 4xx não (erro do cliente)
    const retryable = statusCode >= 500;
    throw new BcbApiError(
      `BCB retornou status ${statusCode} para série ${serie}`,
      statusCode,
      serie,
      retryable,
    );
  }

  let payload: unknown;
  try {
    payload = await body.json();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // JSON inválido NÃO é retryable — é determinístico
    throw new BcbApiError(`payload JSON inválido do BCB: ${detail}`, statusCode, serie, false);
  }

  if (!Array.isArray(payload)) {
    // Estrutura errada NÃO é retryable
    throw new BcbApiError(
      `formato inesperado: esperado array, recebido ${typeof payload}`,
      statusCode,
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
        statusCode,
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