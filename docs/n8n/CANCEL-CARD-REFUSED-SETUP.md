# Setup — Cancel / Card Refused (**7 e-mails**)

> **Não execute produção ainda** sem teste no seu e-mail.

---

## Timing (resumo)

```
Cancel
  → 15 min → C1 $39  (issue with order)
  → +24 h  → C2 $39  (results waiting)
  → +24 h  → C3 $39  (still locked)
  → +24 h  → C4 $29  (special offer)
  → +24 h  → C5 $29  (discount still open)
  → +48 h  → C6 $29  (ending soon)
  → +48 h  → C7 $29  (final notice)
```

**Total ≈ 8 dias.** Stop se `purchased=true`.

---

## Planilha (separada do funil)

| Aba | Uso |
|-----|-----|
| **Leads** | Recovery do funil |
| **Cancel Leads** | Esta sequência de 7 e-mails |

Documento: App Spy - Leads Recovery. Ver `CANCEL-SHEET-SEPARATION.md`.

## Arquivos

- Workflow: `docs/n8n/workflow-cancel-card-refused-7emails.json`  
- HTMLs: `docs/cancel-emails/c1.html` … `c7.html`  
- Previews: `docs/cancel-emails/c*-preview.html`  

Webhook path: **`order-cancelled`**

---

## Antes de ativar

1. Abrir previews e aprovar copy/visual  
2. Escolher disparo (PerfectPay → n8n **ou** teste manual)  
3. Import n8n Cloud + Resend + Google Sheets (Leads)  
4. Teste no seu e-mail com waits curtos  
5. Só então Active + produção  

Payload mínimo:

```json
{
  "email": "cliente@email.com",
  "name": "Nome",
  "phone": "15551234567",
  "sale_status_enum": 6
}
```

## Regenerar

```bash
node scripts/build-cancel-emails.mjs
node scripts/build-cancel-workflow.mjs
```
