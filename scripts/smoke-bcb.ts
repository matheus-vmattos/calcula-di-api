import { IndicesService } from '../src/adapters/indices-service.js';
import { MemoryCacheStore } from '../src/adapters/memory-cache-store.js';

async function main(): Promise<void> {
  console.log('🔍 Buscando snapshot completo via IndicesService...\n');

  const cache = new MemoryCacheStore();
  const service = new IndicesService(cache, 60);

  console.time('1ª chamada (sem cache)');
  const primeira = await service.getSnapshot();
  console.timeEnd('1ª chamada (sem cache)');
  console.log('Origem:', primeira.origem);
  console.log(JSON.stringify(primeira, null, 2));
  console.log();

  console.time('2ª chamada (com cache)');
  const segunda = await service.getSnapshot();
  console.timeEnd('2ª chamada (com cache)');
  console.log('Origem:', segunda.origem);
}

main().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});