/**
 * Tipos de dados compartilhados entre os módulos do domínio.
 */

/**
 * Parâmetros para calcular o rendimento de um CDB pós-fixado em % do CDI.
 * Todos os valores monetários em reais (R$).
 */
export interface CdbInput {
  /** Valor aplicado, em R$. Deve ser > 0. */
  valorInvestido: number;
  /** Percentual do CDI contratado. Ex: 120 para "120% do CDI". Deve ser > 0. */
  percentualCdi: number;
  /** Taxa CDI anual atual, em %. Ex: 14.9 para 14,9% a.a. Deve ser >= 0. */
  taxaCdiAnual: number;
  /** Prazo em dias corridos. Usado para IR e IOF. Deve ser >= 1. */
  diasCorridos: number;
  /** Prazo em dias úteis (base 252). Usado para capitalização. Deve ser >= 1. */
  diasUteis: number;
}

/**
 * Resultado detalhado do cálculo de um CDB pós-fixado.
 * Todos os valores monetários em reais (R$).
 */
export interface CdbResult {
  /** Valor aplicado (espelho do input, para conveniência do consumidor). */
  valorInvestido: number;
  /** Prazo em dias corridos. */
  diasCorridos: number;
  /** Prazo em dias úteis. */
  diasUteis: number;
  /** Taxa CDI anual usada (em %). */
  taxaCdiAnual: number;
  /** Percentual do CDI contratado (em %). */
  percentualCdi: number;
  /** Taxa efetiva anual contratada (em %). Ex: 120% de 10% a.a. → 12% a.a. */
  taxaContratadaAnual: number;
  /** Rendimento antes de impostos (R$). */
  rendimentoBruto: number;
  /** IOF retido (R$). Zero para resgates após 30 dias corridos. */
  iof: number;
  /** Base de cálculo do IR: rendimento bruto menos IOF (R$). */
  baseIr: number;
  /** Alíquota de IR aplicada (decimal). Ex: 0.225 = 22,5%. */
  aliquotaIr: number;
  /** IR retido (R$). */
  ir: number;
  /** Rendimento líquido após IOF e IR (R$). */
  rendimentoLiquido: number;
  /** Valor final a ser resgatado (R$). */
  valorFinal: number;
  /** Rentabilidade líquida sobre o valor investido (em %). */
  rentabilidadeLiquidaPercentual: number;
}