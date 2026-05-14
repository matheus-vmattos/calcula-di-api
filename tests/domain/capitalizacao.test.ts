import { describe, it, expect } from 'vitest';
import {
  acumularTaxasCompostas,
  diariaParaAnual,
  anualParaDiaria,
} from '../../src/domain/capitalizacao.js';

describe('acumularTaxasCompostas', () => {
  it('acumula 12 taxas mensais de 1% → 12,68%', () => {
    const taxas = Array(12).fill(1);
    const r = acumularTaxasCompostas(taxas);
    expect(r).toBeCloseTo(12.6825, 3);
  });

  it('acumula 2 taxas de 1% → 2,01% (não 2%)', () => {
    const r = acumularTaxasCompostas([1, 1]);
    expect(r).toBeCloseTo(2.01, 4);
  });

  it('aceita taxas zeradas (resultado 0)', () => {
    expect(acumularTaxasCompostas([0, 0, 0])).toBeCloseTo(0, 6);
  });

  it('aceita taxa única (passthrough)', () => {
    expect(acumularTaxasCompostas([5])).toBeCloseTo(5, 6);
  });

  it('aceita taxas negativas (deflação)', () => {
    // -0.5% + -0.5% = -0.9975% (não -1%)
    const r = acumularTaxasCompostas([-0.5, -0.5]);
    expect(r).toBeCloseTo(-0.9975, 4);
  });

  it('lança erro com array vazio', () => {
    expect(() => acumularTaxasCompostas([])).toThrow();
  });

  it('lança erro se algum valor não for número finito', () => {
    expect(() => acumularTaxasCompostas([1, NaN])).toThrow();
    expect(() => acumularTaxasCompostas([1, Infinity])).toThrow();
  });
});

describe('diariaParaAnual (base 252)', () => {
  it('converte CDI 0,0534% a.d. → ~14,40% a.a.', () => {
    const r = diariaParaAnual(0.0534);
    expect(r).toBeCloseTo(14.4, 1);
  });

  it('taxa diária zero → anual zero', () => {
    expect(diariaParaAnual(0)).toBeCloseTo(0, 6);
  });

  it('lança erro com valor negativo', () => {
    expect(() => diariaParaAnual(-0.01)).toThrow();
  });

  it('lança erro com valor não-finito', () => {
    expect(() => diariaParaAnual(NaN)).toThrow();
  });
});

describe('anualParaDiaria (base 252)', () => {
  it('converte Selic 14,5% a.a. → ~0,0537% a.d.', () => {
    const r = anualParaDiaria(14.5);
    expect(r).toBeCloseTo(0.0537, 3);
  });

  it('taxa anual zero → diária zero', () => {
    expect(anualParaDiaria(0)).toBeCloseTo(0, 6);
  });

  it('é o inverso de diariaParaAnual (round-trip)', () => {
    const original = 0.0534;
    const ida = diariaParaAnual(original);
    const volta = anualParaDiaria(ida);
    expect(volta).toBeCloseTo(original, 6);
  });

  it('lança erro com valor negativo', () => {
    expect(() => anualParaDiaria(-1)).toThrow();
  });
});