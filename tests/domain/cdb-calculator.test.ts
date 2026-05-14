import { describe, it, expect } from 'vitest';
import { calcularCdb } from '../../src/domain/cdb-calculator.js';

/**
 * Para validar a precisão dos cálculos, use o simulador da B3:
 * https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/educacao-financeira/simuladores/simulador-de-renda-fixa/
 *
 * Ou o simulador do Tesouro Direto / qualquer corretora.
 */
describe('calcularCdb - cenário base (1 ano, 100% CDI)', () => {
  const input = {
    valorInvestido: 10000,
    percentualCdi: 100,
    taxaCdiAnual: 10, // 10% a.a.
    diasCorridos: 360,
    diasUteis: 252,
  };

  it('retorna todos os campos do resultado', () => {
    const r = calcularCdb(input);
    expect(r).toHaveProperty('valorInvestido', 10000);
    expect(r).toHaveProperty('rendimentoBruto');
    expect(r).toHaveProperty('iof');
    expect(r).toHaveProperty('ir');
    expect(r).toHaveProperty('rendimentoLiquido');
    expect(r).toHaveProperty('valorFinal');
  });

  it('rendimento bruto ≈ R$ 1.000 (10% a.a. sobre R$ 10k)', () => {
    const r = calcularCdb(input);
    expect(r.rendimentoBruto).toBeCloseTo(1000, 0);
  });

  it('IOF é zero após 30 dias', () => {
    const r = calcularCdb(input);
    expect(r.iof).toBe(0);
  });

  it('IR é 17.5% sobre o rendimento (entre 361-720 dias falha; aqui 360 = 20%)', () => {
    const r = calcularCdb(input);
    // 360 dias → alíquota 20%
    expect(r.aliquotaIr).toBe(0.2);
    expect(r.ir).toBeCloseTo(200, 0);
  });

  it('rendimento líquido ≈ R$ 800', () => {
    const r = calcularCdb(input);
    expect(r.rendimentoLiquido).toBeCloseTo(800, 0);
  });

  it('valor final ≈ R$ 10.800', () => {
    const r = calcularCdb(input);
    expect(r.valorFinal).toBeCloseTo(10800, 0);
  });
});

describe('calcularCdb - 120% CDI rende mais que 100%', () => {
  const base = {
    valorInvestido: 10000,
    taxaCdiAnual: 10,
    diasCorridos: 360,
    diasUteis: 252,
  };

  it('120% CDI > 100% CDI em rendimento líquido', () => {
    const r100 = calcularCdb({ ...base, percentualCdi: 100 });
    const r120 = calcularCdb({ ...base, percentualCdi: 120 });
    expect(r120.rendimentoLiquido).toBeGreaterThan(r100.rendimentoLiquido);
  });
});

describe('calcularCdb - resgate curtíssimo prazo (IOF + IR máximos)', () => {
  it('15 dias: IOF de 50% + IR de 22.5%', () => {
    const r = calcularCdb({
      valorInvestido: 10000,
      percentualCdi: 100,
      taxaCdiAnual: 10,
      diasCorridos: 15,
      diasUteis: 11, // ~15 / 1.4
    });

    // Alíquotas corretas
    expect(r.aliquotaIr).toBe(0.225);

    // IOF não pode ser zero (resgate dentro de 30 dias)
    expect(r.iof).toBeGreaterThan(0);

    // Líquido < Bruto (sempre)
    expect(r.rendimentoLiquido).toBeLessThan(r.rendimentoBruto);
  });
});

describe('calcularCdb - faixas de IR', () => {
  const base = {
    valorInvestido: 10000,
    percentualCdi: 100,
    taxaCdiAnual: 10,
  };

  it('até 180 dias: alíquota 22.5%', () => {
    const r = calcularCdb({ ...base, diasCorridos: 90, diasUteis: 64 });
    expect(r.aliquotaIr).toBe(0.225);
  });

  it('181-360 dias: alíquota 20%', () => {
    const r = calcularCdb({ ...base, diasCorridos: 300, diasUteis: 214 });
    expect(r.aliquotaIr).toBe(0.2);
  });

  it('361-720 dias: alíquota 17.5%', () => {
    const r = calcularCdb({ ...base, diasCorridos: 540, diasUteis: 378 });
    expect(r.aliquotaIr).toBe(0.175);
  });

  it('acima de 720 dias: alíquota 15%', () => {
    const r = calcularCdb({ ...base, diasCorridos: 1080, diasUteis: 756 });
    expect(r.aliquotaIr).toBe(0.15);
  });
});

describe('calcularCdb - validações de entrada', () => {
  const base = {
    valorInvestido: 10000,
    percentualCdi: 100,
    taxaCdiAnual: 10,
    diasCorridos: 360,
    diasUteis: 252,
  };

  it('lança erro com valor investido <= 0', () => {
    expect(() => calcularCdb({ ...base, valorInvestido: 0 })).toThrow();
    expect(() => calcularCdb({ ...base, valorInvestido: -100 })).toThrow();
  });

  it('lança erro com percentual CDI <= 0', () => {
    expect(() => calcularCdb({ ...base, percentualCdi: 0 })).toThrow();
    expect(() => calcularCdb({ ...base, percentualCdi: -50 })).toThrow();
  });

  it('lança erro com taxa CDI negativa', () => {
    expect(() => calcularCdb({ ...base, taxaCdiAnual: -1 })).toThrow();
  });

  it('lança erro com dias inválidos', () => {
    expect(() => calcularCdb({ ...base, diasCorridos: 0 })).toThrow();
    expect(() => calcularCdb({ ...base, diasUteis: 0 })).toThrow();
  });
});