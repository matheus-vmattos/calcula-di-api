/**
 * Constantes do mercado financeiro brasileiro.
 *
 * Estas convenções seguem os padrões ANBIMA/B3 amplamente adotados
 * por bancos e corretoras no Brasil.
 */

/** Dias úteis em um ano (base ANBIMA/B3 para taxas anuais). */
export const DIAS_UTEIS_ANO = 252;

/** Dias corridos em um ano (convenção comercial do mercado financeiro). */
export const DIAS_CORRIDOS_ANO = 360;

/** Dias corridos em um mês (convenção comercial). */
export const DIAS_CORRIDOS_MES = 30;

/** Dias úteis aproximados em um mês (252 / 12). */
export const DIAS_UTEIS_MES = 21;

/**
 * Fator de conversão aproximado entre dias corridos e dias úteis.
 *
 * Usado quando o usuário informa um prazo em dias corridos e
 * precisamos estimar quantos dias úteis há nesse intervalo.
 * Derivado de 360/252 ≈ 1.428, arredondado para 1.4 (precisão suficiente
 * para apresentação ao usuário final; cálculos críticos devem usar
 * datas reais e calendário de feriados).
 */
export const FATOR_CORRIDO_PARA_UTIL = 1.4;