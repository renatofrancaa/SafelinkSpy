# Caixa de suporte segura — support@mysafelinkspy.com

## Recomendação

| Uso | Endereço | Onde |
|-----|----------|------|
| **Envio automático** (Resend / n8n) | `noreply@mysafelinkspy.com` ou `noreply@...` | Resend From |
| **Suporte / respostas humanas** | `support@mysafelinkspy.com` | Caixa real (Google Workspace / Microsoft 365 / Zoho) |
| **Reply-To nos e-mails** | `support@mysafelinkspy.com` | Header Reply-To no Resend |

Cliente responde → cai na caixa **support@**, não no Resend.

---

## Passo a passo (simples e seguro)

### 1) Criar o endereço support@
No DNS do domínio **mysafelinkspy.com** (já usa Resend):

**Opção A — Google Workspace** (melhor se tiver budget)
1. Google Workspace → Users → Add user: `support@mysafelinkspy.com`
2. Ativar 2FA no usuário support
3. Usar Gmail / app senha só se necessário

**Opção B — Microsoft 365**
1. Admin → Users → add `support@mysafelinkspy.com`
2. 2FA obrigatório

**Opção C — Zoho Mail free / ImprovMX + Gmail**
1. Criar mailbox ou forward `support@` → seu Gmail
2. Se for só forward (ImprovMX / Cloudflare Email Routing): as respostas do cliente chegam no seu Gmail, mas o “From” ao responder deve ser configurado com cuidado (melhor mailbox real)

### 2) DNS (além do Resend)
Para **receber** e-mail em support@:
- **MX** do provedor da caixa (Google/Microsoft/Zoho) — **não** use MX do Resend (Resend é só envio)
- Se Resend e a caixa convivem no mesmo domínio:
  - Resend: SPF/DKIM de **envio** (já tem)
  - Caixa: MX + SPF deve **incluir** o provedor da caixa **e** Resend (`include:amazonses.com` ou o include do Resend)

Exemplo SPF unificado (ajuste com o que cada provedor pedir):
```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```
(ou o include oficial do Resend da documentação deles)

### 3) Nos e-mails automáticos (n8n / Resend)
- **From:** `App Spy <noreply@mysafelinkspy.com>` (domínio verificado no Resend)
- **Reply-To:** `support@mysafelinkspy.com`
- Assim o cliente clica “Responder” e a mensagem vai para support@

### 4) Segurança mínima da caixa support@
- 2FA sempre
- Não usar a mesma senha do Resend / n8n
- Filtros: spam + pastas (Compras / Refund / Acesso)
- Preferir **não** colocar a senha do support no n8n — só Reply-To
- Se precisar enviar manualmente de support@, use o webmail do Workspace, não a API do Resend (a menos que adicione support@ no Resend também como From verificado)

### 5) Opcional: dual
- `ola@` / `noreply@` → só machine (Resend)
- `support@` → só humanos (Workspace)
- `billing@` → se quiser separar reembolso

---

## O que eu configuro no n8n (quando for pro ar)
- From: App Spy \<noreply@mysafelinkspy.com\>
- Reply-To: support@mysafelinkspy.com
- Você só precisa ter a **caixa support@ recebendo** no DNS/provedor

## O que você faz uma vez
1. Criar mailbox `support@mysafelinkspy.com`
2. Ajustar MX + SPF se ainda não recebe
3. Me confirmar que support@ recebe um e-mail de teste
