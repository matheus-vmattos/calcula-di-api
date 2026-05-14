/**
 * Tabela regressiva de IR sobre o rendimento de aplicações de renda fixa.
 *
 * A alíquota incide sobre o RENDIMENTO (após dedução do IOF, se houver).
 * Base legal: Lei 11.033/2004, art. 1º.
 */

/**
 * Retorna a alíquota de IR (em decimal) para um resgate após N dias corridos.
 *
 * @param diasCorridos - número de dias corridos desde a aplicação (≥ 1)
 * @returns alíquota em decimal:
 *   - 0.225 (22.5%) até 180 dias
 *   - 0.200 (20%)   de 181 a 360 dias
 *   - 0.175 (17.5%) de 361 a 720 dias
 *   - 0.150 (15%)   acima de 720 dias
 * @throws Error se diasCorridos < 1
 */
export function getIrAliquota(diasCorridos: number): number {
  if (diasCorridos < 1 || !Number.isFinite(diasCorridos)) {
    throw new Error(`diasCorridos deve ser >= 1, recebido: ${diasCorridos}`);
  }

  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.2;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
}