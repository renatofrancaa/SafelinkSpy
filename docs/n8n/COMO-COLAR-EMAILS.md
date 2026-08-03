# Como colar o body dos e-mails no n8n (sem erro de JSON)

## Erro comum
`O valor no campo Corpo JSON não é um JSON válido` / `=[object Object]`

## Causa
Com **Expression (fx) ligado**, o n8n **já coloca o `=`** na frente.
Se você colar `={{ ... }}`, fica `=={{ ... }}` ou o objeto vira `[object Object]`.

## Passo a passo (Email 1, 2, 3 ou 4)
1. Abra o node **Email N**
2. **Especificar corpo** = Using JSON
3. Campo **JSON**: apague **tudo**
4. Clique em **fx** (Expression) — fica ativo
5. Cole o conteúdo do arquivo `emailN-jsonBody-expression.txt`
6. O campo deve **começar com `(`** ou `({` — **NÃO** com `={{`
7. Na UI pode aparecer `=` cinza na frente (normal). Conteúdo: `({ from: ... })`
8. Execute step → SAÍDA com `id` do Resend

## Arquivos
| Node | Arquivo |
|------|---------|
| Email 1 | `email1-jsonBody-expression.txt` |
| Email 2 | `email2-jsonBody-expression.txt` |
| Email 3 | `email3-jsonBody-expression.txt` |
| Email 4 | `email4-jsonBody-expression.txt` |

Pasta: `docs/n8n/`