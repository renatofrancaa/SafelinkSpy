# Sequência cancel / cartão recusado — **7 e-mails**

Visual App Spy · copy validada (base) · preço só no botão.

**Status:** arquivos prontos · importar no n8n só após você autorizar.

---

## Timing

| # | Espera | Subject | Preço | CTA |
|---|--------|---------|-------|-----|
| **C1** | **15 min** após cancel | We noticed an issue with your order | **$39** | COMPLETE MY ORDER — $39 |
| **C2** | **+24 h** | Your results are still waiting for you | **$39** | ACCESS MY REPORT — $39 |
| **C3** | **+24 h** | Your report is still locked | **$39** | UNLOCK MY REPORT — $39 |
| **C4** | **+24 h** | A special offer just for you | **$29** | GET MY REPORT — $29 |
| **C5** | **+24 h** | Your 25% discount is still available | **$29** | CLAIM $29 ACCESS |
| **C6** | **+48 h** | Don't lose access to what we found | **$29** | KEEP MY $29 OFFER |
| **C7** | **+48 h** | Final notice: incomplete order | **$29** | REDEEM DISCOUNT — $29 |

**Do cancelamento ao último e-mail ≈ 8 dias**  
(15 min + 24h×4 + 48h×2).

### Lógica da progressão

1. **C1–C3 ($39)** — problema no pagamento → ainda esperando → ainda locked  
2. **C4–C7 ($29)** — oferta 25% → ainda aberta → urgência → last email  

Se `purchased=true` na aba **Cancel Leads** → para em qualquer passo.  
(Aba **separada** do funil; compra atualiza as **duas** abas via Mark Purchased.)

---

## Checkouts

| E-mails | Código | Preço |
|---------|--------|-------|
| C1–C3 | `PPU38CQEHD1` | $39 |
| C4–C7 | `PPU38CQEKTG` | $29 |

Links (PerfectPay direto): `https://go.centerpag.com/{code}?…&utm_source=email_cancel&utm_medium=email&utm_campaign=cancel_eN&src=email_cancel&sck=cancel_eN`

From: `App Spy <noreply@mysafelinkspy.com>`

---

## Arquivos

| Arquivo | Uso |
|---------|-----|
| `c1.html` … `c7.html` | n8n |
| `c1-preview.html` … | browser |
| `../n8n/workflow-cancel-card-refused-7emails.json` | import n8n |
| `../n8n/CANCEL-CARD-REFUSED-SETUP.md` | setup |

## Regenerar

```bash
node scripts/build-cancel-emails.mjs
node scripts/build-cancel-workflow.mjs
```
