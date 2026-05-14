import {
  DIAS_CORRIDOS_ANO,
  DIAS_CORRIDOS_MES,
  DIAS_UTEIS_ANO,
  DIAS_UTEIS_MES,
  FATOR_CORRIDO_PARA_UTIL,
} from '../config/mercado.js';

/**
 * Unidades de tempo aceitas para informar o prazo de uma aplicação.
 */
export type UnidadePrazo = 'dias' | 'meses' | 'anos';

/**
 * Resultado da conversão de um prazo para as duas grandezas usadas
 * em cálculos de renda fixa.
 */
export interface PrazoConvertido {
  /** Dias corridos (calendário) — usado para IR e IOF. */
  diasCorridos: number;
  /** Dias úteis (base 252) — usado para capitalização de juros. */
  diasUteis: number;
}

/**
 * Converte um prazo informado em uma unidade qualquer (dias, meses, anos)
 * para as duas grandezas necessárias ao cálculo de renda fixa: dias corridos
 * (calendário) e dias úteis (base 252).
 *
 * Convenções aplicadas:
 *   - 1 ano  = 360 dias corridos = 252 dias úteis
 *   - 1 mês  = 30 dias corridos  = 21 dias úteis
 *   - dias corridos → úteis: divisão por 1.4 (aproximação)
 *
 * @param valor - quantidade da unidade (deve ser > 0)
 * @param unidade - 'dias' | 'meses' | 'anos'
 * @returns objeto com diasCorridos e diasUteis
 * @throws Error se valor inválido ou unidade desconhecida
 */
export function converterPrazo(valor: number, unidade: UnidadePrazo): PrazoConvertido {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`valor deve ser > 0, recebido: ${valor}`);
  }

  switch (unidade) {
    case 'dias':
      return {
        diasCorridos: Math.round(valor),
        diasUteis: Math.round(valor / FATOR_CORRIDO_PARA_UTIL),
      };

    case 'meses':
      if (!Number.isInteger(valor)) {
        throw new Error(`valor em meses deve ser inteiro, recebido: ${valor}`);
      }
      return {
        diasCorridos: valor * DIAS_CORRIDOS_MES,
        diasUteis: valor * DIAS_UTEIS_MES,
      };

    case 'anos':
      if (!Number.isInteger(valor)) {
        throw new Error(`valor em anos deve ser inteiro, recebido: ${valor}`);
      }
      return {
        diasCorridos: valor * DIAS_CORRIDOS_ANO,
        diasUteis: valor * DIAS_UTEIS_ANO,
      };

    default:
      throw new Error(`unidade inválida: ${String(unidade)}`);
  }
}