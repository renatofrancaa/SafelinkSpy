# 4 e-mails recovery — HTML pronto (Resend / n8n)

**From:** `App Spy <ola@mysafelinkspy.com>`

| Arquivo | Quando | Preço | Subject |
|---------|--------|-------|---------|
| `e1.html` | ~30 min | $39 | `{{ $json.name \|\| 'there' }}, your report is ready — unlock full access` |
| `e2.html` | +24 h | $39 | `{{ $json.name \|\| 'there' }} — deleted messages still locked for {{ $json.phone \|\| 'your number' }}` |
| `e3.html` | +48 h | $39 | `75% OFF still open for {{ $json.phone \|\| 'your scan' }}, {{ $json.name \|\| 'there' }}` |
| `e4.html` | +72 h | $29 | `{{ $json.name \|\| 'there' }} — exclusive $10 off (last email): unlock for $29` |

## Como colar no n8n (Resend / HTTP Request)

1. Abra o node de envio (Resend ou HTTP → `https://api.resend.com/emails`).
2. Campo **Subject** e **HTML**: modo **Expression** (`=`).
3. Cole o subject da tabela e o conteúdo de `e1.html` … `e4.html` no body HTML.
4. Os placeholders `{{ $json.name }}`, `{{ $json.email }}`, `{{ $json.phone }}` vêm da row do lead.
5. **Antes de enviar:** Get row → IF `purchased ≠ true` → só então Resend.

### Body JSON (HTTP Request → Resend)

```json
{
  "from": "App Spy <ola@mysafelinkspy.com>",
  "to": ["={{ $json.email }}"],
  "subject": "={{ ($json.name || 'there') + ', your report is ready — unlock full access' }}",
  "html": "=<cole aqui o HTML do e1.html>"
}
```

> Se o HTML inteiro for expression (`=` no início), os `{{ $json.* }}` dentro do arquivo são resolvidos pelo n8n.

## Checkouts

| E-mail | URL base | Código | Preço |
|--------|----------|--------|-------|
| E1–E3 | `https://go.centerpag.com/PPU38CQEHD1` | step6 | $39 |
| E4 | `https://go.centerpag.com/PPU38CQEKTG` | backredirect | $29 |

Query: `name`, `email`, `phone`, `plan=full|backredirect`, `utm_source=email&utm_medium=recovery&utm_campaign=e1|e2|e3|e4`

## Timing

```text
30 min → E1 ($39)
+24 h  → E2 ($39)
+48 h  → E3 ($39)
+72 h  → E4 ($29)
```

Versão antiga em string JS concatenada: `../recovery-emails-n8n.md`
