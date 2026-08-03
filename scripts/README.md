# Scripts

Utilitários reutilizáveis do monorepo. **Patches one-off já aplicados** ficam em `archive/` (não rodar de novo sem revisar).

## Ativos (raiz de `scripts/`)

| Script | Uso |
|--------|-----|
| `generate-upsells.mjs` | Gera/atualiza páginas de upsell |
| `make-icons.mjs` | Ícones PWA / favicon |
| `patch-upsell-analytics.mjs` | Analytics nas páginas upsell |
| `strip-tracking.mjs` | Remoção/ajuste de tracking em HTML |
| `recovery-email-templates.mjs` | Templates de e-mail recovery |
| `build-n8n-workflows.mjs` | Gera JSON de workflows n8n |
| `build-n8n-simple.mjs` | Variante simples recovery |
| `build-n8n-full-with-sheets.mjs` | Recovery + Google Sheets |

## Arquivo (`archive/`)

Scripts de inspeção e correção pontual (encoding step3, geo, utmify, n8n cloud mapping, etc.). Mantidos só como histórico; a mudança real já está no HTML/API.

## n8n local

`tools/n8n-local/` é ambiente local (não versionar `node_modules`). Produção 24h usa **n8n Cloud** — ver `docs/n8n/`.
