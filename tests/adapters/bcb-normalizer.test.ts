import { describe, it, expect } from 'vitest';
import {
  normalizarIpca,
  normalizarIgpm,
  normalizarSelic,
  normalizarCdi,
} from '../../src/adapters/bcb-normalizer.js';
import type { SgsObservation } from '../../src/shared/types.js';

/**
 * Helper para construir uma sequência de observações mensais a partir
 * de pares [data, valor].
 */
function obs(data: string, valor: string): SgsObservation {
  return { data, valor };
}

describe('normalizarIpca', () => {
  it('extrai valor mensal e calcula acumulado 12m', () => {
    const observacoes: SgsObservation[] = [
      obs('01/05/2025', '0.26'),
      obs('01/06/2025', '0.24'),
      obs('01/07/2025', '0.26'),
      obs('01/08/2025', '-0.11'),
      obs('01/09/2025', '0.48'),
      obs('01/10/2025', '0.09'),
      obs('01/11/2025', '0.18'),
      obs('01/12/2025', '0.33'),
      obs('01/01/2026', '0.33'),
      obs('01/02/2026', '0.70'),
      obs('01/03/2026', '0.88'),
      obs('01/04/2026', '0.67'),
    ];

    const r = normalizarIpca(observacoes);

    expect(r.nome).toBe('IPCA');
    expect(r.valorMes).toBe(0.67);
    expect(r.mesReferencia).toBe('04/2026');
    expect(r.mesReferenciaDisplay).toBe('Abril/2026');
    expect(r.dataAtualizacao).toBe('2026-04-01');
    expect(r.acumulado12m).toBeGreaterThan(4);
    expect(r.acumulado12m).toBeLessThan(5);
  });

 it('formata diferentes meses corretamente', () => {
    const base = Array.from({ length: 11 }, (_, i) =>
      obs(`01/${String(i + 1).padStart(2, '0')}/2025`, '0.10'),
    );
    const r = normalizarIpca([...base, obs('01/12/2025', '0.30')]);
    expect(r.mesReferenciaDisplay).toBe('Dezembro/2025');
    expect(r.mesReferencia).toBe('12/2025');
  });

  it('lança erro se receber menos de 12 observações', () => {
    const observacoes = Array.from({ length: 11 }, (_, i) =>
      obs(`01/${String(i + 1).padStart(2, '0')}/2025`, '0.10'),
    );
    expect(() => normalizarIpca(observacoes)).toThrow(/12 observações/);
  });

  it('lança erro se observações vierem desordenadas', () => {
    const observacoes = Array.from({ length: 12 }, (_, i) =>
      obs(`01/${String(i + 1).padStart(2, '0')}/2025`, '0.10'),
    );
    [observacoes[0], observacoes[5]] = [observacoes[5], observacoes[0]];
    expect(() => normalizarIpca(observacoes)).toThrow(/ordem/);
  });

  it('lança erro se valor não for número válido', () => {
    const observacoes = Array.from({ length: 12 }, () => obs('01/01/2026', 'abc'));
    expect(() => normalizarIpca(observacoes)).toThrow();
  });
});

describe('normalizarIgpm', () => {
  it('funciona igual ao IPCA, mas com nome IGP-M', () => {
    const observacoes = Array.from({ length: 12 }, (_, i) =>
      obs(`01/${String(i + 1).padStart(2, '0')}/2025`, '0.50'),
    );
    const r = normalizarIgpm(observacoes);
    expect(r.nome).toBe('IGP-M');
    expect(r.valorMes).toBe(0.5);
  });
});

describe('normalizarSelic', () => {
  it('extrai a taxa anual e calcula a diária equivalente', () => {
    const observacoes: SgsObservation[] = [
      obs('15/06/2026', '14.50'),
      obs('16/06/2026', '14.50'),
      obs('17/06/2026', '14.50'),
    ];

    const r = normalizarSelic(observacoes);
    expect(r.nome).toBe('SELIC');
    expect(r.valorAnual).toBe(14.5);
    expect(r.valorDiarioEquivalente).toBeCloseTo(0.0537, 3);
    expect(r.dataAtualizacao).toBe('2026-06-17');
  });

  it('lança erro com array vazio', () => {
    expect(() => normalizarSelic([])).toThrow();
  });
});

describe('normalizarCdi', () => {
  it('converte taxa diária para anual (base 252)', () => {
    const observacoes: SgsObservation[] = [
      obs('11/05/2026', '0.053400'),
      obs('12/05/2026', '0.053400'),
      obs('13/05/2026', '0.053400'),
    ];

    const r = normalizarCdi(observacoes);
    expect(r.nome).toBe('CDI');
    expect(r.valorDiarioEquivalente).toBe(0.0534);
    expect(r.valorAnual).toBeCloseTo(14.4, 1);
    expect(r.dataAtualizacao).toBe('2026-05-13');
  });

  it('lança erro com array vazio', () => {
    expect(() => normalizarCdi([])).toThrow();
  });
});