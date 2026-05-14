/**
 * Tipos de dados compartilhados entre os módulos do domínio.
 */

/**
 * Resultado do cálculo de um investimento em CDB pós-fixado.
 * Todos os valores monetários estão em reais (R$).
 */
export interface CdbResult {
  valorInvestido: number;
  diasCorridos: number;
  diasUteis: number;
  taxaCdiAnual: number;        // ex: 14.9 (em %)
  percentualCdi: number;        // ex: 120 (em %)
  taxaContratada: number;       // taxa efetiva anual contratada (em %)
  rendimentoBruto: number;
  iof: number;
  baseIr: number;               // rendimento após IOF, base de cálculo do IR
  aliquotaIr: number;           // ex: 0.225 (decimal)
  ir: number;
  rendimentoLiquido: number;
  valorFinal: number;
  rentabilidadeLiquidaPercentual: number; // % sobre o valor investido
}

/**
 * Parâmetros para calcular o rendimento de um CDB pós-fixado.
 */
export interface CdbInput {
  valorInvestido: number;       // R$
  percentualCdi: number;        // % do CDI (ex: 120 para "120% do CDI")
  taxaCdiAnual: number;         // taxa CDI anual em % (ex: 14.9)
  diasCorridos: number;         // prazo da aplicação em dias corridos
  diasUteis: number;            // prazo da aplicação em dias úteis
}