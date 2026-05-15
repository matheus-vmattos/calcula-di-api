# CalculaDI API

API pública e gratuita de índices financeiros brasileiros (IPCA, IGP-M, Selic, CDI) e calculadora de rendimento de CDB.

## Endpoints

- `GET /` — health check
- `GET /indices` — snapshot dos 4 índices (IPCA, IGP-M, Selic, CDI) com acumulado 12 meses e taxas anualizadas

### Exemplo de resposta `/indices`

```json
{
  "ipca": {
    "nome": "IPCA",
    "valorMes": 0.67,
    "acumulado12m": 4.39,
    "mesReferenciaDisplay": "Abril/2026",
    "dataAtualizacao": "2026-04-01"
  },
  "selic": {
    "nome": "SELIC",
    "valorAnual": 14.5,
    "valorDiarioEquivalente": 0.0537,
    "dataAtualizacao": "2026-06-17"
  },
  "origem": "cache"
}
```

## Stack

- **Runtime:** Cloudflare Workers (edge global)
- **Linguagem:** TypeScript estrito
- **Testes:** Vitest (87 testes)
- **Cache:** Cloudflare KV (TTL 12h)
- **Fonte de dados:** API SGS do Banco Central do Brasil

## Arquitetura

Separação em camadas com inversão de dependências:

src/
├── domain/      # Regras de negócio puras (CDB, IR, IOF, capitalização)
├── adapters/    # Integrações externas (BCB, cache KV/memória, service)
├── http/        # Cloudflare Worker (entry point)
├── config/      # Configuração de mercado e do BCB
└── shared/      # Tipos compartilhados

## Como rodar localmente

```bash
npm install
npm test              # roda os 87 testes
npx wrangler dev      # servidor local em http://localhost:8787
```

## Autor

Matheus Mattos — [LinkedIn](https://linkedin.com/in/matheus-v-mattos)