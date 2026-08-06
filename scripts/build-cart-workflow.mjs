/**
 * Build n8n workflow: Cart Abandoned — 7 Emails
 * Sheet tab: Cart Abandoned (separate from Leads + Cancel Leads)
 * Run: node scripts/build-cart-workflow.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const emailsDir = path.join(root, "docs", "cart-abandon");
const outDir = path.join(root, "docs", "n8n");

const SHEET_ID = "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=drivesdk`;
const SHEET_NAME = "Cart Abandoned";

const SEQUENCE = [
  {
    key: "a1",
    wait: { amount: 15, unit: "minutes" },
    subject: "'A gift from us to you'",
    label: "Email A1 — gift $29",
    file: "a1.html",
  },
  {
    key: "a2",
    wait: { amount: 24, unit: "hours" },
    subject: "'Those deleted messages are still locked'",
    label: "Email A2 — deleted messages $29",
    file: "a2.html",
  },
  {
    key: "a3",
    wait: { amount: 24, unit: "hours" },
    subject: "'Don\\'t leave the truth locked'",
    label: "Email A3 — complete unlock $29",
    file: "a3.html",
  },
  {
    key: "a4",
    wait: { amount: 24, unit: "hours" },
    subject: "'Our best offer for your report'",
    label: "Email A4 — best offer $19.50",
    file: "a4.html",
  },
  {
    key: "a5",
    wait: { amount: 24, unit: "hours" },
    subject: "'Your $19.50 unlock is still open'",
    label: "Email A5 — $19.50 still open",
    file: "a5.html",
  },
  {
    key: "a6",
    wait: { amount: 48, unit: "hours" },
    subject: "'Last chance at $19.50'",
    label: "Email A6 — ending soon $19.50",
    file: "a6.html",
  },
  {
    key: "a7",
    wait: { amount: 48, unit: "hours" },
    subject: "'Final notice — last unlock offer'",
    label: "Email A7 — final notice $19.50",
    file: "a7.html",
  },
];

const SCHEMA = [
  "email",
  "name",
  "phone ",
  "purchased ",
  "visitor_id ",
  "utm_source ",
  "utm_medium",
  "utm_campaign",
  "created_at",
  "status",
].map((id) => ({
  id,
  displayName: id,
  required: false,
  defaultMatch: id === "email",
  display: true,
  type: "string",
  canBeUsedToMatch: true,
  removed: false,
}));

function sheetNameRl() {
  return { __rl: true, value: SHEET_NAME, mode: "name" };
}

function loadHtml(name) {
  return fs.readFileSync(path.join(emailsDir, name), "utf8");
}

function htmlToJsExpr(html) {
  let s = JSON.stringify(html);
  s = s.replace(
    /\{\{\s*\$json\.(\w+)(?:\s*\|\|\s*'([^']*)')?\s*\}\}/g,
    (_, key, fallback) => {
      if (fallback !== undefined) {
        return `" + ($json.${key} || ${JSON.stringify(fallback)}) + "`;
      }
      return `" + ($json.${key} || '') + "`;
    }
  );
  return s;
}

function resendJsonBody(subjectExpr, htmlFile) {
  const htmlExpr = htmlToJsExpr(loadHtml(htmlFile));
  return `={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: [$json.email], subject: ${subjectExpr}, html: ${htmlExpr} }) }}`;
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
            leftValue: "={{ String($json.purchased ?? $json['purchased '] ?? '').toLowerCase() }}",
            rightValue: "true",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c2`,
            leftValue: "={{ String($json.purchased ?? $json['purchased '] ?? '').toLowerCase() }}",
            rightValue: "yes",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c3`,
            leftValue: "={{ String($json.purchased ?? $json['purchased '] ?? '').toLowerCase() }}",
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

function getRow(id, name, position) {
  return {
    parameters: {
      documentId: {
        __rl: true,
        value: SHEET_ID,
        mode: "list",
        cachedResultName: "App Spy - Leads Recovery ",
        cachedResultUrl: SHEET_URL,
      },
      sheetName: sheetNameRl(),
      filtersUI: {
        values: [
          {
            lookupColumn: "email",
            lookupValue: "={{ $('Normalize Cart').item.json.email }}",
          },
        ],
      },
      options: { returnFirstMatch: true },
      authentication: "oAuth2",
      resource: "sheet",
      operation: "read",
    },
    id,
    name,
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position,
    credentials: {
      googleSheetsOAuth2Api: { id: null, name: "Google Sheets account" },
    },
  };
}

function keepFields(id, name, position) {
  return {
    parameters: {
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Cart').item.json.email }}",
            type: "string",
          },
          {
            id: "k2",
            name: "name",
            value: "={{ $('Normalize Cart').item.json.name }}",
            type: "string",
          },
          {
            id: "k3",
            name: "phone",
            value: "={{ $('Normalize Cart').item.json.phone }}",
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

function emailNode(id, name, position, subjectExpr, htmlFile) {
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
      jsonBody: resendJsonBody(subjectExpr, htmlFile),
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: {
      httpHeaderAuth: { id: null, name: "Resend API" },
    },
  };
}

function waitNode(id, name, position, amount, unit, webhookId) {
  return {
    parameters: { amount, unit },
    id,
    name,
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    position,
    webhookId,
  };
}

const nodes = [
  {
    parameters: {
      httpMethod: "POST",
      path: "cart-abandoned",
      responseMode: "onReceived",
      options: {},
    },
    id: "wh-cart",
    name: "Webhook Cart",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [200, 400],
    webhookId: "cart-abandoned",
    notes: "Trigger when user abandons checkout / cart. Body: email, name, phone.",
  },
  {
    parameters: {
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
            value:
              "={{ String($json.body?.name || $json.name || '').trim() }}",
            type: "string",
          },
          {
            id: "a3",
            name: "phone",
            value:
              "={{ String($json.body?.phone || $json.phone || '').trim() }}",
            type: "string",
          },
          { id: "a4", name: "purchased", value: "false", type: "string" },
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
              "={{ String($json.body?.utm_source || $json.body?.utmSource || 'email') }}",
            type: "string",
          },
          {
            id: "a7",
            name: "utm_medium",
            value: "cart_abandon",
            type: "string",
          },
          {
            id: "a8",
            name: "utm_campaign",
            value: "cart_abandoned_7",
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
            value: "cart_abandoned",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "normalize-cart",
    name: "Normalize Cart",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [420, 400],
  },
  {
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
            id: "has-email",
            leftValue: "={{ $json.email }}",
            rightValue: "@",
            operator: { type: "string", operation: "contains" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    id: "if-has-email",
    name: "If has email",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [640, 400],
  },
  {
    parameters: {
      operation: "append",
      documentId: {
        __rl: true,
        value: SHEET_ID,
        mode: "list",
        cachedResultName: "App Spy - Leads Recovery ",
        cachedResultUrl: SHEET_URL,
      },
      sheetName: sheetNameRl(),
      columns: {
        mappingMode: "defineBelow",
        value: {
          email: "={{ $json.email }}",
          name: "={{ $json.name }}",
          "phone ":
            "={{ \"'\" + String($json.phone || '').replace(/^\\+/, '').replace(/^[\\'=]+/, '').trim() }}",
          "purchased ": "={{ $json.purchased }}",
          "visitor_id ": "={{ $json.visitor_id }}",
          "utm_source ": "={{ $json.utm_source }}",
          utm_medium: "={{ $json.utm_medium }}",
          utm_campaign: "={{ $json.utm_campaign }}",
          created_at: "={{ $json.created_at }}",
          status: "={{ $json.status }}",
        },
        matchingColumns: [],
        schema: SCHEMA,
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { cellFormat: "USER_ENTERED" },
      authentication: "oAuth2",
      resource: "sheet",
    },
    id: "append-cart",
    name: "Append cart lead",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [880, 320],
    credentials: {
      googleSheetsOAuth2Api: { id: null, name: "Google Sheets account" },
    },
    notes: "Tab Cart Abandoned only — separate from Leads and Cancel Leads.",
  },
];

const connections = {
  "Webhook Cart": {
    main: [[{ node: "Normalize Cart", type: "main", index: 0 }]],
  },
  "Normalize Cart": {
    main: [[{ node: "If has email", type: "main", index: 0 }]],
  },
  "If has email": {
    main: [[{ node: "Append cart lead", type: "main", index: 0 }], []],
  },
};

let x = 1100;
const y = 320;
let prevNode = "Append cart lead";

for (let i = 0; i < SEQUENCE.length; i++) {
  const step = SEQUENCE[i];
  const k = step.key;
  const waitName = `Wait before ${k.toUpperCase()}`;
  const getName = `Get row (${k.toUpperCase()})`;
  const ifName = `If not purchased (${k.toUpperCase()})`;
  const emailName = step.label;
  const keepName = `Keep after ${k.toUpperCase()}`;

  nodes.push(
    waitNode(
      `wait-${k}`,
      waitName,
      [x, y],
      step.wait.amount,
      step.wait.unit,
      `wait-cart-${k}`
    )
  );
  x += 220;
  nodes.push(getRow(`get-${k}`, getName, [x, y]));
  x += 220;
  nodes.push(ifNotPurchased(`if-${k}`, ifName, [x, y]));
  x += 220;
  nodes.push(
    emailNode(`email-${k}`, emailName, [x, y - 120], step.subject, step.file)
  );
  x += 220;

  connections[prevNode] = {
    main: [[{ node: waitName, type: "main", index: 0 }]],
  };
  connections[waitName] = {
    main: [[{ node: getName, type: "main", index: 0 }]],
  };
  connections[getName] = {
    main: [[{ node: ifName, type: "main", index: 0 }]],
  };
  connections[ifName] = {
    main: [[{ node: emailName, type: "main", index: 0 }], []],
  };

  if (i < SEQUENCE.length - 1) {
    nodes.push(keepFields(`keep-${k}`, keepName, [x, y - 120]));
    x += 220;
    connections[emailName] = {
      main: [[{ node: keepName, type: "main", index: 0 }]],
    };
    prevNode = keepName;
  }
}

const workflow = {
  name: "Cart Abandoned — 7 Emails Recovery",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: {
    description:
      "Cart abandon: 5m A1 $29 → +24h A2 $29 → +24h A3 $29 → +24h A4 $19.50 → +24h A5 → +48h A6 → +48h A7. Sheet: Cart Abandoned.",
  },
  pinData: {},
};

const outPath = path.join(outDir, "workflow-cart-abandoned-7emails.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), "utf8");
console.log("Wrote", outPath, "nodes", nodes.length);
for (const s of SEQUENCE) {
  console.log(
    s.key,
    s.wait.amount + s.wait.unit[0],
    s.subject,
    "→",
    s.file
  );
}
