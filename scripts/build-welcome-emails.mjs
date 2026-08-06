/**
 * Welcome sequence for buyers — 5 emails (direct copy, no feature laundry list).
 * W1 immediate → 3h → W2 → 1d → W3 → 2d → W4 → 3d → W5
 *
 * Run: node scripts/build-welcome-emails.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "docs", "welcome-emails");
fs.mkdirSync(dir, { recursive: true });

const MEMBER = "https://en.safelinkspy.com";
/** Customer-facing support (replies + support@ mailbox) */
const SUPPORT = "support@mysafelinkspy.com";
/** Resend From for automated mail (must be verified domain) */
const FROM_BRAND = "App Spy";

function shell(inner) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">
${inner}
          <tr>
            <td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;line-height:1.45;">
              ${FROM_BRAND} · Questions? ${SUPPORT}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function header(kicker, title) {
  return `          <tr>
            <td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">${kicker}</div>
              <div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;line-height:1.25;">${title}</div>
            </td>
          </tr>`;
}

function card(html) {
  return `          <tr>
            <td style="background:#ffffff;padding:16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">
${html}
            </td>
          </tr>`;
}

function cta(href, main, sub) {
  return `              <div style="margin-top:16px;text-align:center;">
                <a href="${href}" style="display:block;background:#25D366;background:linear-gradient(135deg,#25D366,#22c55e);color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">
                  ${main}<br>
                  <span style="font-size:11px;font-weight:600;opacity:.9;">${sub}</span>
                </a>
              </div>`;
}

function p(text) {
  return `              <div style="font-size:14px;color:#111b21;line-height:1.55;margin-bottom:10px;">${text}</div>`;
}

const link = (c) =>
  `${MEMBER}/?email={{ $json.email }}&name={{ $json.name }}&utm_source=email_welcome&utm_medium=email&utm_campaign=${c}&src=email_welcome&sck=${c}`;

const emails = {
  w1: shell(
    header("App Spy · Welcome", "Your access is ready") +
      card(
        p("Hi {{ $json.name || 'there' }},") +
          p("Your payment is confirmed and your App Spy access is unlocked.") +
          p("Open your portal below to start — it only takes a minute.") +
          cta(link("w1"), "Open my access", "Member portal") +
          `              <div style="margin-top:14px;font-size:12px;color:#667781;text-align:center;">Need help? ${SUPPORT}</div>`
      )
  ),

  w2: shell(
    header("App Spy", "Quick start") +
      card(
        p("Hi {{ $json.name || 'there' }},") +
          p("Just checking in — have you opened your portal yet?") +
          p("Log in with the e-mail you used at checkout, enter the number, and start your scan.") +
          cta(link("w2"), "Continue in the portal", "Takes about 2 minutes") +
          `              <div style="margin-top:14px;font-size:12px;color:#667781;text-align:center;">Stuck? Write to ${SUPPORT}</div>`
      )
  ),

  w3: shell(
    header("App Spy", "Your report is waiting") +
      card(
        p("Hi {{ $json.name || 'there' }},") +
          p("If you already started, open the portal and check your progress.") +
          p("If you haven't started yet, this is a good time — your access is already paid and active.") +
          cta(link("w3"), "Open my portal", "See your results")
      )
  ),

  w4: shell(
    header("App Spy", "A quick tip") +
      card(
        p("Hi {{ $json.name || 'there' }},") +
          p("When you open your dashboard, focus on the alerts first — that's usually where the important activity shows up.") +
          p("Come back anytime; your access does not expire.") +
          cta(link("w4"), "Go to my dashboard", "Member portal")
      )
  ),

  w5: shell(
    header("App Spy", "You're all set") +
      card(
        p("Hi {{ $json.name || 'there' }},") +
          p("This is our last onboarding e-mail. Your access stays available whenever you need it.") +
          p(`For support, always use <strong>${SUPPORT}</strong> — we'll reply from there.`) +
          cta(link("w5"), "Open my portal", "Lifetime access") +
          `              <div style="margin-top:14px;font-size:12px;color:#667781;text-align:center;">Thank you for trusting App Spy.</div>`
      )
  ),
};

const subjects = {
  w1: "Welcome — your access is ready",
  w2: "Quick start: open your portal",
  w3: "Your report is waiting",
  w4: "Tip: check your dashboard alerts",
  w5: "You're all set",
};

function toPreview(html) {
  return html
    .replaceAll("{{ $json.name || 'there' }}", "Alex")
    .replaceAll("{{ $json.name }}", "Alex")
    .replaceAll("{{ $json.email }}", "alex@example.com");
}

