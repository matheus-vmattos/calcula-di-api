import { describe, it, expect } from 'vitest';
import { getIrAliquota } from '../../src/domain/ir-table.js';

describe('IR regressivo (renda fixa)', () => {
  it('aplica 22.5% até 180 dias', () => {
    expect(getIrAliquota(1)).toBe(0.225);
    expect(getIrAliquota(90)).toBe(0.225);
    expect(getIrAliquota(180)).toBe(0.225);
  });

  it('aplica 20% entre 181 e 360 dias', () => {
    expect(getIrAliquota(181)).toBe(0.2);
    expect(getIrAliquota(270)).toBe(0.2);
    expect(getIrAliquota(360)).toBe(0.2);
  });

  it('aplica 17.5% entre 361 e 720 dias', () => {
    expect(getIrAliquota(361)).toBe(0.175);
    expect(getIrAliquota(540)).toBe(0.175);
    expect(getIrAliquota(720)).toBe(0.175);
  });

  it('aplica 15% acima de 720 dias', () => {
    expect(getIrAliquota(721)).toBe(0.15);
    expect(getIrAliquota(1000)).toBe(0.15);
    expect(getIrAliquota(3650)).toBe(0.15);
  });

  it('lança erro se dias < 1', () => {
    expect(() => getIrAliquota(0)).toThrow();
    expect(() => getIrAliquota(-1)).toThrow();
  });
});