# n8n Cloud 24h (sem PC ligado)

## Já configurado no projeto

| Item | Valor |
|------|--------|
| Instância | `https://infosd.app.n8n.cloud` |
| Webhook lead | `https://infosd.app.n8n.cloud/webhook/lead-funnel-recovery` |
| Webhook compra | `https://infosd.app.n8n.cloud/webhook/lead-purchased` |
| Vercel Production | `N8N_LEAD_WEBHOOK_URL` + `N8N_PURCHASE_WEBHOOK_URL` |

Site de produção (diginest / safelinkspy) envia leads e compras para o **cloud**, não para o PC.

## Workflows prontos para import (cópia do local corrigido)

- `docs/n8n/workflow-lead-recovery-4emails.CLOUD.json`
- `docs/n8n/workflow-mark-purchased.CLOUD.json`

Import no cloud: **Workflows → ⋮ → Import from File** → Active ON  
Depois reconecte **Resend API** (Header Auth `Bearer re_...`) e **Google Sheets** (OAuth) + planilha **App Spy - Leads Recovery** / aba **Leads**.

Append: **Map Each Column Manually** (não Auto-map) — ver `FIX-PHONE-PLANILHA.md`.

## Checklist cloud

- [ ] 2 workflows importados e **Active**
- [ ] Resend conectado nos Email 1–4
- [ ] Google Sheets conectado (Append + Get row + Update purchase)
- [ ] Teste POST no webhook lead → linha na planilha
- [ ] E1 chega (ou Wait reduzido para 1 min no teste)
- [ ] Vercel env com as URLs acima (já setado)
- [ ] Deploy production após mudar env

## Local vs cloud

| | Local | Cloud |
|--|--------|--------|
| URL | `localhost:5678` | `infosd.app.n8n.cloud` |
| PC ligado? | Sim | **Não precisa** |
| Produção | Só com tunnel | **Usar este** |
