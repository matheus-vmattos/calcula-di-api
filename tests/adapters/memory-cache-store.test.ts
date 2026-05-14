import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCacheStore } from '../../src/adapters/memory-cache-store.js';

describe('MemoryCacheStore', () => {
  let cache: MemoryCacheStore;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new MemoryCacheStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna null para chave inexistente', async () => {
    expect(await cache.get('inexistente')).toBeNull();
  });

  it('armazena e recupera um valor', async () => {
    await cache.set('chave', { nome: 'IPCA', valor: 0.67 }, 60);
    const r = await cache.get<{ nome: string; valor: number }>('chave');
    expect(r).toEqual({ nome: 'IPCA', valor: 0.67 });
  });

  it('retorna null após expiração', async () => {
    await cache.set('chave', 'valor', 60); // TTL 60s
    expect(await cache.get('chave')).toBe('valor');

    vi.advanceTimersByTime(61_000); // avança 61s

    expect(await cache.get('chave')).toBeNull();
  });

  it('mantém valor antes da expiração', async () => {
    await cache.set('chave', 'valor', 60);
    vi.advanceTimersByTime(59_000);
    expect(await cache.get('chave')).toBe('valor');
  });

  it('delete remove a chave', async () => {
    await cache.set('chave', 'valor', 60);
    await cache.delete('chave');
    expect(await cache.get('chave')).toBeNull();
  });

  it('delete em chave inexistente não lança erro', async () => {
    await expect(cache.delete('inexistente')).resolves.not.toThrow();
  });

  it('aceita tipos genéricos diferentes', async () => {
    await cache.set('numero', 42, 60);
    await cache.set('string', 'olá', 60);
    await cache.set('objeto', { a: 1, b: [1, 2] }, 60);

    expect(await cache.get<number>('numero')).toBe(42);
    expect(await cache.get<string>('string')).toBe('olá');
    expect(await cache.get<{ a: number; b: number[] }>('objeto')).toEqual({ a: 1, b: [1, 2] });
  });

  it('rejeita TTL inválido', async () => {
    await expect(cache.set('k', 'v', 0)).rejects.toThrow();
    await expect(cache.set('k', 'v', -1)).rejects.toThrow();
  });

  it('sobrescreve valor existente', async () => {
    await cache.set('chave', 'v1', 60);
    await cache.set('chave', 'v2', 60);
    expect(await cache.get('chave')).toBe('v2');
  });
});