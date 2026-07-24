# SafelinkSpy (App Spy Funnel)

Funil estático multi-step (HTML) para landing **App Spy**. Pronto para Git e deploy na **Vercel**.

## Estrutura

```
SafelinkSpy/
├── index.html          # Step 1 — escolha de gênero / landing
├── step2.html          # Step 2 — entrada do número
├── step3.html          # Step 3 — “acessando”
├── step4.html          # Step 4 — recuperação / loading
├── step5.html          # Step 5 — conversas (preview)
├── step6.html          # Step 6 — oferta / checkout
├── backredirect.html   # Página de saída (botão voltar)
├── vercel.json         # Config de deploy Vercel
├── .gitignore
└── README.md
```

## Fluxo

1. `index.html` → usuário escolhe alvo (male/female)
2. `step2.html` → digita telefone
3. `step3.html` → loading / acesso
4. `step4.html` → cloud recovery
5. `step5.html` → preview de conversas
6. `step6.html` → oferta + redirect de pagamento (CenterPag)

Query params (`gender`, `phone`, UTMs) são repassados entre as páginas via `navigateWithQuery`.

## Rodar local

Não precisa de build. Qualquer servidor estático:

```bash
# Python
python -m http.server 3000

# Node (npx)
npx serve .
```

Abra: [http://localhost:3000](http://localhost:3000)

## Git

```bash
git init
git add .
git commit -m "Initial commit: organize App Spy funnel for Vercel"
# crie o repo no GitHub e:
git remote add origin https://github.com/SEU_USUARIO/SafelinkSpy.git
git branch -M main
git push -u origin main
```

## Deploy na Vercel

1. Entre em [vercel.com](https://vercel.com) e importe o repositório
2. Framework Preset: **Other** (site estático)
3. Build Command: *(vazio)*
4. Output Directory: `.` (raiz)
5. Deploy

Ou via CLI:

```bash
npx vercel
```

## Pontos de personalização

| O quê | Onde |
|--------|------|
| Pixel Meta / Facebook | IDs nos `<script>` do `<head>` de cada step |
| Google Analytics | `G-46T459G961` no gtag |
| UTMify / Skalame | scripts no `<head>` |
| Link de checkout | `step6.html` → `go.centerpag.com/...` |
| Textos / copy | cada HTML na seção `<body>` |
| Cores | variáveis CSS `--green`, `--g`, etc. |

## Observações

- Projeto 100% front-end (HTML + CSS + JS inline).
- Arquivos antigos `*-clean.html` foram substituídos pelos nomes limpos; podem ser removidos após validar o fluxo.
- A página `backredirect.html` é usada quando o usuário tenta voltar no browser (popstate).
