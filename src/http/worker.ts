import { IndicesService } from '../adapters/indices-service.js';
import { KvCacheStore } from '../adapters/kv-cache-store.js';
import type { WorkerEnv } from '../shared/types.js';

/**
 * Entry point do Cloudflare Worker.
 *
 * Endpoints expostos:
 *   GET  /              → health check
 *   GET  /indices       → snapshot dos 4 índices financeiros
 *
 * CORS habilitado para acesso do frontend.
 */
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Preflight CORS (browsers fazem antes de POSTs/headers customizados)
    if (request.method === 'OPTIONS') {
      return responderCors(new Response(null, { status: 204 }));
    }

    try {
      // Roteamento simples por path
      if (url.pathname === '/' && request.method === 'GET') {
        return responderCors(handleHealth());
      }

      if (url.pathname === '/indices' && request.method === 'GET') {
        return responderCors(await handleIndices(env));
      }

      return responderCors(
        jsonResponse({ error: 'Not Found', path: url.pathname }, 404),
      );
    } catch (err) {
      // Salva-vidas global: qualquer erro não tratado vira 500 sem quebrar o Worker
      const detail = err instanceof Error ? err.message : String(err);
      return responderCors(
        jsonResponse({ error: 'Internal Server Error', detail }, 500),
      );
    }
  },
};

// ─── HANDLERS ───────────────────────────────────────────────────────────────

function handleHealth(): Response {
  return jsonResponse({
    status: 'ok',
    service: 'calcula-di-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}

async function handleIndices(env: WorkerEnv): Promise<Response> {
  const ttl = Number.parseInt(env.CACHE_TTL_SECONDS, 10);
  if (!Number.isFinite(ttl) || ttl < 60) {
    return jsonResponse(
      { error: 'Configuration error', detail: 'CACHE_TTL_SECONDS inválido' },
      500,
    );
  }

  const cache = new KvCacheStore(env.CACHE_KV);
  const service = new IndicesService(cache, ttl);
  const snapshot = await service.getSnapshot();

  return jsonResponse(snapshot);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * Adiciona cabeçalhos CORS à resposta.
 * Aberto para qualquer origem (API pública).
 */
function responderCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}