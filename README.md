# SafelinkSpy (App Spy Funnel)

Funil multi-step (HTML estático em `/public`) com analytics e dashboard Next.js. **Link direto** — sem cloaker.

## Estrutura

```
SafelinkSpy/
├── middleware.ts           # Redirect / → /index.html (+ headers UTM)
├── utils/                  # botDetect (analytics), detectSource
├── app/                    # shell Next (fallback / e dashboard)
├── public/
│   ├── index.html          # Step 1 — escolha de gênero
│   ├── step2.html … step6.html
│   ├── backredirect.html
│   ├── assets/
│   └── js/
├── vercel.json
└── package.json
```

## Fluxo do funil

1. `index.html` → usuário escolhe alvo (male/female)
2. `step2.html` → digita telefone
3. `step3.html` → loading / acesso
4. `step4.html` → cloud recovery
5. `step5.html` → preview de conversas
6. `step6.html` → oferta + checkout (CenterPag)

Query params (`gender`, `phone`, UTMs) são repassados entre as páginas via `navigateWithQuery`.

## Links de uso

```
https://SEU_DOMINIO/
https://SEU_DOMINIO/index.html
```

UTMs e click IDs (`fbclid`, `gclid`, etc.) funcionam normalmente na query string.

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

Abra: [http://localhost:3000](http://localhost:3000) — redireciona para o funil (`/index.html`).

## Deploy na Vercel

1. Importe o repositório
2. Framework Preset: **Next.js**
3. Env vars (Project → Settings):
   - `DASHBOARD_SECRET`
   - `DATABASE_URL` (Neon)
4. Deploy

Link de anúncio (direto):

```
https://SEU_DOMINIO/
```

ou com UTMs:

```
https://SEU_DOMINIO/?utm_source=meta&utm_campaign=...
```

## Pontos de personalização

| O quê | Onde |
|--------|------|
| Pixel Meta / Facebook | IDs nos `<script>` de cada step |
| Google Analytics | `G-46T459G961` no gtag |
| UTMify / Skalame | scripts no `<head>` |
| Link de checkout | `public/step6.html` → CenterPag |
| Copy / CSS | cada HTML em `public/` |
