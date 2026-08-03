# Member report (entregável)

Portal pós-compra do SafeLink Spy. **Produção:** https://en.safelinkspy.com  

Vive no monorepo em `apps/member-report/`. Deploy e domínio **separados** do funil (raiz do repo). Ver [docs/MONOREPO.md](../../docs/MONOREPO.md).

## Fluxo

1. **index.html** — e-mail de compra  
2. **dashboard.html** — telefone + nome → cria case  
3. **status.html** — varredura + espera (~2 dias + algumas horas) + gatilhos anti-reembolso  
4. **report.html** — dossiê completo, liberado de duas formas ao fim do prazo:  
   - No próprio portal / link do case  
   - Cópia por e-mail com link mágico:  
     `report.html?case=...&phone=...&name=...&token=...&delivered=1`

Quando `readyAt` chega, o status redireciona para o dossiê. O e-mail é backup.

## Live (referência)

| Item | Valor |
|------|--------|
| Production | https://en.safelinkspy.com |
| Vercel project | `member-report` |
| Alias | https://member-report-two.vercel.app |
| Repo monorepo | https://github.com/renatofrancaa/SafelinkSpy (`apps/member-report`) |
| Repo legado | https://github.com/renatofrancaa/member-report (backup até cutover) |

## Demo local

```bash
# a partir da raiz do monorepo
cd apps/member-report
npx --yes serve -p 5180 .
```

`api/case.js` (serverless) precisa de `vercel dev` ou deploy Vercel.

## Dev: forçar pronto em 15s

No console da `status.html`:

```js
CaseStore.forceReadySoon(new URLSearchParams(location.search).get('id'), 15)
```

## E-mail automation (fase 2)

Quando o case estiver pronto, enviar e-mail com `CaseStore.reportUrl(case)` (sem login). Backend: webhook Centerpag + fila + Resend/SendGrid.

## Cutover Vercel (opcional)

Não muda domínio. No projeto **member-report**:

1. Git → repositório `SafelinkSpy`
2. Root Directory → `apps/member-report`
3. Preview → validar → Production

Detalhes e rollback: [docs/MONOREPO.md](../../docs/MONOREPO.md).
