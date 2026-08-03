# Corrigir planilha + phone #ERROR! (definitivo)

## Por que acontece

1. **Map Automatically** no Append → se não “acha” a coluna, **cria coluna nova** (phone, purchased… de novo em K, L…).
2. Telefone com **`+55...`** → Sheets vira **fórmula** → `#ERROR!`.

## Parte A — Limpar a planilha (faça isto primeiro)

1. Abra **App Spy - Leads Recovery** → aba **Leads**
2. Selecione **todas as colunas a partir de K** (K, L, M, N…) → botão direito → **Excluir colunas**
3. Apague **todas as linhas de dados** (deixe só a linha 1)
4. Linha 1 deve ter **exatamente** isto (copie/cole se precisar):

```
email	name	phone	purchased	visitor_id	utm_source	utm_medium	utm_campaign	created_at	status
```

5. Selecione a coluna **C (phone)** inteira → menu **Formatar → Número → Texto sem formatação**
6. **Não** deixe nenhum segundo cabeçalho “phone” à direita

## Parte B — Append: NÃO use Map Automatically

1. Abra o node **Append row in sheet**
2. **Mapping Column Mode** → **Map Each Column Manually** (não Automatically)
3. Apague todos os campos atuais (lixeira em cada um)
4. Clique **Add column to send** e adicione **só estes 10**, escolhendo o nome da coluna no **dropdown** (não digite um nome novo):

| Coluna (dropdown da planilha) | Valor (Expression `fx`) |
|------------------------------|-------------------------|
| email | `={{ $json.email }}` |
| name | `={{ $json.name }}` |
| phone | `={{ "'" + String($json.phone \|\| '').replace(/^\+/, '').trim() }}` |
| purchased | `={{ $json.purchased }}` |
| visitor_id | `={{ $json.visitor_id }}` |
| utm_source | `={{ $json.utm_source }}` |
| utm_medium | `={{ $json.utm_medium }}` |
| utm_campaign | `={{ $json.utm_campaign }}` |
| created_at | `={{ $json.created_at }}` |
| status | `={{ $json.status }}` |

O `'` na frente do phone força **texto** no Sheets (some o #ERROR!).

5. **Não** adicione nenhuma coluna que não exista na linha 1
6. Save

## Parte C — Testar

1. Execute o workflow com um lead de teste **ou** use o site
2. Deve aparecer **1 linha** nas colunas **A–J**
3. Coluna **phone** com número legível, **sem** #ERROR!
4. **Nenhuma** coluna nova em K+

## Se ainda criar coluna em K

- Você ainda tem **Map Automatically** ligado → mude para Manual  
- Ou o dropdown do phone criou “nova coluna” em vez de escolher a C existente → delete a coluna K de novo e no dropdown escolha o **phone** que já está na planilha (coluna C)
