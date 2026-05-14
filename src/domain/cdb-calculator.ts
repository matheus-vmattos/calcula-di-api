import { DIAS_UTEIS_ANO } from '../config/mercado.js';
import type { CdbInput, CdbResult } from '../shared/types.js';
import { getIofAliquota } from './iof-table.js';
import { getIrAliquota } from './ir-table.js';

/**
 * Calcula o rendimento de um CDB pós-fixado indexado ao CDI.
 *
 * FLUXO DE CÁLCULO:
 *   1. Converte a taxa CDI anual em taxa diária útil (base 252).
 *   2. Aplica o percentual do CDI contratado sobre essa taxa diária.
 *   3. Capitaliza pelos dias úteis do prazo (juros compostos).
 *   4. Calcula o rendimento bruto.
 *   5. Aplica IOF regressivo (se prazo < 30 dias corridos).
 *   6. Aplica IR regressivo sobre a base (rendimento - IOF).
 *   7. Retorna o detalhamento completo.
 *
 * @param input - parâmetros validados do investimento
 * @returns resultado detalhado com todos os componentes do cálculo
 * @throws Error se algum parâmetro for inválido
 */
export function calcularCdb(input: CdbInput): CdbResult {
  validarInput(input);

  const { valorInvestido, percentualCdi, taxaCdiAnual, diasCorridos, diasUteis } = input;

  // 1) taxa diária útil do CDI (base 252)
  //    formula: (1 + i_anual) ^ (1/252) - 1
  const taxaDiariaCdi = Math.pow(1 + taxaCdiAnual / 100, 1 / DIAS_UTEIS_ANO) - 1;

  // 2) taxa diária contratada = taxa diária CDI * (percentual / 100)
  //    Esta é a convenção de mercado para CDBs pós-fixados em % do CDI.
  const taxaDiariaContratada = taxaDiariaCdi * (percentualCdi / 100);

  // 3) fator de capitalização composta pelo prazo em dias úteis
  const fatorAcumulado = Math.pow(1 + taxaDiariaContratada, diasUteis);

  // 4) montante e rendimento bruto
  const montanteBruto = valorInvestido * fatorAcumulado;
  const rendimentoBruto = montanteBruto - valorInvestido;

  // 5) IOF regressivo (zero após 30 dias corridos)
  const aliquotaIof = getIofAliquota(diasCorridos);
  const iof = rendimentoBruto * aliquotaIof;

  // 6) IR regressivo sobre a base (rendimento bruto - IOF)
  const baseIr = rendimentoBruto - iof;
  const aliquotaIr = getIrAliquota(diasCorridos);
  const ir = baseIr * aliquotaIr;

  // 7) rendimento líquido e valor final
  const rendimentoLiquido = baseIr - ir;
  const valorFinal = valorInvestido + rendimentoLiquido;

  // Métricas derivadas
  const taxaContratadaAnual = (Math.pow(1 + taxaDiariaContratada, DIAS_UTEIS_ANO) - 1) * 100;
  const rentabilidadeLiquidaPercentual = (rendimentoLiquido / valorInvestido) * 100;

  return {
    valorInvestido,
    diasCorridos,
    diasUteis,
    taxaCdiAnual,
    percentualCdi,
    taxaContratadaAnual: arredondar(taxaContratadaAnual, 4),
    rendimentoBruto: arredondar(rendimentoBruto, 2),
    iof: arredondar(iof, 2),
    baseIr: arredondar(baseIr, 2),
    aliquotaIr,
    ir: arredondar(ir, 2),
    rendimentoLiquido: arredondar(rendimentoLiquido, 2),
    valorFinal: arredondar(valorFinal, 2),
    rentabilidadeLiquidaPercentual: arredondar(rentabilidadeLiquidaPercentual, 4),
  };
}

/**
 * Valida os parâmetros de entrada do cálculo. Lança Error em caso inválido.
 */
function validarInput(input: CdbInput): void {
  const { valorInvestido, percentualCdi, taxaCdiAnual, diasCorridos, diasUteis } = input;

  if (!Number.isFinite(valorInvestido) || valorInvestido <= 0) {
    throw new Error(`valorInvestido deve ser > 0, recebido: ${valorInvestido}`);
  }
  if (!Number.isFinite(percentualCdi) || percentualCdi <= 0) {
    throw new Error(`percentualCdi deve ser > 0, recebido: ${percentualCdi}`);
  }
  if (!Number.isFinite(taxaCdiAnual) || taxaCdiAnual < 0) {
    throw new Error(`taxaCdiAnual deve ser >= 0, recebido: ${taxaCdiAnual}`);
  }
  if (!Number.isFinite(diasCorridos) || diasCorridos < 1) {
    throw new Error(`diasCorridos deve ser >= 1, recebido: ${diasCorridos}`);
  }
  if (!Number.isFinite(diasUteis) || diasUteis < 1) {
    throw new Error(`diasUteis deve ser >= 1, recebido: ${diasUteis}`);
  }
}

/**
 * Arredonda um número para N casas decimais usando arredondamento padrão.
 */
function arredondar(valor: number, casas: number): number {
  const fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}