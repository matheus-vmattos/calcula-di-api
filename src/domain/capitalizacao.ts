import { DIAS_UTEIS_ANO } from '../config/mercado.js';

/**
 * Funções de capitalização e conversão de taxas usadas em renda fixa.
 *
 * Todas as taxas são manipuladas em PERCENTUAL (ex: 0.67 = 0,67%),
 * nunca em decimal (0.0067). A conversão é feita internamente.
 */

/**
 * Acumula uma sequência de taxas mensais usando capitalização composta.
 *
 * Fórmula: [(1 + i₁/100) × (1 + i₂/100) × ... × (1 + iₙ/100)] - 1
 *
 * Usada para calcular acumulado de 12 meses de IPCA, IGP-M e outros índices
 * publicados em base mensal.
 *
 * Exemplo: doze taxas de 1% NÃO somam 12% — acumulam 12,6825%, porque
 * cada mês incide sobre o valor já corrigido pelos meses anteriores.
 *
 * @param taxas - array de taxas em PERCENTUAL (ex: 0.67 para 0,67%)
 * @returns taxa acumulada em PERCENTUAL
 * @throws Error se array vazio ou contiver valor não-finito
 */
export function acumularTaxasCompostas(taxas: readonly number[]): number {
  if (taxas.length === 0) {
    throw new Error('acumularTaxasCompostas: array de taxas não pode ser vazio');
  }

  let fator = 1;
  for (const taxa of taxas) {
    if (!Number.isFinite(taxa)) {
      throw new Error(`acumularTaxasCompostas: taxa inválida: ${taxa}`);
    }
    fator *= 1 + taxa / 100;
  }

  return (fator - 1) * 100;
}

/**
 * Converte uma taxa diária útil para taxa anual equivalente (base 252).
 *
 * Fórmula: (1 + diaria/100)^252 - 1
 *
 * Usada para anualizar o CDI (que é publicado pelo BCB em taxa diária).
 *
 * @param taxaDiaria - taxa em PERCENTUAL ao dia útil (ex: 0.0534)
 * @returns taxa equivalente em PERCENTUAL ao ano
 * @throws Error se valor negativo ou não-finito
 */
export function diariaParaAnual(taxaDiaria: number): number {
  if (!Number.isFinite(taxaDiaria) || taxaDiaria < 0) {
    throw new Error(`diariaParaAnual: taxa inválida: ${taxaDiaria}`);
  }
  return (Math.pow(1 + taxaDiaria / 100, DIAS_UTEIS_ANO) - 1) * 100;
}

/**
 * Converte uma taxa anual para taxa diária útil equivalente (base 252).
 *
 * Fórmula: (1 + anual/100)^(1/252) - 1
 *
 * Usada para mostrar ao usuário a taxa diária equivalente da Selic.
 *
 * @param taxaAnual - taxa em PERCENTUAL ao ano (ex: 14.5)
 * @returns taxa equivalente em PERCENTUAL ao dia útil
 * @throws Error se valor negativo ou não-finito
 */
export function anualParaDiaria(taxaAnual: number): number {
  if (!Number.isFinite(taxaAnual) || taxaAnual < 0) {
    throw new Error(`anualParaDiaria: taxa inválida: ${taxaAnual}`);
  }
  return (Math.pow(1 + taxaAnual / 100, 1 / DIAS_UTEIS_ANO) - 1) * 100;
}