# Links de e-mail no mesmo domínio do Resend

## Problema (Resend Insights)

```
Ensure link URLs match sending domain
```

From: `App Spy <ola@mysafelinkspy.com>`  
Link antigo: `https://go.centerpag.com/PPU38CQEHD1?...`  

Domínios diferentes → spam filters.

## Solução

Link **branded** no seu domínio → redirect 302 para CenterPag **sem perder query string**.

```
https://mysafelinkspy.com/go/PPU38CQEHD1?name=...&email=...&phone=...&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e1
         └─ aparece no e-mail (mesmo domínio do From)
                              └─ redireciona para go.centerpag.com/... com TODOS os params
```

Rota no app: `app/go/[code]/route.ts`

| E-mail | Código | Link no HTML |
|--------|--------|----------------|
| E1–E3 | `PPU38CQEHD1` | `https://mysafelinkspy.com/go/PPU38CQEHD1?...` |
| E4 | `PPU38CQEKTG` | `https://mysafelinkspy.com/go/PPU38CQEKTG?...` |

Tracking mantido: `name`, `email`, `phone`, `plan`, `utm_source`, `utm_medium`, `utm_campaign`.

## Precisa estar na Vercel?

**Não obrigatório “ser Vercel”**, mas o domínio do **link** tem que apontar para **algum lugar** que rode esse redirect.

| Opção | Resultado |
|-------|-----------|
| `mysafelinkspy.com` → este projeto Vercel | Ideal: From e links iguais |
| Só `diginest.site` no Vercel | Redirect funciona em diginest, mas Resend **ainda reclama** se From for mysafelinkspy |
| Trocar From para `@diginest.site` (se verificado no Resend) | Aí links `https://diginest.site/go/...` ficam ok |

### DNS (se usar mysafelinkspy.com no Vercel)

1. Vercel → Project → **Domains** → Add `mysafelinkspy.com` (e `www` se quiser)  
2. No DNS do domínio, registros que a Vercel pedir (A / CNAME)  
3. Teste: `https://mysafelinkspy.com/go/PPU38CQEHD1?utm_source=test` → deve ir pro CenterPag  

## n8n (expression do href)

Antes:
```js
'https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent(...)
```

Depois:
```js
'https://mysafelinkspy.com/go/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '')
  + '&email=' + encodeURIComponent($json.email || '')
  + '&phone=' + encodeURIComponent($json.phone || '')
  + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e1'
```
