# Setup completo — n8n local + Resend + Google Sheets

## O que já está no projeto

| Item | Caminho |
|------|---------|
| n8n instalado | `tools/n8n-local` (v2.32.7) |
| Workflow recovery (planilha + 4 e-mails) | `docs/n8n/workflow-lead-recovery-4emails.json` |
| Workflow marca compra | `docs/n8n/workflow-mark-purchased.json` |
| Bodies E1–E4 (colar se precisar) | `docs/n8n/email1-jsonBody-expression.txt` … `email4-…` |
| Previews HTML | `docs/recovery-emails/e1-preview.html` … |

## Subir o n8n

```powershell
cd C:\Users\renat\Documents\Projetos\SafelinkSpy\tools\n8n-local
npm start
```

Browser: **http://localhost:5678**

Na **primeira vez**: crie o usuário dono (e-mail + senha). Guarde essa senha.

---

# PARTE A — Resend (API Key) — 5 minutos

### A1. Criar / pegar a key
1. Abra https://resend.com e faça login  
2. **API Keys** → **Create API Key**  
3. Nome: `safelinkspy-n8n`  
4. Permissão: **Sending access** (ou Full)  
5. **Copie a key** (`re_...`) — só aparece uma vez  

### A2. Domínio (recomendado)
1. Resend → **Domains** → `mysafelinkspy.com`  
2. Status **Verified** (SPF/DKIM no DNS)  
3. From nos e-mails: `App Spy <noreply@mysafelinkspy.com>`  

### A3. No n8n — credencial Header Auth
1. n8n → menu esquerdo **Credentials** (ou Settings → Credentials)  
2. **Add credential** → busque **Header Auth**  
3. Preencha:
   - **Name** (credencial): `Resend API`  
   - **Header Name**: `Authorization`  
   - **Header Value**: `Bearer re_SUA_CHAVE_AQUI`  
     (palavra `Bearer` + espaço + a key)  
4. **Save**  

### A4. Ligar nos nodes de e-mail
Em cada node **Email 1 / 2 / 3 / 4** (HTTP Request):
1. **Authentication** → Generic Credential Type → **Header Auth**  
2. Selecione **Resend API**  
3. Save  

---

# PARTE B — Google Sheets — 10 minutos

### B1. Planilha
1. Abra a planilha **App Spy - Leads Recovery**  
2. Aba **Leads**, linha 1 **só**:

```
email	name	phone	purchased	visitor_id	utm_source	utm_medium	utm_campaign	created_at	status
```

3. Coluna **phone** → Formatar → Número → **Texto**  
4. Sem colunas extras (K, L, M…)  

### B2. Conectar Google no n8n
1. n8n → **Credentials** → **Add** → **Google Sheets OAuth2 API**  
2. Siga o assistente:
   - Ou use o OAuth nativo do n8n (Sign in with Google)  
   - Ou cole Client ID/Secret do Google Cloud (se o n8n pedir)  
3. Faça login com a **mesma conta Google** dona da planilha  
4. Autorize acesso ao Google Sheets  
5. Nome da credencial: `Google Sheets account`  

### B3. Nos nodes da planilha
Em **Append** e em cada **Get row** / **Update** (purchase):
1. Credential = `Google Sheets account`  
2. Document = **From list** → App Spy - Leads Recovery  
3. Sheet = **From list** → **Leads**  
4. Append: **Map Each Column Manually** + **Cell Format = Let n8n format**  
5. Expressions simples: `{{ $json.email }}` etc. (sem `'` se Let n8n format)  

---

# PARTE C — Importar workflows

### Pelo UI (mais fácil)
1. n8n → **Workflows** → ⋮ ou **Import**  
2. Import **dois** arquivos (workflows **separados**):
   - `docs/n8n/workflow-lead-recovery-4emails.json`  
   - `docs/n8n/workflow-mark-purchased.json`  
3. Em cada um: reconecte credentials (passo A e B)  
4. **Active / Published = ON**  

### Pelo CLI (depois que o n8n já rodou 1x)
```powershell
cd C:\Users\renat\Documents\Projetos\SafelinkSpy\tools\n8n-local
.\node_modules\.bin\n8n.cmd import:workflow --input="..\..\docs\n8n\workflow-lead-recovery-4emails.json"
.\node_modules\.bin\n8n.cmd import:workflow --input="..\..\docs\n8n\workflow-mark-purchased.json"
```

---

# PARTE D — Teste

1. Workflow recovery **Active**  
2. Teste Append / lead → linha na planilha  
3. Teste Email 1 → Resend log + inbox  
4. Waits: 30 min / 24 h em produção  

### Site de produção (diginest.site)
Continua no cloud se `N8N_LEAD_WEBHOOK_URL` = cloud.  
Para usar **este n8n local** em produção precisa de tunnel + trocar a env no Vercel.

---

# Checklist final

- [ ] n8n abre em http://localhost:5678  
- [ ] Usuário dono criado  
- [ ] Credencial **Resend** (Header Auth)  
- [ ] Credencial **Google Sheets**  
- [ ] 2 workflows importados e Active  
- [ ] Planilha Leads limpa  
- [ ] Lead de teste grava planilha  
- [ ] E-mail de teste chega (ou spam)  

---

# O que só você faz (1x) vs o que a gente automatiza

| Você | Automático / eu |
|------|------------------|
| Criar conta Resend + copiar `re_...` | Instalar n8n, importar JSON |
| Login Google no OAuth do n8n | Ajustar templates, scripts |
| Criar planilha / compartilhar | Deploy Vercel (quando pedido) |
| Ativar workflows após credenciais | — |
