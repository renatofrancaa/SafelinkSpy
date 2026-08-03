# SafelinkSpy (monorepo)

Dois produtos no **mesmo repositório**, com **deploys e domínios separados**:

| Produto | Pasta | Domínio |
|---------|--------|---------|
| Funil multi-step + dashboard + APIs | raiz (`app/`, `public/`) | funil (mysafelinkspy.com, etc.) |
| Member report (entregável pós-compra) | `apps/member-report/` | **en.safelinkspy.com** |

Guia completo: **[docs/MONOREPO.md](docs/MONOREPO.md)**.  
**Nada de domínio/URL pública muda** só por unificar o Git.

---

## Estrutura

```
SafelinkSpy/
├── middleware.ts              # / → /index.html, cookie geo, etc.
├── app/                       # Next.js: dashboard, APIs, /go/[code]
├── public/                    # Funil estático (index → step6 + upsell)
├── lib/                       # analytics, store Neon
├── apps/
│   └── member-report/         # Entregável (en.safelinkspy.com)
├── docs/                      # monorepo, n8n, recovery emails
├── scripts/                   # utilitários (+ archive/ de one-offs)
├── vercel.json                # projeto funil (Next.js)
└── package.json
```

---

## Funil (raiz)

Funil multi-step (HTML em `/public`) com analytics e dashboard Next.js. **Link direto** — sem cloaker.

### Fluxo

1. `index.html` → gênero do alvo  
2. `step2.html` → telefone  
3. `step3.html` → loading / perfil  
4. `step4.html` → cloud recovery  
5. `step5.html` → preview de conversas  
6. `step6.html` → oferta + checkout  
7. `upsell/*` → upsells (Clarity só aqui)

Query params (`gender`, `phone`, UTMs) via `navigateWithQuery`.

### Rodar local

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) → funil (`/index.html`).

### Deploy funil (Vercel)

1. Repo `SafelinkSpy`, Framework **Next.js**, Root Directory **vazio** (raiz)
2. Env: `DASHBOARD_SECRET`, `DATABASE_URL` (Neon), demais secrets já usados
3. Dashboard: `/dashboard`

---

## Member report

```bash
cd apps/member-report
npx --yes serve -p 5180 .
```

Detalhes: [apps/member-report/README.md](apps/member-report/README.md).

Cutover opcional do projeto Vercel `member-report` para Root Directory `apps/member-report`: ver [docs/MONOREPO.md](docs/MONOREPO.md). **Não é automático.**

---

## Docs úteis

| Doc | Conteúdo |
|-----|----------|
| [docs/MONOREPO.md](docs/MONOREPO.md) | Unificação, cutover, rollback |
| [docs/n8n/](docs/n8n/) | Recovery e-mails 24h (n8n Cloud) |
| [docs/recovery-emails/](docs/recovery-emails/) | HTML e copy dos e-mails |
| [scripts/README.md](scripts/README.md) | Scripts ativos vs archive |

---

## Pontos de personalização (funil)

| O quê | Onde |
|--------|------|
| Pixel Meta / Facebook | scripts nos steps |
| Google Analytics | gtag nos HTMLs |
| UTMify | head do funil |
| Checkout | `public/step6.html` + `/go/[code]` |
| Copy / CSS | `public/*.html` |
| Clarity | só `public/upsell/*` |
