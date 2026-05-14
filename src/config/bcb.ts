/**
 * Configuração do cliente da API SGS do Banco Central.
 *
 * Documentação oficial:
 * https://www3.bcb.gov.br/sgspub/JSP/sgsgeral/FachadaSGSPNHelp.jsp
 */

export const BCB_CONFIG = {
  /** URL base da API SGS. */
  baseUrl: 'https://api.bcb.gov.br/dados/serie',

  /**
   * Timeout máximo por requisição (ms).
   *
   * A série 189 (IGP-M) tipicamente é mais lenta porque o BCB
   * coleta de fonte externa (FGV). 10s é folga suficiente.
   */
  timeoutMs: 10_000,

  /** Quantidade default de observações (12 = acumulado anual). */
  defaultObservations: 12,

  /**
   * Política de retry em caso de falha transitória.
   * Total de tentativas = retries + 1.
   */
  retries: 2,
  retryDelayMs: 500,
} as const;