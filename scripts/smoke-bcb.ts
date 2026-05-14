import { fetchSgsSerie } from '../src/adapters/bcb-client.js';
import { SGS_SERIES } from '../src/shared/types.js';

async function main(): Promise<void> {
  console.log('🔍 Testando cliente BCB contra a API real...\n');

  for (const [nome, codigo] of Object.entries(SGS_SERIES)) {
    try {
      const data = await fetchSgsSerie(codigo, 3);
      console.log(`✅ ${nome} (série ${codigo}):`);
      console.log(JSON.stringify(data, null, 2));
      console.log();
    } catch (err) {
      console.error(`❌ ${nome} falhou:`, err instanceof Error ? err.message : err);
    }
  }
}

main();
