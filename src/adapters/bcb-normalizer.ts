import {
  acumularTaxasCompostas,
  anualParaDiaria,
  diariaParaAnual,
} from '../domain/capitalizacao.js';
import type {
  IndiceAnual,
  IndiceMensal,
  SgsObservation,
} from '../shared/types.js';

/**
 * Normalizadores: convertem o formato bruto da API SGS do Banco Central
 * em estruturas tipadas, validadas e prontas para consumo pelo frontend.
 *
 * Cada função recebe a saída de `fetchSgsSerie(...)` e devolve um objeto
 * com os dados já calculados, formatados e validados.
 */

const NOMES_MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

const ESPERADO_MENSAL = 12;

// ─── HELPERS DE PARSING E FORMATAÇÃO ────────────────────────────────────────

function parseValor(raw: string): number {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`valor inválido recebido do BCB: "${raw}"`);
  }
  return n;
}

function parseDataBcb(raw: string): Date {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!match) {
    throw new Error(`data em formato inesperado: "${raw}" (esperado DD/MM/YYYY)`);
  }
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`data inválida: "${raw}"`);
  }
  return date;
}

function formatarDataIso(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatarMesTecnico(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${mm}/${date.getFullYear()}`;
}

function formatarMesDisplay(date: Date): string {
  return `${NOMES_MESES_PT[date.getMonth()]}/${date.getFullYear()}`;
}

function validarOrdem(datas: readonly Date[]): void {
  for (let i = 1; i < datas.length; i++) {
    if (datas[i].getTime() <= datas[i - 1].getTime()) {
      throw new Error('observações fora de ordem cronológica (esperado crescente)');
    }
  }
}

function arredondar(valor: number, casas: number): number {
  const fator = Math.pow(10, casas);
  return Math.round(valor * fator) / fator;
}

// ─── NORMALIZADORES MENSAIS (IPCA, IGP-M) ───────────────────────────────────

function normalizarMensal(
  nome: IndiceMensal['nome'],
  observacoes: readonly SgsObservation[],
): IndiceMensal {
  if (observacoes.length < ESPERADO_MENSAL) {
    throw new Error(
      `${nome}: esperado ${ESPERADO_MENSAL} observações, recebido ${observacoes.length}`,
    );
  }

  const ultimas = observacoes.slice(-ESPERADO_MENSAL);

  const datas = ultimas.map((o) => parseDataBcb(o.data));
  const valores = ultimas.map((o) => parseValor(o.valor));

  validarOrdem(datas);

  const ultimaData = datas[datas.length - 1];
  const ultimoValor = valores[valores.length - 1];
  const acumulado12m = acumularTaxasCompostas(valores);

  return {
    nome,
    valorMes: ultimoValor,
    acumulado12m: arredondar(acumulado12m, 4),
    mesReferencia: formatarMesTecnico(ultimaData),
    mesReferenciaDisplay: formatarMesDisplay(ultimaData),
    dataAtualizacao: formatarDataIso(ultimaData),
  };
}

export function normalizarIpca(observacoes: readonly SgsObservation[]): IndiceMensal {
  return normalizarMensal('IPCA', observacoes);
}

export function normalizarIgpm(observacoes: readonly SgsObservation[]): IndiceMensal {
  return normalizarMensal('IGP-M', observacoes);
}

// ─── NORMALIZADORES ANUAIS/DIÁRIOS (SELIC, CDI) ─────────────────────────────

export function normalizarSelic(observacoes: readonly SgsObservation[]): IndiceAnual {
  if (observacoes.length === 0) {
    throw new Error('SELIC: nenhuma observação recebida');
  }
  const ultima = observacoes[observacoes.length - 1];
  const data = parseDataBcb(ultima.data);
  const valorAnual = parseValor(ultima.valor);
  const valorDiarioEquivalente = anualParaDiaria(valorAnual);

  return {
    nome: 'SELIC',
    valorAnual,
    valorDiarioEquivalente: arredondar(valorDiarioEquivalente, 4),
    dataAtualizacao: formatarDataIso(data),
  };
}

export function normalizarCdi(observacoes: readonly SgsObservation[]): IndiceAnual {
  if (observacoes.length === 0) {
    throw new Error('CDI: nenhuma observação recebida');
  }
  const ultima = observacoes[observacoes.length - 1];
  const data = parseDataBcb(ultima.data);
  const valorDiario = parseValor(ultima.valor);
  const valorAnual = diariaParaAnual(valorDiario);

  return {
    nome: 'CDI',
    valorAnual: arredondar(valorAnual, 4),
    valorDiarioEquivalente: valorDiario,
    dataAtualizacao: formatarDataIso(data),
  };
}