# SafelinkSpy (App Spy Funnel)

Funil multi-step (HTML estático em `/public`) com **cloaker Edge** (Next.js middleware), adaptado de `funnel-love-vision`.

## Estrutura

```
SafelinkSpy/
├── middleware.ts           # Cloaker (white/black)
├── utils/                  # botDetect, cloakerDecision, ad source
├── app/                    # shell Next (fallback / e /white)
├── public/
│   ├── index.html          # Step 1 — escolha de gênero
│   ├── step2.html … step6.html
│   ├── backredirect.html
│   ├── famguard.html       # WHITE (safe page)
│   ├── assets/
│   └── js/
├── CLOAKER.md              # docs do cloaker
├── vercel.json
└── package.json
```

## Fluxo do funil (BLACK)

1. `index.html` → usuário escolhe alvo (male/female)
2. `step2.html` → digita telefone
3. `step3.html` → loading / acesso
4. `step4.html` → cloud recovery
5. `step5.html` → preview de conversas
6. `step6.html` → oferta + checkout (CenterPag)

Query params (`gender`, `phone`, UTMs) são repassados entre as páginas via `navigateWithQuery`.

## Cloaker (resumo)

| Visitante | Vê |
|-----------|-----|
| Ads com `?cat=SECRET` + origem Meta/Google + país OK | Funil (black) |
| Bot / review Meta / sem param / país BR etc. | Famguard (white) |
| `?test=forceblack` | Funil (teste local) |

Detalhes: [CLOAKER.md](./CLOAKER.md)

## Dashboard

```
https://SEU_DOMINIO/dashboard
```

Senha: `DASHBOARD_SECRET` (default `1234`).

Requer `DATABASE_URL` (Neon) na Vercel para histórico permanente. Sem isso, dados ficam só em memória e somem em cold start.

## Rodar local

```bash
npm install
npm run dev
```

Abra: [http://localhost:3000](http://localhost:3000)

- WHITE: `http://localhost:3000/`
- BLACK (teste): `http://localhost:3000/?test=forceblack`

## Deploy na Vercel

1. Importe o repositório
2. Framework Preset: **Next.js**
3. Env vars (Project → Settings):
   - `CLOAKER_PARAM_PASS`
   - `CLOAKER_TEST_PASS`
   - `CLOAKER_BLOCKED_COUNTRIES`
   - `CLOAKER_BLOCKED_LANGS`
4. Deploy

Link de anúncio:

```
https://SEU_DOMINIO/?cat=SEU_CLOAKER_PARAM_PASS
```

## Pontos de personalização

| O quê | Onde |
|--------|------|
| Segredo do cloaker | Env `CLOAKER_PARAM_PASS` |
| Página white | `public/famguard.html` |
| Pixel Meta / Facebook | IDs nos `<script>` de cada step |
| Google Analytics | `G-46T459G961` no gtag |
| UTMify / Skalame | scripts no `<head>` |
| Link de checkout | `public/step6.html` → CenterPag |
| Copy / CSS | cada HTML em `public/` |
