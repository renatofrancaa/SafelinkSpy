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

## Deploy (estado atual — sem cutover)

| Projeto Vercel | Root Directory | Repo Git |
|----------------|----------------|----------|
| safelinkspy | `.` (raiz) | SafelinkSpy |
| member-report | `.` (raiz do **repo antigo** member-report) | member-report |

Enquanto o projeto `member-report` na Vercel ainda apontar para o repo antigo, **nada muda em produção**. O monorepo só guarda a cópia unificada.

---

## Cutover opcional (en.safelinkspy.com)

Só faça quando quiser um único Git e um único fluxo de deploy. Domínio e paths **permanecem iguais**.

### Pré-requisitos

1. Código em `apps/member-report/` revisado e igual (ou melhor) ao que está no ar.
2. Env vars do projeto `member-report` já configuradas na Vercel (se houver).
3. Janela com tempo para testar preview e reverter.

### Passos (Vercel → projeto **member-report**)

1. **Settings → Git**: conectar/apontar para `renatofrancaa/SafelinkSpy` (em vez de `member-report`).
2. **Settings → General → Root Directory**: `apps/member-report`
3. Framework Preset: **Other** (estático + `api/`)
4. Build/Install: deixar vazio (igual ao atual)
5. Deploy de **Preview** primeiro — abrir a URL de preview e validar:
   - `/` → index (e-mail)
   - `/dashboard.html`, `/status.html`, `/report.html`
   - `POST/GET /api/case`
   - header `X-Robots-Tag: noindex` (via `vercel.json`)
6. Se OK: promover Production. Domínio **en.safelinkspy.com** continua no mesmo projeto.
7. Se falhar: Root Directory de volta ao setup anterior **ou** reapontar o Git para o repo antigo; rollback de deployment na Vercel.

### Rollback rápido

- Vercel → Deployments → redeploy do último deployment bom **antes** do cutover, **ou**
- Git Settings → repo `member-report` + Root Directory vazio (como era).

**Não** é necessário alterar DNS de `en.safelinkspy.com` se o domínio continuar no mesmo projeto Vercel.

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
