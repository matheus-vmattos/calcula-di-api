/**
 * Tabela regressiva de IOF para resgates de investimentos de renda fixa
 * realizados em até 30 dias da aplicação.
 *
 * A alíquota incide sobre o RENDIMENTO (não sobre o principal).
 * Após 30 dias, IOF é zero.
 *
 * Base legal: Decreto 6.306/2007, Anexo.
 */

const TABELA_IOF: readonly number[] = [
  0.96, 0.93, 0.9, 0.86, 0.83, 0.8, 0.76, 0.73, 0.7, 0.66,
  0.63, 0.6, 0.56, 0.53, 0.5, 0.46, 0.43, 0.4, 0.36, 0.33,
  0.3, 0.26, 0.23, 0.2, 0.16, 0.13, 0.1, 0.06, 0.03, 0,
];

/**
 * Retorna a alíquota de IOF (em decimal) para um resgate após N dias corridos.
 *
 * @param diasCorridos - número de dias corridos desde a aplicação (≥ 1)
 * @returns alíquota em decimal (ex: 0.96 = 96%)
 * @throws Error se diasCorridos < 1
 */
export function getIofAliquota(diasCorridos: number): number {
  if (diasCorridos < 1 || !Number.isFinite(diasCorridos)) {
    throw new Error(`diasCorridos deve ser >= 1, recebido: ${diasCorridos}`);
  }

  if (diasCorridos >= 30) {
    return 0;
  }

  return TABELA_IOF[diasCorridos - 1];
}