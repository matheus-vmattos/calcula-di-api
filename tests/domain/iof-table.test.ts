import { describe, it, expect } from 'vitest';
import { getIofAliquota } from '../../src/domain/iof-table.js';

describe('IOF regressivo (resgate até 30 dias)', () => {
  it('aplica 96% no primeiro dia', () => {
    expect(getIofAliquota(1)).toBe(0.96);
  });

  it('aplica 90% no terceiro dia', () => {
    expect(getIofAliquota(3)).toBeCloseTo(0.9, 2);
  });

  it('aplica 50% no décimo quinto dia', () => {
    expect(getIofAliquota(15)).toBeCloseTo(0.5, 2);
  });

  it('aplica 3% no dia 29', () => {
    expect(getIofAliquota(29)).toBeCloseTo(0.03, 2);
  });

  it('zera a partir do dia 30', () => {
    expect(getIofAliquota(30)).toBe(0);
    expect(getIofAliquota(31)).toBe(0);
    expect(getIofAliquota(365)).toBe(0);
  });

  it('lança erro se dias < 1', () => {
    expect(() => getIofAliquota(0)).toThrow();
    expect(() => getIofAliquota(-5)).toThrow();
  });
});