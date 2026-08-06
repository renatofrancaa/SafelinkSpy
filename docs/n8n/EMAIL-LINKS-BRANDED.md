# Links de checkout nos e-mails (PerfectPay direto)

## Decisão atual

Todos os CTAs de venda nos e-mails usam **link direto PerfectPay / CenterPag**:

```
https://go.centerpag.com/{CODIGO}?name=...&email=...&phone=...&plan=...&utm_source=...&utm_medium=email&utm_campaign=...&src=...&sck=...
```

**Sem** redirecionamento por `https://mysafelinkspy.com/go/...`.

A rota `app/go/[code]` ainda existe no app se precisar no futuro, mas **não é usada nos e-mails**.

## Códigos por fluxo

| Fluxo | Preço | Código | Base |
|-------|------:|--------|------|
| Recovery E1–E3 | $39 | `PPU38CQF005` | `https://go.centerpag.com/PPU38CQF005` |
| Recovery E4 | $29 | `PPU38CQF019` | `https://go.centerpag.com/PPU38CQF019` |
| Cancel C1–C3 | $39 | `PPU38CQEHD1` | `https://go.centerpag.com/PPU38CQEHD1` |
| Cancel C4–C7 | $29 | `PPU38CQEKTG` | `https://go.centerpag.com/PPU38CQEKTG` |
| Cart A1–A3 | $29 | `PPU38CQEKTG` | `https://go.centerpag.com/PPU38CQEKTG` |
| Cart A4–A7 | $19.50 | `PPU38CQEO73` | `https://go.centerpag.com/PPU38CQEO73` |

## UTMs (padrão)

| Fluxo | utm_source | utm_medium | utm_campaign | src | sck |
|-------|------------|------------|--------------|-----|-----|
| Recovery | `email_recovery` | `email` | `e1`…`e4` | `email_recovery` | `e1`…`e4` |
| Cancel | `email_cancel` | `email` | `cancel_e1`…`cancel_e7` | `email_cancel` | `cancel_eN` |
| Cart | `email_cart` | `email` | `cart_a1`…`cart_a7` | `email_cart` | `cart_aN` |

## n8n (expression do href)

```js
'https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '')
  + '&email=' + encodeURIComponent($json.email || '')
  + '&phone=' + encodeURIComponent($json.phone || '')
  + '&plan=full&utm_source=email_cancel&utm_medium=email&utm_campaign=cancel_e1&src=email_cancel&sck=cancel_e1'
```

## Rebuild / push

```bash
node scripts/build-cancel-emails.mjs
node scripts/build-cart-emails.mjs
node scripts/build-cancel-workflow.mjs
node scripts/build-cart-workflow.mjs
node scripts/build-n8n-full-with-sheets.mjs
# com N8N_API_KEY:
node scripts/push-utm-standard-n8n.mjs
```

`push-utm-standard-n8n.mjs` também reescreve qualquer `mysafelinkspy.com/go/` residual para `go.centerpag.com/`.
