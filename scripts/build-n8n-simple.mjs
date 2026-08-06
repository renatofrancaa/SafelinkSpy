/**
 * Workflow SIMPLES: sem Google Sheets.
 * Copy v2 — recovery emails mais persuasivos.
 * Run: node scripts/build-n8n-simple.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "n8n");
const htmlOutDir = path.join(__dirname, "..", "docs", "recovery-emails");

function resendJsonBody(subjectExpr, htmlExpr) {
  return `={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: [$json.email], subject: ${subjectExpr}, html: ${htmlExpr} }) }}`;
}

/** Checkout link fragment inside n8n expression */
function checkoutLink(code, plan, campaign) {
  return (
    `'https://go.centerpag.com/${code}?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=${plan}&utm_source=email&utm_medium=recovery&utm_campaign=${campaign}'`
  );
}

function shell(innerRows) {
  return `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
${innerRows}
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;line-height:1.45;">App Spy · Private &amp; remote · No install on their phone<br>Already purchased? You can ignore this email.</td></tr>'
+ '</table></td></tr></table></body></html>')`;
}

// ─── E1: ~30 min — report ready / unfinished action ───
const htmlE1 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">App Spy · Scan complete</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.25;">' + ($json.name || 'Hey') + ', we recovered the number you entered</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;margin-bottom:14px;">'
+ '<div style="font-size:15px;font-weight:800;color:#128C7E;">✅ Recovery finished for ' + ($json.phone || 'your number') + '</div>'
+ '<div style="font-size:13px;color:#667781;margin-top:6px;line-height:1.5;">You started the unlock — then left before opening the full report. Everything we found is still saved. You only need to finish checkout.</div>'
+ '</div>'
+ '<div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:8px;">What\\'s waiting behind the lock</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">💬 Deleted &amp; archived messages</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; media still blurred</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">📍 Location history timeline</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;">🕵️ Contacts they may be hiding</div>'
+ '<p style="margin:14px 0 0;font-size:13px;color:#667781;line-height:1.55;">Most people who come back say the same thing: <em style="color:#111b21;">“I just needed to know.”</em> You already did the hard part — the scan. Don\\'t leave the answers locked.</p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">75% OFF · SAME PRICE AS THE FUNNEL</div>'
+ '<div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div>'
+ '<div style="font-size:42px;font-weight:900;color:#111b21;line-height:1;">$39</div>'
+ '<div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 8px;">One-time payment · Lifetime access</div>'
+ '<div style="font-size:11px;color:#667781;margin-bottom:14px;">30-day money-back guarantee · Access in minutes</div>'
+ '<a href="' + ${checkoutLink("PPU38CQEHD1", "full", "e1")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 Open My Full Report Now<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Secure checkout') + ' · $39</span></a>'
+ '</div></td></tr>'
`);

// ─── E2: +24h — deleted messages / fear of not knowing ───
const htmlE2 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.06em;">Still locked · App Spy</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:6px;line-height:1.25;">' + ($json.name || 'Hey') + ', deleted messages don\\'t stay “gone”</div>'
+ '</td></tr>'
+ '<tr><td style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 14px;border-right:1px solid #e9edef;">'
+ '<div style="font-size:13px;font-weight:800;color:#ef4444;">⚠️ Report for ' + ($json.phone || 'your scan') + ' is still unread</div>'
+ '<div style="font-size:12px;color:#667781;margin-top:4px;line-height:1.45;">Every day you wait is another day of not knowing what was erased.</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<p style="margin:0 0 12px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + ($json.name || 'there') + ',</p>'
+ '<p style="margin:0 0 12px;font-size:13px;color:#667781;line-height:1.55;">People delete messages for a reason. Your scan already pulled recoverable chats, media, and activity for <strong style="color:#111b21;">' + ($json.phone || 'that number') + '</strong> — but the full text stays blurred until you unlock.</p>'
+ '<div style="background:#f8f8f8;border-left:3px solid #ef4444;border-radius:12px;padding:12px 14px;font-size:13px;color:#111b21;line-height:1.5;margin-bottom:10px;">“Don\\'t tell <span style="background:#111b21;color:#111b21;border-radius:3px;">████████</span> that we <span style="background:#111b21;color:#111b21;border-radius:3px;">██████</span>…”</div>'
+ '<div style="font-size:12px;color:#667781;margin-bottom:14px;">Deleted fragment recovered · <span style="color:#25D366;font-weight:700;">Unlock to read the full thread</span></div>'
+ '<p style="margin:0;font-size:13px;color:#667781;line-height:1.55;">You don\\'t need to confront anyone yet. You just need the truth on your screen — private, remote, no install on their phone.</p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;">'
+ '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 12px;font-size:11px;font-weight:700;color:#ef4444;margin-bottom:8px;">75% OFF · STILL AVAILABLE</div>'
+ '<div style="font-size:13px;color:#667781;text-decoration:line-through;">$197</div>'
+ '<div style="font-size:40px;font-weight:900;color:#111b21;">$39</div>'
+ '<div style="font-size:13px;font-weight:700;color:#25D366;margin-bottom:12px;">You save $158 · Lifetime access</div>'
+ '<a href="' + ${checkoutLink("PPU38CQEHD1", "full", "e2")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:15px 12px;border-radius:13px;">🔓 Reveal What They Deleted<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Checkout') + ' · $39 one-time</span></a>'
+ '</div></td></tr>'
`);

