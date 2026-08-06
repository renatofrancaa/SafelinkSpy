# Carrinho abandonado — 7 e-mails

Base **Reportana validada** + visual App Spy (preço só no botão).

## Timing (~8 dias)

| # | Espera | Subject | Preço | CTA |
|---|--------|---------|-------|-----|
| **A1** | **15 min** | A gift from us to you | **$29** | GET MY REPORT — $29 |
| **A2** | **+24 h** | Those deleted messages are still locked | **$29** | REVEAL FULL CHATS — $29 |
| **A3** | **+24 h** | Don't leave the truth locked | **$29** | GET FULL ACCESS — $29 |
| **A4** | **+24 h** | Our best offer for your report | **$19.50** | UNLOCK EVERYTHING — $19.50 |
| **A5** | **+24 h** | Your $19.50 unlock is still open | **$19.50** | CLAIM $19.50 ACCESS |
| **A6** | **+48 h** | Last chance at $19.50 | **$19.50** | KEEP MY $19.50 UNLOCK |
| **A7** | **+48 h** | Final notice — last unlock offer | **$19.50** | UNLOCK EVERYTHING — $19.50 |

## Checkouts

| Preço | Código | URL PerfectPay (direto) |
|-------|--------|-------------------------|
| $29 | `PPU38CQEKTG` | `https://go.centerpag.com/PPU38CQEKTG` |
| $19.50 | `PPU38CQEO73` | `https://go.centerpag.com/PPU38CQEO73` |

## Planilha

Aba **`Cart Abandoned`** (separada de `Leads` e `Cancel Leads`).

## Trigger n8n

`POST https://infosd.app.n8n.cloud/webhook/cart-abandoned`

```json
{
  "email": "user@email.com",
  "name": "Name",
  "phone": "1555...",
  "visitor_id": "optional"
}
```

Disparar quando o lead **abandona o checkout** (ex.: step6 sem compra / backredirect).

## Arquivos

- `a1.html` … `a7.html` — n8n  
- `a*-preview.html` — browser  
- `../n8n/workflow-cart-abandoned-7emails.json` — import  

## Regenerar

```bash
node scripts/build-cart-emails.mjs
node scripts/build-cart-workflow.mjs
# com código $19.50 real:
# $env:CART_CHECKOUT_195="PPU38CQxxxx"; node scripts/build-cart-emails.mjs
```
