# Cloaker — SafelinkSpy

Adaptado de `funnel-love-vision` (base rew-meta). Roda no **Edge Middleware** da Vercel (Next.js).

## Fluxo

```
Ads → URL?cat=SECRET
        ↓
  middleware.ts
    - grava cookie cat_valid=1
    - remove ?cat da URL
    - repassa gclid/fbclid via headers
        ↓
   ┌────┴────┐
   │         │
 layer 1   layer 3
 WHITE     BLACK
 (safe)    (oferta)
 famguard  index.html → step2…step6
```

### Filtros

| Check | Resultado se falhar |
|--------|---------------------|
| `?test=TEST_PASS` | force BLACK (teste local) |
| User-Agent bot | WHITE |
| IP datacenter Meta / Googlebot | WHITE |
| Não veio de Meta/Google/YT | WHITE |
| Cookie `cat_valid` ≠ 1 | WHITE |
| País bloqueado | WHITE |
| Idioma bloqueado | WHITE |
| Passou em tudo | BLACK |

## Links de uso

Substitua `SEU_DOMINIO` pelo domínio do deploy.

### Anúncio (Meta)
```
https://SEU_DOMINIO/?cat=b6mP2e7KIKH7i2w
```

### Teste BLACK (dev)
```
https://SEU_DOMINIO/?test=forceblack
```

### WHITE (visitante sem param / bot / país bloqueado)
```
https://SEU_DOMINIO/
https://SEU_DOMINIO/famguard.html
```

## Env vars (Vercel)

```
CLOAKER_PARAM_PASS=b6mP2e7KIKH7i2w
CLOAKER_TEST_PASS=forceblack
CLOAKER_BLOCKED_COUNTRIES=BR,RU,KP,IR
CLOAKER_BLOCKED_LANGS=pt-br
DASHBOARD_SECRET=1234
DATABASE_URL=postgresql://...   # Neon — histórico durável
```

Troque `CLOAKER_PARAM_PASS` por um segredo seu antes de rodar ads.

### Painel
```
https://SEU_DOMINIO/dashboard
```
Senha: valor de `DASHBOARD_SECRET` (default `1234`).

## Arquivos principais

| Arquivo | Função |
|---------|--------|
| `middleware.ts` | Decide white/black, cookies, rewrite/redirect |
| `utils/botDetect.ts` | UA + IP Meta/Google |
| `utils/cloakerDecision.ts` | Regras de layer |
| `utils/BrowseDetector.ts` / `detectSource.ts` | Origem Meta/Google/YT |
| `public/famguard.html` | Página WHITE (safe) |
| `public/index.html` … `step6.html` | Funil BLACK |

## Cookies de diagnóstico

| Cookie | Significado |
|--------|-------------|
| `cat_valid=1` | Entrou com `?cat=` válido |
| `force_black=1` | Teste local black |
| `zs_layer` | `white` ou `black` |
| `zs_reason` | código do filtro |
| `zs_reason_label` | label legível |
| `zs_is_bot` | `1` / `0` |
| `zs_has_param` | veio com param/cookie cat |

## Deploy

1. `npm install`
2. Configure as env vars na Vercel
3. Framework: **Next.js**
4. Link de anúncio com `?cat=SEU_SECRET`
