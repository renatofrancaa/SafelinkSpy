# Por que o import quebra no Google Sheets

O JSON **não leva** sua planilha “já ligada”. Ele traz:

- placeholder de Document ID  
- schema de colunas **congelado** no arquivo  

Quando você liga a planilha de verdade, o n8n reclama:

> Column names were updated after the node's setup  
> Column to Match On / Missing columns: phone, purchased…

**Isso é limitação do import do n8n**, não da sua planilha (as colunas estão certas).

---

## Arrumar o workflow atual (sem reimportar) — 3 minutos

### 1) Append (o que grava o lead)

1. Abra **Append row in sheet1**
2. **Document** → mude para **From list** → escolha **App Spy - Leads Recovery**
3. **Sheet** → **From list** → **Leads**
4. **Mapping Column Mode** → mude de “Map Each Column Manually” para:

   **`Auto-map Input Data to Columns`**

5. **Execute step**

Se Auto-map estiver certo, a linha entra na planilha.

### 2) Cada Get row (E1, E2, E3, E4) — o mesmo em todos

1. Abra o node  
2. **Document** → **From list** → mesma planilha  
3. **Sheet** → **From list** → **Leads**  
4. **Filter → Column** → digite só: `email` (Fixed, não expression)  
5. **Value** deixe: `{{ $('Normalize Lead').item.json.email }}`  
6. Não precisa de “Column to Match On” em Get row  

### 3) Workflow Mark Purchased

Mesma coisa: Document + Sheet **From list**, match na coluna `email`.

---

## Ou: reimportar a versão v2 (auto-map já no JSON)

Arquivo atualizado:

`docs/n8n/workflow-lead-recovery-4emails.json`

1. Delete o workflow antigo **ou** importe com outro nome  
2. Importe o JSON de novo  
3. Em **todo** node verde: Credential + Document **From list** + Sheet **From list**  
4. Append já vem em **autoMap** (sem schema travado)

---

## Checklist

| Item | Ok? |
|------|-----|
| Aba embaixo = `Leads` | |
| Linha 1 = email, name, phone, purchased… | |
| Credential Google na conta dona da planilha | |
| Document **From list** (não só ID copiado) | |
| Append = **Auto-map** | |
| Get row Column = `email` | |
