# Separação de planilhas — funil vs cancel

## Documento Google

**App Spy - Leads Recovery**  
`https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU`

| Aba | Workflow | Uso |
|-----|----------|-----|
| **Leads** | Recovery 4 e-mails (funil) | Lead abandonou no funil |
| **Cancel Leads** | Cancel 7 e-mails (cartão recusado) | Pagamento recusado/cancelado |

Mesmas colunas (incluindo nomes com espaço final, como na aba Leads):

```
email | name | phone | purchased | visitor_id | utm_source | utm_medium | utm_campaign | created_at | status
```

## Stop após compra

Workflow **Mark Lead Purchased**:

1. Atualiza `purchased=true` em **Leads**
2. Atualiza `purchased=true` em **Cancel Leads** (se o e-mail existir; se não, continua sem erro)

Assim as **duas** sequências param quando a pessoa compra.

## Status no cloud (após migração)

- Cancel workflow → só **Cancel Leads**
- Funil recovery → só **Leads**
- Sem conflito de linhas entre os fluxos

## Validação

Smoke test pós-migração: execution `waiting` após Append em Cancel Leads (OK).
