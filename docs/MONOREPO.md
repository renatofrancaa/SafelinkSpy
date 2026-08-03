# Monorepo SafelinkSpy

Este repositório unifica **dois produtos** que continuam com **deploys e domínios separados**.

| App | Pasta | Domínio de produção | Projeto Vercel |
|-----|--------|---------------------|----------------|
| Funil + dashboard (Next.js) | raiz (`app/`, `public/`, …) | mysafelinkspy.com (e aliases do funil) | `safelinkspy` |
| Member report (entregável) | `apps/member-report/` | **en.safelinkspy.com** | `member-report` |

**Regra de ouro:** unificar o código **não** muda URL, DNS, auth nem paths públicos. O cutover do deploy do member é um passo **manual e opcional** (ver abaixo).

---

## Estrutura

```
SafelinkSpy/                          ← repo principal (GitHub: renatofrancaa/SafelinkSpy)
├── app/                              # Next.js: API, dashboard, /go/[code]
├── public/                           # Funil estático (index → step6 + upsell)
├── lib/                              # analytics, store Neon
├── middleware.ts
├── apps/
│   └── member-report/                # Entregável pós-compra (en.safelinkspy.com)
│       ├── index.html
│       ├── dashboard.html
│       ├── status.html
│       ├── report.html
│       ├── api/case.js
│       ├── css/ js/ images/
│       └── vercel.json
├── docs/                             # n8n, recovery, monorepo
├── scripts/                          # utilitários reutilizáveis
│   └── archive/                      # patches one-off já aplicados
└── package.json                      # só o funil Next (raiz)
```

O repositório antigo `renatofrancaa/member-report` pode ficar como backup histórico. A **fonte da verdade** do entregável passa a ser `apps/member-report/` neste monorepo.

---

## Desenvolvimento local

### Funil (raiz)

```bash
npm install
npm run dev
# http://localhost:3000 → /index.html
```

### Member report

```bash
cd apps/member-report
npx --yes serve -p 5180 .
# http://localhost:5180
```

API serverless `api/case.js` só roda de verdade no deploy Vercel (ou com `vercel dev` apontando para essa pasta).

---

## Deploy (cutover **concluído**)

| Projeto Vercel | Root Directory | Repo Git | Domínio |
|----------------|----------------|----------|---------|
| safelinkspy | `.` (raiz) | `renatofrancaa/SafelinkSpy` | funil |
| member-report | **`apps/member-report`** | `renatofrancaa/SafelinkSpy` | **en.safelinkspy.com** |

Fonte da verdade do entregável: **`apps/member-report/`** neste monorepo.  
Pasta local antiga `Projetos/member-report` foi **removida**. Repo GitHub legado `renatofrancaa/member-report` fica só como histórico (arquivado se disponível).

### Como o member faz deploy

- Push em `main` no SafelinkSpy com mudanças em `apps/member-report/` → Vercel projeto **member-report**
- Ou CLI a partir da **raiz** do monorepo:  
  `vercel deploy --prod --yes --project member-report`  
  (não use `--cwd apps/member-report` — o Root Directory já é `apps/member-report` e dobraria o path)

### Rollback (se precisar)

1. Vercel → Deployments do projeto `member-report` → redeploy de um deployment anterior estável  
2. Ou temporariamente: Root Directory vazio + reapontar Git para o repo legado (se ainda existir no GitHub)

---

## O que NÃO fazer neste monorepo

- Não servir o member-report sob o domínio do funil (paths/cookies/analytics diferentes).
- Não apagar o funil em `public/` nem rotas em `app/api/`.
- Não mudar `vercel.json` da raiz para framework do member.
- Não force-push nem apagar o projeto Vercel `member-report`.

---

## Histórico do repo antigo

- GitHub: https://github.com/renatofrancaa/member-report  
- Vercel projectId (referência): `prj_b3ey219D9RElNFxLwg4NGiFXwgLn`  
- Production: https://en.safelinkspy.com  

Após o cutover estável, o repo antigo pode ser arquivado no GitHub (Archive), sem deletar.
