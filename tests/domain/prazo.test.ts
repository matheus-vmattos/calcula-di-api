import { describe, it, expect } from 'vitest';
import { converterPrazo } from '../../src/domain/prazo.js';

describe('converterPrazo - unidade DIAS', () => {
  it('converte 30 dias mantendo o valor', () => {
    const r = converterPrazo(30, 'dias');
    expect(r.diasCorridos).toBe(30);
    expect(r.diasUteis).toBe(21); // 30 / 1.4 ≈ 21
  });

 it('converte 365 dias corridos em ~261 úteis (fator 1.4)', () => {
    const r = converterPrazo(365, 'dias');
    expect(r.diasCorridos).toBe(365);
    expect(r.diasUteis).toBe(261); // 365 / 1.4 ≈ 260.7
  });
});

describe('converterPrazo - unidade MESES', () => {
  it('converte 1 mês em 30 corridos e 21 úteis', () => {
    const r = converterPrazo(1, 'meses');
    expect(r.diasCorridos).toBe(30);
    expect(r.diasUteis).toBe(21);
  });

  it('converte 6 meses em 180 corridos e 126 úteis', () => {
    const r = converterPrazo(6, 'meses');
    expect(r.diasCorridos).toBe(180);
    expect(r.diasUteis).toBe(126);
  });

  it('converte 24 meses (≈ 2 anos)', () => {
    const r = converterPrazo(24, 'meses');
    expect(r.diasCorridos).toBe(720);
    expect(r.diasUteis).toBe(504);
  });
});

describe('converterPrazo - unidade ANOS', () => {
  it('converte 1 ano em 360 corridos e 252 úteis', () => {
    const r = converterPrazo(1, 'anos');
    expect(r.diasCorridos).toBe(360);
    expect(r.diasUteis).toBe(252);
  });

  it('converte 2 anos em 720 corridos e 504 úteis', () => {
    const r = converterPrazo(2, 'anos');
    expect(r.diasCorridos).toBe(720);
    expect(r.diasUteis).toBe(504);
  });

  it('converte 5 anos', () => {
    const r = converterPrazo(5, 'anos');
    expect(r.diasCorridos).toBe(1800);
    expect(r.diasUteis).toBe(1260);
  });
});

describe('converterPrazo - validações', () => {
  it('lança erro com valor <= 0', () => {
    expect(() => converterPrazo(0, 'dias')).toThrow();
    expect(() => converterPrazo(-5, 'meses')).toThrow();
  });

  it('lança erro com unidade inválida', () => {
    // @ts-expect-error - testando comportamento em runtime
    expect(() => converterPrazo(10, 'semanas')).toThrow();
  });

  it('lança erro com valor não-inteiro nos modos meses/anos', () => {
    expect(() => converterPrazo(1.5, 'meses')).toThrow();
    expect(() => converterPrazo(2.7, 'anos')).toThrow();
  });
});