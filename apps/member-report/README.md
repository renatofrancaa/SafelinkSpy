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

## Live

| Item | Valor |
|------|--------|
| Production | https://en.safelinkspy.com |
| Vercel project | `member-report` |
| Root Directory | `apps/member-report` |
| Git | https://github.com/renatofrancaa/SafelinkSpy |
| Alias | https://member-report-two.vercel.app |

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

## Deploy

Cutover **já feito** (Git SafelinkSpy + Root Directory `apps/member-report`). Domínio inalterado.  
Detalhes e rollback: [docs/MONOREPO.md](../../docs/MONOREPO.md).