for (const [key, html] of Object.entries(emails)) {
  fs.writeFileSync(path.join(dir, `${key}.html`), html, "utf8");
  fs.writeFileSync(
    path.join(dir, `${key}-preview.html`),
    toPreview(html),
    "utf8"
  );
  console.log("wrote", key);
}

fs.writeFileSync(
  path.join(dir, "README.md"),
  `# Welcome e-mails (buyers only) — direct copy

| # | When | Subject |
|---|------|---------|
| W1 | Immediate | ${subjects.w1} |
| W2 | +3 hours | ${subjects.w2} |
| W3 | +1 day | ${subjects.w3} |
| W4 | +2 days | ${subjects.w4} |
| W5 | +3 days | ${subjects.w5} |

Portal: ${MEMBER}  
Support (replies): ${SUPPORT}  
From (Resend): App Spy \\<noreply@mysafelinkspy.com\\> · Reply-To: ${SUPPORT}

## Support inbox setup
See docs/n8n/SUPPORT-INBOX.md
`,
  "utf8"
);

fs.writeFileSync(
  path.join(__dirname, "..", "docs", "n8n", "SUPPORT-INBOX.md"),
  `# Caixa de suporte segura — support@mysafelinkspy.com

## Recomendação

| Uso | Endereço | Onde |
|-----|----------|------|
| **Envio automático** (Resend / n8n) | \`noreply@mysafelinkspy.com\` ou \`noreply@...\` | Resend From |
| **Suporte / respostas humanas** | \`support@mysafelinkspy.com\` | Caixa real (Google Workspace / Microsoft 365 / Zoho) |
| **Reply-To nos e-mails** | \`support@mysafelinkspy.com\` | Header Reply-To no Resend |

Cliente responde → cai na caixa **support@**, não no Resend.

---

## Passo a passo (simples e seguro)

### 1) Criar o endereço support@
No DNS do domínio **mysafelinkspy.com** (já usa Resend):

**Opção A — Google Workspace** (melhor se tiver budget)
1. Google Workspace → Users → Add user: \`support@mysafelinkspy.com\`
2. Ativar 2FA no usuário support
3. Usar Gmail / app senha só se necessário

**Opção B — Microsoft 365**
1. Admin → Users → add \`support@mysafelinkspy.com\`
2. 2FA obrigatório

**Opção C — Zoho Mail free / ImprovMX + Gmail**
1. Criar mailbox ou forward \`support@\` → seu Gmail
2. Se for só forward (ImprovMX / Cloudflare Email Routing): as respostas do cliente chegam no seu Gmail, mas o “From” ao responder deve ser configurado com cuidado (melhor mailbox real)

### 2) DNS (além do Resend)
Para **receber** e-mail em support@:
- **MX** do provedor da caixa (Google/Microsoft/Zoho) — **não** use MX do Resend (Resend é só envio)
- Se Resend e a caixa convivem no mesmo domínio:
  - Resend: SPF/DKIM de **envio** (já tem)
  - Caixa: MX + SPF deve **incluir** o provedor da caixa **e** Resend (\`include:amazonses.com\` ou o include do Resend)

Exemplo SPF unificado (ajuste com o que cada provedor pedir):
\`\`\`
v=spf1 include:_spf.google.com include:amazonses.com ~all
\`\`\`
(ou o include oficial do Resend da documentação deles)

### 3) Nos e-mails automáticos (n8n / Resend)
- **From:** \`App Spy <noreply@mysafelinkspy.com>\` (domínio verificado no Resend)
- **Reply-To:** \`support@mysafelinkspy.com\`
- Assim o cliente clica “Responder” e a mensagem vai para support@

### 4) Segurança mínima da caixa support@
- 2FA sempre
- Não usar a mesma senha do Resend / n8n
- Filtros: spam + pastas (Compras / Refund / Acesso)
- Preferir **não** colocar a senha do support no n8n — só Reply-To
- Se precisar enviar manualmente de support@, use o webmail do Workspace, não a API do Resend (a menos que adicione support@ no Resend também como From verificado)

### 5) Opcional: dual
- \`ola@\` / \`noreply@\` → só machine (Resend)
- \`support@\` → só humanos (Workspace)
- \`billing@\` → se quiser separar reembolso

---

## O que eu configuro no n8n (quando for pro ar)
- From: App Spy \\<noreply@mysafelinkspy.com\\>
- Reply-To: support@mysafelinkspy.com
- Você só precisa ter a **caixa support@ recebendo** no DNS/provedor

## O que você faz uma vez
1. Criar mailbox \`support@mysafelinkspy.com\`
2. Ajustar MX + SPF se ainda não recebe
3. Me confirmar que support@ recebe um e-mail de teste
`,
  "utf8"
);

console.log("OK", dir);
console.log("support:", SUPPORT);
console.log(subjects);