// ─── E3: +48h — objections + value stack ───
const htmlE3 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;text-align:center;">'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;line-height:1.25;">Still sitting with the doubt, ' + ($json.name || 'friend') + '?</div>'
+ '<div style="font-size:13px;color:rgba(255,255,255,.9);margin-top:8px;">Your $39 unlock for ' + ($json.phone || 'your scan') + ' is still open</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<p style="margin:0 0 12px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + ($json.name || 'there') + ',</p>'
+ '<p style="margin:0 0 12px;font-size:13px;color:#667781;line-height:1.55;">If you paused because it felt expensive, awkward, or “maybe later” — that\\'s normal. Here\\'s what you actually get for less than a dinner out:</p>'
+ '<div style="border:1px solid #e9edef;border-radius:14px;padding:12px 14px;margin-bottom:14px;">'
+ '<div style="font-size:12px;font-weight:800;color:#111b21;margin-bottom:10px;">Everything included · one payment</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">💬 Full chat history + deleted recovery</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">📸 Photos, videos &amp; voice notes</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">📍 GPS / location history</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">🛡️ 100% remote · they never get a notification</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;">♾️ Lifetime dashboard · 30-day guarantee</div>'
+ '</div>'
+ '<p style="margin:0;font-size:13px;color:#667781;line-height:1.55;"><strong style="color:#111b21;">Not sure?</strong> You have 30 days. If the report isn\\'t worth it, you get your money back. The only thing you can\\'t get back is peace of mind if you never look.</p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="position:relative;border:2px solid #25D366;border-radius:16px;padding:22px 14px 16px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="position:absolute;top:0;right:0;background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:5px 10px;border-radius:0 14px 0 10px;">BEST VALUE</div>'
+ '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin:4px 0 10px;">75% OFF · LIMITED OFFER</div>'
+ '<div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div>'
+ '<div style="font-size:44px;font-weight:900;color:#111b21;line-height:1;">$39</div>'
+ '<div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 12px;">One-time · no subscription</div>'
+ '<a href="' + ${checkoutLink("PPU38CQEHD1", "full", "e3")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;">🔓 Yes — Show Me Everything<br><span style="font-size:11px;font-weight:600;opacity:.9;">Unlock ' + ($json.phone || 'my report') + ' for $39</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#128C7E;">🔒 Secure checkout · Visa · Mastercard · Amex · PayPal</div>'
+ '</div></td></tr>'
`);

// ─── E4: +72h — last call + $29 ───
const htmlE4 = shell(`
+ '<tr><td style="background:#111b21;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#25D366;text-transform:uppercase;">Final email · We stop after this</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:8px;line-height:1.3;">' + ($json.name || 'Hey') + ', exclusive $10 off — then silence</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<div style="background:#fff8f8;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;margin-bottom:14px;">'
+ '<div style="font-size:13px;font-weight:800;color:#111b21;">🔓 ' + ($json.phone || 'Your scanned number') + ' is still unprotected</div>'
+ '<div style="font-size:12px;color:#667781;margin-top:6px;line-height:1.5;">This is the last message we\\'ll send about this scan. After this, we won\\'t remind you again — even if the report is still sitting locked.</div>'
+ '</div>'
+ '<p style="margin:0 0 10px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + ($json.name || 'there') + ',</p>'
+ '<p style="margin:0;font-size:13px;color:#667781;line-height:1.55;">You already invested time scanning. Closing the loop costs <strong style="color:#111b21;">$29 once</strong> (instead of $39) — deleted chats, media, locations, lifetime access, 30-day guarantee. Same product. Exit-only price.</p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">EXCLUSIVE · $10 OFF · LAST CALL</div>'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 12px;"><tr>'
+ '<td style="text-align:center;width:45%;"><div style="font-size:11px;color:#667781;text-transform:uppercase;">Was</div><div style="font-size:22px;font-weight:700;color:#9ca3af;text-decoration:line-through;">$39</div></td>'
+ '<td style="text-align:center;width:10%;font-size:18px;color:#667781;font-weight:700;">→</td>'
+ '<td style="text-align:center;width:45%;"><div style="font-size:11px;color:#128C7E;text-transform:uppercase;font-weight:700;">Today only</div><div style="font-size:40px;font-weight:900;color:#111b21;line-height:1;">$29</div></td>'
+ '</tr></table>'
+ '<div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#128C7E;margin-bottom:14px;">Save $10 · then we stop emailing</div>'
+ '<a href="' + ${checkoutLink("PPU38CQEKTG", "backredirect", "e4")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;">✅ Claim $29 Unlock Before We Stop<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Final offer') + ' · one-time</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#667781;">No more recovery emails after this for this scan.</div>'
+ '</div></td></tr>'
`);

const subjects = {
  e1: "($json.name || 'there') + ', we finished recovering ' + ($json.phone || 'your number') + ' — open the report'",
  e2: "($json.name || 'there') + ': deleted messages on ' + ($json.phone || 'that number') + ' are still locked'",
  e3: "'Still wondering what they deleted, ' + ($json.name || 'there') + '? $39 unlock is open'",
  e4: "($json.name || 'there') + ' — last email: unlock for $29, then we stop'",
};

const htmls = { e1: htmlE1, e2: htmlE2, e3: htmlE3, e4: htmlE4 };

// Preview HTML for docs (with sample data, not n8n expr)
function previewHtml(campaign) {
  const samples = {
    e1: {
      subject: "Renato, we finished recovering +1555… — open the report",
      file: "e1.html",
    },
    e2: {
      subject: "Renato: deleted messages on +1555… are still locked",
      file: "e2.html",
    },
    e3: {
      subject: "Still wondering what they deleted, Renato? $39 unlock is open",
      file: "e3.html",
    },
    e4: {
      subject: "Renato — last email: unlock for $29, then we stop",
      file: "e4.html",
    },
  };
  return samples[campaign];
}

function resendNode(id, name, position, key) {
  return {
    parameters: {
      method: "POST",
      url: "https://api.resend.com/emails",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Content-Type", value: "application/json" }],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: resendJsonBody(subjects[key], htmls[key]),
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: {
      httpHeaderAuth: {
        id: "REPLACE_RESEND_HEADER_AUTH_CREDENTIAL_ID",
        name: "Resend API",
      },
    },
    notes: "Header Auth: Authorization = Bearer re_XXXX",
  };
}

function waitNode(id, name, position, amount, unit) {
  return {
    parameters: { resume: "timeInterval", amount, unit },
    id,
    name,
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    position,
    webhookId: `${id}-wait`,
  };
}

function keepFields(id, name, position) {
  return {
    parameters: {
      mode: "manual",
      assignments: {
        assignments: [
          {
            id: "1",
            name: "email",
            value: "={{ $('Normalize Lead').item.json.email }}",
            type: "string",
          },
          {
            id: "2",
            name: "name",
            value: "={{ $('Normalize Lead').item.json.name }}",
            type: "string",
          },
          {
            id: "3",
            name: "phone",
            value: "={{ $('Normalize Lead').item.json.phone }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position,
  };
}

const nodes = [
  {
    parameters: {
      httpMethod: "POST",
      path: "lead-funnel-recovery",
      responseMode: "onReceived",
      options: {},
    },
    id: "webhook-lead",
    name: "Webhook Lead",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [200, 300],
    webhookId: "lead-funnel-recovery",
  },
  {
    parameters: {
      mode: "manual",
      assignments: {
        assignments: [
          {
            id: "a1",
            name: "email",
            value:
              "={{ String($json.body?.email || $json.email || '').trim().toLowerCase() }}",
            type: "string",
          },
          {
            id: "a2",
            name: "name",
            value: "={{ String($json.body?.name || $json.name || '').trim() }}",
            type: "string",
          },
          {
            id: "a3",
            name: "phone",
            value:
              "={{ String($json.body?.phone || $json.phone || '').trim() }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "normalize-lead",
    name: "Normalize Lead",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [420, 300],
  },
  waitNode("wait-e1", "Wait 30 min", [640, 300], 30, "minutes"),
  resendNode("email-1", "Email 1 ($39)", [860, 300], "e1"),
  keepFields("keep-1", "Keep fields 1", [1080, 300]),
  waitNode("wait-e2", "Wait 24h (E2)", [1300, 300], 24, "hours"),
  resendNode("email-2", "Email 2 ($39)", [1520, 300], "e2"),
  keepFields("keep-2", "Keep fields 2", [1740, 300]),
  waitNode("wait-e3", "Wait 24h (E3)", [1960, 300], 24, "hours"),
  resendNode("email-3", "Email 3 ($39)", [2180, 300], "e3"),
  keepFields("keep-3", "Keep fields 3", [2400, 300]),
  waitNode("wait-e4", "Wait 24h (E4)", [2620, 300], 24, "hours"),
  resendNode("email-4", "Email 4 ($29)", [2840, 300], "e4"),
];

const connections = {
  "Webhook Lead": {
    main: [[{ node: "Normalize Lead", type: "main", index: 0 }]],
  },
  "Normalize Lead": {
    main: [[{ node: "Wait 30 min", type: "main", index: 0 }]],
  },
  "Wait 30 min": {
    main: [[{ node: "Email 1 ($39)", type: "main", index: 0 }]],
  },
  "Email 1 ($39)": {
    main: [[{ node: "Keep fields 1", type: "main", index: 0 }]],
  },
  "Keep fields 1": {
    main: [[{ node: "Wait 24h (E2)", type: "main", index: 0 }]],
  },
  "Wait 24h (E2)": {
    main: [[{ node: "Email 2 ($39)", type: "main", index: 0 }]],
  },
  "Email 2 ($39)": {
    main: [[{ node: "Keep fields 2", type: "main", index: 0 }]],
  },
  "Keep fields 2": {
    main: [[{ node: "Wait 24h (E3)", type: "main", index: 0 }]],
  },
  "Wait 24h (E3)": {
    main: [[{ node: "Email 3 ($39)", type: "main", index: 0 }]],
  },
  "Email 3 ($39)": {
    main: [[{ node: "Keep fields 3", type: "main", index: 0 }]],
  },
  "Keep fields 3": {
    main: [[{ node: "Wait 24h (E4)", type: "main", index: 0 }]],
  },
  "Wait 24h (E4)": {
    main: [[{ node: "Email 4 ($29)", type: "main", index: 0 }]],
  },
};

const workflow = {
  name: "Recovery 4 Emails — SIMPLES v2 (copy persuasivo)",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: { templateCredsSetupCompleted: false },
  pinData: {},
};

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlOutDir, { recursive: true });

const out = path.join(outDir, "workflow-recovery-SIMPLES-sem-planilha.json");
fs.writeFileSync(out, JSON.stringify(workflow, null, 2));

// Human-readable copy doc
const copyMd = `# Recovery emails v2 — copy persuasivo

**From:** \`App Spy <noreply@mysafelinkspy.com>\`

| # | Timing | Preço | Ângulo | Subject (ex.) |
|---|--------|-------|--------|----------------|
| E1 | +30 min | $39 | Fechou o scan, falta o unlock | \`{name}, we finished recovering {phone} — open the report\` |
| E2 | +24 h | $39 | Mensagens deletadas / medo de não saber | \`{name}: deleted messages on {phone} are still locked\` |
| E3 | +48 h | $39 | Objeções + value stack + garantia | \`Still wondering what they deleted, {name}? $39 unlock is open\` |
| E4 | +72 h | $29 | Última chance + desconto exclusivo | \`{name} — last email: unlock for $29, then we stop\` |

## CTAs

| E-mail | CTA |
|--------|-----|
| E1 | Open My Full Report Now |
| E2 | Reveal What They Deleted |
| E3 | Yes — Show Me Everything |
| E4 | Claim $29 Unlock Before We Stop |

## Princípios de copy

1. **E1** — incompleção: “você já começou, o relatório está pronto”
2. **E2** — curiosidade + deleted chats (blur teaser)
3. **E3** — quebra objeção preço/risco (30-day guarantee, value stack)
4. **E4** — escassez real: último e-mail + $10 off ($39→$29)

## Import n8n

\`\`\`
docs/n8n/workflow-recovery-SIMPLES-sem-planilha.json
\`\`\`

Nome: **Recovery 4 Emails — SIMPLES v2 (copy persuasivo)**

1. Import from File  
2. Resend Header Auth nos 4 Emails  
3. Active ON  
4. Webhook URL → \`N8N_LEAD_WEBHOOK_URL\`
`;

fs.writeFileSync(path.join(htmlOutDir, "COPY-v2.md"), copyMd);
console.log("Wrote", out);
console.log("Wrote", path.join(htmlOutDir, "COPY-v2.md"));
