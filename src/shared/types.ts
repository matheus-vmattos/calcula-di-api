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
// ============================================================================
// Adapter BCB — tipos
// ============================================================================

/**
 * Representa uma observação bruta retornada pela API SGS do Banco Central.
 * Formato original: { data: "DD/MM/YYYY", valor: "string numérica" }
 */
export interface SgsObservation {
  data: string;   // "DD/MM/YYYY"
  valor: string;  // ex: "0.67" ou "14.50"
}

/**
 * Identificadores das séries SGS do BCB que usamos no projeto.
 */
export const SGS_SERIES = {
  IPCA: 433,
  IGPM: 189,
  SELIC_META: 432,
  CDI: 12,
} as const;

export type SgsSerieCode = (typeof SGS_SERIES)[keyof typeof SGS_SERIES];
// ============================================================================
// Tipos de saída do normalizador (consumidos pelo frontend)
// ============================================================================

/**
 * Índice publicado em base mensal (IPCA, IGP-M).
 *
 * - valorMes: variação do último mês disponível (%).
 * - acumulado12m: acumulado dos últimos 12 meses por capitalização composta (%).
 * - mesReferencia: formato técnico "MM/YYYY" (ordenação e lógica).
 * - mesReferenciaDisplay: formato amigável "Abril/2026" (UI).
 * - dataAtualizacao: data completa de publicação no BCB (ISO).
 */
export interface IndiceMensal {
  nome: 'IPCA' | 'IGP-M';
  valorMes: number;
  acumulado12m: number;
  mesReferencia: string;
  mesReferenciaDisplay: string;
  dataAtualizacao: string;
}

/**
 * Índice publicado em base anual ou diária (Selic, CDI).
 *
 * - valorAnual: taxa em % ao ano.
 * - valorDiarioEquivalente: taxa em % ao dia útil (referencial).
 * - dataAtualizacao: última data de publicação no BCB (ISO).
 */
export interface IndiceAnual {
  nome: 'SELIC' | 'CDI';
  valorAnual: number;
  valorDiarioEquivalente: number;
  dataAtualizacao: string;
}
// ============================================================================
// Saída do IndicesService (consumida pelo endpoint HTTP)
// ============================================================================

/**
 * Snapshot completo dos 4 índices monitorados.
 *
 * - geradoEm: timestamp ISO de quando o snapshot foi montado (UTC).
 * - origem: indica se os dados vieram do cache ou foram buscados agora.
 */
export interface IndicesSnapshot {
  ipca: IndiceMensal | null;
  igpm: IndiceMensal | null;
  selic: IndiceAnual | null;
  cdi: IndiceAnual | null;
  geradoEm: string;
  origem: 'cache' | 'live' | 'parcial';
}
// ============================================================================
// Ambiente do Cloudflare Worker (bindings configurados via wrangler.toml)
// ============================================================================

/**
 * Bindings disponíveis em runtime no Cloudflare Worker.
 * Refletem o que está definido em wrangler.toml.
 */
export interface WorkerEnv {
  /** Namespace KV para cache. Vem do binding [[kv_namespaces]]. */
  CACHE_KV: KVNamespace;
  /** TTL do cache em segundos. Vem de [vars]. */
  CACHE_TTL_SECONDS: string;
}