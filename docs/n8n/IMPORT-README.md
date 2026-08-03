# Import n8n — Recovery 4 e-mails

Arquivos prontos:

| Arquivo | Função |
|---------|--------|
| `workflow-lead-recovery-4emails.json` | Captura lead + E1–E4 com waits e IF |
| `workflow-mark-purchased.json` | Marca `purchased=true` (para pular e-mail) |

---

## 1. Planilha Google (crie antes)

Crie uma aba chamada **`Leads`** com este cabeçalho na linha 1:

```text
email | name | phone | purchased | visitor_id | utm_source | utm_medium | utm_campaign | created_at | status
```

Copie o **Sheet ID** da URL:
`https://docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit`

---

## 2. Importar no n8n

1. n8n → menu **…** (ou **Workflows**) → **Import from File**
2. Importe `workflow-lead-recovery-4emails.json`
3. Importe também `workflow-mark-purchased.json`

---

## 3. Credenciais (obrigatório)

### Google Sheets
Em **todos** os nodes verdes de planilha:
1. Abra o node
2. Credential → selecione / crie **Google Sheets OAuth2**
3. Document → cole o **Sheet ID** (substitua `YOUR_GOOGLE_SHEET_ID`)
4. Sheet → aba **`Leads`**

### Resend (Header Auth)
1. n8n → **Credentials** → **Add** → **Header Auth**
2. Name: `Resend API`
3. **Header Name:** `Authorization`
4. **Header Value:** `Bearer re_SUA_API_KEY` (com a palavra `Bearer` + espaço)
5. Em cada node **Email 1…4**, selecione essa credencial

---

## 4. Ativar e copiar URLs dos webhooks

### Workflow recovery
1. **Publish / Active** = ON  
2. Abra **Webhook Lead** → copie a URL de produção  
   Ex.: `https://SEU-N8N.app.n8n.cloud/webhook/lead-funnel-recovery`
3. No Vercel (ou `.env`):

```env
N8N_LEAD_WEBHOOK_URL=https://SEU-N8N.../webhook/lead-funnel-recovery
```

### Workflow purchase
1. Active = ON  
2. Copie URL do **Webhook Purchase**  
3. No Vercel:

```env
N8N_PURCHASE_WEBHOOK_URL=https://SEU-N8N.../webhook/lead-purchased
```

(O app já envia `purchased: true` no PerfectPay webhook → n8n marca a planilha.)

---

## 5. Timing (já montado)

| Passo | Tempo |
|-------|--------|
| Lead capturado | t=0 |
| **E1** $39 | + **30 min** |
| **E2** $39 | + **24 h** |
| **E3** $39 | + **24 h** |
| **E4** $29 | + **24 h** |

Antes de **cada** e-mail: Get row → IF `purchased` ≠ true/yes/1 → só então Resend.

---

## 6. Teste rápido

1. Nos Wait, temporariamente mude para **1 minute** (só teste).
2. Mande um POST no webhook:

```json
{
  "email": "seu@email.com",
  "name": "Teste",
  "phone": "+15551234567"
}
```

3. Confira: linha na planilha + e-mail no Resend/inbox.
4. Volte os Wait para 30 min / 24 h.
5. Teste compra: POST no webhook purchase com `{"email":"seu@email.com"}` → `purchased` vira `true` → próximos e-mails não saem.

---

## 7. Fluxo visual (recovery)

```
Webhook Lead
  → Normalize Lead
  → Append row (planilha)
  → Keep Lead Fields
  → Wait 30 min
  → Get row → If not purchased → Email 1 ($39)
  → Keep → Wait 24h
  → Get row → If not purchased → Email 2 ($39)
  → Keep → Wait 24h
  → Get row → If not purchased → Email 3 ($39)
  → Keep → Wait 24h
  → Get row → If not purchased → Email 4 ($29)
```

---

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| Google Sheets vermelho | Reconecte OAuth + Sheet ID + aba `Leads` |
| Resend 401 | Header Auth = `Bearer re_...` |
| E-mail sem nome/phone | Confira payload do funil (`name`, `email`, `phone`) |
| Manda mesmo após compra | Confirme `N8N_PURCHASE_WEBHOOK_URL` + coluna `purchased` = `true` |
| Wait não retoma | Workflow precisa estar **Active** (Wait usa webhook interno) |
