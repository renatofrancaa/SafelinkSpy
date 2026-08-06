/**
 * Full recovery workflow WITH Google Sheets + purchase skip + copy v2.
 * Run: node scripts/build-n8n-full-with-sheets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  resendJsonBody,
  subjects,
  htmls,
  staticPreview,
  subjectPreviews,
} from "./recovery-email-templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "n8n");
const htmlOutDir = path.join(__dirname, "..", "docs", "recovery-emails");

const sheetDoc = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
};
const sheetName = {
  __rl: true,
  value: "Leads",
  mode: "name",
};

function sheetsCred() {
  return {
    googleSheetsOAuth2Api: {
      id: "REPLACE_GOOGLE_SHEETS_CREDENTIAL_ID",
      name: "Google Sheets account",
    },
  };
}

function resendCred() {
  return {
    httpHeaderAuth: {
      id: "REPLACE_RESEND_HEADER_AUTH_CREDENTIAL_ID",
      name: "Resend API",
    },
  };
}

function getRowNode(id, name, position) {
  return {
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "read",
      documentId: sheetDoc,
      sheetName: sheetName,
      filtersUI: {
        values: [
          {
            lookupColumn: "email",
            lookupValue: "={{ $('Normalize Lead').item.json.email }}",
          },
        ],
      },
      options: { returnFirstMatch: true },
    },
    id,
    name,
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position,
    credentials: sheetsCred(),
    notes:
      "After import: Document From list + Sheet From list = Leads. Column filter = email",
  };
}

function ifNotPurchased(id, name, position) {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: false,
          leftValue: "",
          typeValidation: "loose",
          version: 2,
        },
        conditions: [
          {
            id: `${id}-c1`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "true",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c2`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "yes",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c3`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "1",
            operator: { type: "string", operation: "notEquals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position,
  };
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
    credentials: resendCred(),
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

function keepLead(id, name, position) {
  return {
    parameters: {
      mode: "manual",
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Lead').item.json.email }}",
            type: "string",
          },
          {
            id: "k2",
            name: "name",
            value: "={{ $('Normalize Lead').item.json.name }}",
            type: "string",
          },
          {
            id: "k3",
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
    position: [200, 360],
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
          {
            id: "a4",
            name: "purchased",
            value: "false",
            type: "string",
          },
          {
            id: "a5",
            name: "visitor_id",
            value:
              "={{ String($json.body?.visitor_id || $json.body?.visitorId || '') }}",
            type: "string",
          },
          {
            id: "a6",
            name: "utm_source",
            value:
              "={{ String($json.body?.utm_source || $json.body?.utmSource || '') }}",
            type: "string",
          },
          {
            id: "a7",
            name: "utm_medium",
            value:
              "={{ String($json.body?.utm_medium || $json.body?.utmMedium || '') }}",
            type: "string",
          },
          {
            id: "a8",
            name: "utm_campaign",
            value:
              "={{ String($json.body?.utm_campaign || $json.body?.utmCampaign || '') }}",
            type: "string",
          },
          {
            id: "a9",
            name: "created_at",
            value: "={{ $now.toISO() }}",
            type: "string",
          },
          {
            id: "a10",
            name: "status",
            value: "pending",
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
    position: [420, 360],
  },
  {
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "append",
      documentId: sheetDoc,
      sheetName: sheetName,
      columns: {
        mappingMode: "autoMapInputData",
        value: {},
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: {},
    },
    id: "append-row",
    name: "Append row in sheet",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [640, 360],
    credentials: sheetsCred(),
    notes:
      "CRITICAL after import: Document From list + Sheet From list (Leads) + keep Auto-map",
  },
  keepLead("keep-lead", "Keep Lead Fields", [860, 360]),
  waitNode("wait-30m", "Wait 30 min (E1)", [1080, 360], 30, "minutes"),
  getRowNode("get-e1", "Get row (E1)", [1300, 360]),
  ifNotPurchased("if-e1", "If not purchased (E1)", [1520, 360]),
  resendNode("email-1", "Email 1 ($39)", [1760, 240], "e1"),
  keepLead("keep-after-e1", "Keep after E1", [1980, 240]),
  waitNode("wait-24h-e2", "Wait 24h (E2)", [2200, 240], 24, "hours"),
  getRowNode("get-e2", "Get row (E2)", [2420, 240]),
  ifNotPurchased("if-e2", "If not purchased (E2)", [2640, 240]),
  resendNode("email-2", "Email 2 ($39)", [2880, 140], "e2"),
  keepLead("keep-after-e2", "Keep after E2", [3100, 140]),
  waitNode("wait-24h-e3", "Wait 24h (E3)", [3320, 140], 24, "hours"),
  getRowNode("get-e3", "Get row (E3)", [3540, 140]),
  ifNotPurchased("if-e3", "If not purchased (E3)", [3760, 140]),
  resendNode("email-3", "Email 3 ($39)", [4000, 40], "e3"),
  keepLead("keep-after-e3", "Keep after E3", [4220, 40]),
  waitNode("wait-24h-e4", "Wait 24h (E4)", [4440, 40], 24, "hours"),
  getRowNode("get-e4", "Get row (E4)", [4660, 40]),
  ifNotPurchased("if-e4", "If not purchased (E4)", [4880, 40]),
  resendNode("email-4", "Email 4 ($29)", [5120, 40], "e4"),
];

const connections = {
  "Webhook Lead": {
    main: [[{ node: "Normalize Lead", type: "main", index: 0 }]],
  },
  "Normalize Lead": {
    main: [[{ node: "Append row in sheet", type: "main", index: 0 }]],
  },
  "Append row in sheet": {
    main: [[{ node: "Keep Lead Fields", type: "main", index: 0 }]],
  },
  "Keep Lead Fields": {
    main: [[{ node: "Wait 30 min (E1)", type: "main", index: 0 }]],
  },
  "Wait 30 min (E1)": {
    main: [[{ node: "Get row (E1)", type: "main", index: 0 }]],
  },
  "Get row (E1)": {
    main: [[{ node: "If not purchased (E1)", type: "main", index: 0 }]],
  },
  "If not purchased (E1)": {
    main: [[{ node: "Email 1 ($39)", type: "main", index: 0 }], []],
  },
  "Email 1 ($39)": {
    main: [[{ node: "Keep after E1", type: "main", index: 0 }]],
  },
  "Keep after E1": {
    main: [[{ node: "Wait 24h (E2)", type: "main", index: 0 }]],
  },
  "Wait 24h (E2)": {
    main: [[{ node: "Get row (E2)", type: "main", index: 0 }]],
  },
  "Get row (E2)": {
    main: [[{ node: "If not purchased (E2)", type: "main", index: 0 }]],
  },
  "If not purchased (E2)": {
    main: [[{ node: "Email 2 ($39)", type: "main", index: 0 }], []],
  },
  "Email 2 ($39)": {
    main: [[{ node: "Keep after E2", type: "main", index: 0 }]],
  },
  "Keep after E2": {
    main: [[{ node: "Wait 24h (E3)", type: "main", index: 0 }]],
  },
  "Wait 24h (E3)": {
    main: [[{ node: "Get row (E3)", type: "main", index: 0 }]],
  },
  "Get row (E3)": {
    main: [[{ node: "If not purchased (E3)", type: "main", index: 0 }]],
  },
  "If not purchased (E3)": {
    main: [[{ node: "Email 3 ($39)", type: "main", index: 0 }], []],
  },
  "Email 3 ($39)": {
    main: [[{ node: "Keep after E3", type: "main", index: 0 }]],
  },
  "Keep after E3": {
    main: [[{ node: "Wait 24h (E4)", type: "main", index: 0 }]],
  },
  "Wait 24h (E4)": {
    main: [[{ node: "Get row (E4)", type: "main", index: 0 }]],
  },
  "Get row (E4)": {
    main: [[{ node: "If not purchased (E4)", type: "main", index: 0 }]],
  },
  "If not purchased (E4)": {
    main: [[{ node: "Email 4 ($29)", type: "main", index: 0 }], []],
  },
};

const recoveryWorkflow = {
  name: "Captura Lead Funil — Recovery 4 Emails + Planilha",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: { templateCredsSetupCompleted: false },
  pinData: {},
};

const purchaseWorkflow = {
  name: "Mark Lead Purchased (skip recovery)",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "lead-purchased",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh-purchase",
      name: "Webhook Purchase",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [240, 300],
      webhookId: "lead-purchased",
    },
    {
      parameters: {
        mode: "manual",
        assignments: {
          assignments: [
            {
              id: "p1",
              name: "email",
              value:
                "={{ String($json.body?.email || $json.email || '').trim().toLowerCase() }}",
              type: "string",
            },
            {
              id: "p2",
              name: "purchased",
              value: "true",
              type: "string",
            },
            {
              id: "p3",
              name: "status",
              value: "purchased",
              type: "string",
            },
          ],
        },
        options: {},
      },
      id: "norm-purchase",
      name: "Normalize Purchase",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [480, 300],
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "update",
        documentId: sheetDoc,
        sheetName: sheetName,
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            purchased: "true",
            status: "purchased",
          },
          matchingColumns: ["email"],
          schema: [
            {
              id: "email",
              displayName: "email",
              required: true,
              defaultMatch: true,
              display: true,
              type: "string",
              canBeUsedToMatch: true,
              removed: false,
            },
            {
              id: "purchased",
              displayName: "purchased",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: false,
              removed: false,
            },
            {
              id: "status",
              displayName: "status",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: false,
              removed: false,
            },
          ],
        },
        options: {},
      },
      id: "update-row",
      name: "Update purchased in sheet",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [720, 300],
      credentials: sheetsCred(),
    },
  ],
  connections: {
    "Webhook Purchase": {
      main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
    },
    "Normalize Purchase": {
      main: [[{ node: "Update purchased in sheet", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  meta: { templateCredsSetupCompleted: false },
  pinData: {},
};

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlOutDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "workflow-lead-recovery-4emails.json"),
  JSON.stringify(recoveryWorkflow, null, 2)
);
fs.writeFileSync(
  path.join(outDir, "workflow-mark-purchased.json"),
  JSON.stringify(purchaseWorkflow, null, 2)
);

// Static previews for browser
for (const key of ["e1", "e2", "e3", "e4"]) {
  fs.writeFileSync(
    path.join(htmlOutDir, `${key}-preview.html`),
    staticPreview(key)
  );
}

const n = "Renato";
const p = "+55 11 99999-9999";
const readable = `# 4 e-mails recovery — texto completo (para ler)

**From:** App Spy <noreply@mysafelinkspy.com>  
**Sample lead:** ${n} · ${p}

Abra no browser (HTML visual):
- \`docs/recovery-emails/e1-preview.html\`
- \`docs/recovery-emails/e2-preview.html\`
- \`docs/recovery-emails/e3-preview.html\`
- \`docs/recovery-emails/e4-preview.html\`

---

## EMAIL 1 — ~30 min · $39

**Subject:** ${subjectPreviews.e1(n, p)}

**Headline:** ${n}, we recovered the number you entered

**Body:**
- ✅ Recovery finished for ${p}
- You started the unlock — then left before opening the full report. Everything we found is still saved. You only need to finish checkout.
- What's waiting: deleted messages, photos/media blurred, location history, hidden contacts
- Most people who come back say: "I just needed to know." You already did the hard part — the scan.

**Offer:** $197 → **$39** · one-time · lifetime · 30-day guarantee  
**CTA:** Open My Full Report Now  
**Checkout:** PPU38CQEHD1 (step6) · utm_campaign=e1

---

## EMAIL 2 — +24 h · $39

**Subject:** ${subjectPreviews.e2(n, p)}

**Headline:** ${n}, deleted messages don't stay "gone"

**Body:**
- ⚠️ Report for ${p} is still unread
- Every day you wait is another day of not knowing what was erased.
- People delete messages for a reason. Scan pulled chats/media — full text stays blurred until unlock.
- Teaser: "Don't tell ████ that we ██████…"
- You don't need to confront anyone yet — private, remote, no install on their phone.

**Offer:** $197 → **$39**  
**CTA:** Reveal What They Deleted  
**Checkout:** PPU38CQEHD1 · utm_campaign=e2

---

## EMAIL 3 — +48 h · $39

**Subject:** ${subjectPreviews.e3(n, p)}

**Headline:** Still sitting with the doubt, ${n}?

**Body:**
- If you paused because expensive / awkward / maybe later — normal.
- What you get for less than a dinner: chats+deleted, media, GPS, remote/undetectable, lifetime + 30-day guarantee.
- Not sure? 30 days money-back. Only thing you can't get back is peace of mind if you never look.

**Offer:** $197 → **$39** · BEST VALUE badge  
**CTA:** Yes — Show Me Everything  
**Checkout:** PPU38CQEHD1 · utm_campaign=e3

---

## EMAIL 4 — +72 h · $29 (last)

**Subject:** ${subjectPreviews.e4(n, p)}

**Headline:** ${n}, exclusive $10 off — then silence

**Body:**
- ${p} is still unprotected
- Last message about this scan — we won't remind you again.
- You already scanned. Close the loop for **$29 once** (was $39). Same product, exit-only price.

**Offer:** $39 → **$29** · Save $10  
**CTA:** Claim $29 Unlock Before We Stop  
**Checkout:** PPU38CQEKTG (backredirect) · utm_campaign=e4

---

## Fluxo n8n (com planilha)

\`\`\`
Webhook → Normalize → Append sheet → Wait 30m
  → Get row → IF not purchased → Email 1
  → Wait 24h → Get row → IF → Email 2
  → Wait 24h → Get row → IF → Email 3
  → Wait 24h → Get row → IF → Email 4
\`\`\`

Import:
- \`docs/n8n/workflow-lead-recovery-4emails.json\`
- \`docs/n8n/workflow-mark-purchased.json\`

Planilha aba **Leads** + Append em **Auto-map**.
`;

fs.writeFileSync(path.join(htmlOutDir, "EMAILS-LEITURA.md"), readable);
fs.writeFileSync(path.join(htmlOutDir, "COPY-v2.md"), readable);

console.log("OK full workflows + previews");
console.log(" -", path.join(outDir, "workflow-lead-recovery-4emails.json"));
console.log(" -", path.join(outDir, "workflow-mark-purchased.json"));
console.log(" -", path.join(htmlOutDir, "e1-preview.html … e4-preview.html"));
console.log(" -", path.join(htmlOutDir, "EMAILS-LEITURA.md"));
