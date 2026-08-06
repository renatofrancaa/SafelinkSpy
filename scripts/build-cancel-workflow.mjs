/**
 * Build n8n workflow JSON for card-refused / cancel recovery — 7 emails.
 * Run: node scripts/build-cancel-workflow.mjs
 *
 * Does NOT import/activate n8n — only writes files under docs/n8n/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const emailsDir = path.join(root, "docs", "cancel-emails");
const outDir = path.join(root, "docs", "n8n");

const SHEET_ID = "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU";
/** Separate tab from funnel recovery "Leads" — no row conflicts */
const SHEET_NAME = "Cancel Leads";
const SHEET_GID = null; // name mode
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit?usp=drivesdk";

function sheetNameRl() {
  return {
    __rl: true,
    value: SHEET_NAME,
    mode: "name",
  };
}

/** Sequence definition: wait BEFORE each email (after previous step). */
const SEQUENCE = [
  {
    key: "c1",
    wait: { amount: 15, unit: "minutes" },
    subject: "'We noticed an issue with your order'",
    label: "Email C1 — issue with order ($39)",
    file: "c1.html",
  },
  {
    key: "c2",
    wait: { amount: 24, unit: "hours" },
    subject: "'Your results are still waiting for you'",
    label: "Email C2 — results waiting ($39)",
    file: "c2.html",
  },
  {
    key: "c3",
    wait: { amount: 24, unit: "hours" },
    subject: "'Your report is still locked'",
    label: "Email C3 — still locked ($39)",
    file: "c3.html",
  },
  {
    key: "c4",
    wait: { amount: 24, unit: "hours" },
    subject: "'A special offer just for you'",
    label: "Email C4 — special offer ($29)",
    file: "c4.html",
  },
  {
    key: "c5",
    wait: { amount: 24, unit: "hours" },
    subject: "'Your 25% discount is still available'",
    label: "Email C5 — discount still open ($29)",
    file: "c5.html",
  },
  {
    key: "c6",
    wait: { amount: 48, unit: "hours" },
    subject: "'Don\\'t lose access to what we found'",
    label: "Email C6 — ending soon ($29)",
    file: "c6.html",
  },
  {
    key: "c7",
    wait: { amount: 48, unit: "hours" },
    subject: "'Final notice: incomplete order'",
    label: "Email C7 — final notice ($29)",
    file: "c7.html",
  },
];

function loadHtml(name) {
  return fs.readFileSync(path.join(emailsDir, name), "utf8");
}

function htmlToJsExpr(html) {
  let s = JSON.stringify(html);
  s = s.replace(/\{\{\s*\$json\.(\w+)(?:\s*\|\|\s*'([^']*)')?\s*\}\}/g, (_, key, fallback) => {
    if (fallback !== undefined) {
      return `" + ($json.${key} || ${JSON.stringify(fallback)}) + "`;
    }
    return `" + ($json.${key} || '') + "`;
  });
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
            lookupValue: "={{ $('Normalize Cancel').item.json.email }}",
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
            value: "={{ $('Normalize Cancel').item.json.email }}",
            type: "string",
          },
          {
            id: "k2",
            name: "name",
            value: "={{ $('Normalize Cancel').item.json.name }}",
            type: "string",
          },
          {
            id: "k3",
            name: "phone",
            value: "={{ $('Normalize Cancel').item.json.phone }}",
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
      path: "order-cancelled",
      responseMode: "onReceived",
      options: {},
    },
    id: "wh-cancel",
    name: "Webhook Cancel",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [200, 400],
    webhookId: "order-cancelled",
    notes:
      "PerfectPay card refused / cancelled. Body: email, name, phone. 7-email sequence.",
  },
  {
    parameters: {
      assignments: {
        assignments: [
          {
            id: "a1",
            name: "email",
            value:
              "={{ String($json.body?.email || $json.body?.customer?.email || $json.email || '').trim().toLowerCase() }}",
            type: "string",
          },
          {
            id: "a2",
            name: "name",
            value:
              "={{ String($json.body?.name || $json.body?.customer?.name || $json.body?.customer?.full_name || $json.name || '').trim() }}",
            type: "string",
          },
          {
            id: "a3",
            name: "phone",
            value:
              "={{ String($json.body?.phone || $json.body?.customer?.phone_number || $json.body?.customer?.phone || $json.phone || '').trim() }}",
            type: "string",
          },
          { id: "a4", name: "purchased", value: "false", type: "string" },
          {
            id: "a5",
            name: "order_code",
            value:
              "={{ String($json.body?.code || $json.body?.order_code || $json.code || '') }}",
            type: "string",
          },
          {
            id: "a6",
            name: "sale_status",
            value:
              "={{ String($json.body?.sale_status_enum || $json.body?.sale_status || $json.sale_status || 'cancelled') }}",
            type: "string",
          },
          {
            id: "a7",
            name: "created_at",
            value: "={{ $now.toISO() }}",
            type: "string",
          },
          { id: "a8", name: "status", value: "card_refused", type: "string" },
          { id: "a9", name: "utm_source", value: "email", type: "string" },
          {
            id: "a10",
            name: "utm_medium",
            value: "cancel_recovery",
            type: "string",
          },
          {
            id: "a11",
            name: "utm_campaign",
            value: "card_refused_7",
            type: "string",
          },
          {
            id: "a12",
            name: "visitor_id",
            value:
              "={{ String($json.body?.visitor_id || $json.body?.metadata?.zs_vid || '') }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "normalize-cancel",
    name: "Normalize Cancel",
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
        schema: [
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
          defaultMatch: false,
          display: true,
          type: "string",
          canBeUsedToMatch: true,
          removed: false,
        })),
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { cellFormat: "USER_ENTERED" },
      authentication: "oAuth2",
      resource: "sheet",
    },
    id: "append-cancel",
    name: "Append cancel lead",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [880, 320],
    credentials: {
      googleSheetsOAuth2Api: { id: null, name: "Google Sheets account" },
    },
    notes:
      "Tab Cancel Leads (separate from funnel Leads). purchased=true on this tab stops cancel sequence.",
  },
];

const connections = {
  "Webhook Cancel": {
    main: [[{ node: "Normalize Cancel", type: "main", index: 0 }]],
  },
  "Normalize Cancel": {
    main: [[{ node: "If has email", type: "main", index: 0 }]],
  },
  "If has email": {
    main: [[{ node: "Append cancel lead", type: "main", index: 0 }], []],
  },
};

// Build email chain
let x = 1100;
const y = 320;
let prevNode = "Append cancel lead";

for (let i = 0; i < SEQUENCE.length; i++) {
  const step = SEQUENCE[i];
  const k = step.key;
  const waitName = `Wait before ${k.toUpperCase()}`;
  const getName = `Get row (${k.toUpperCase()})`;
  const ifName = `If not purchased (${k.toUpperCase()})`;
  const emailName = step.label;
  const keepName = `Keep after ${k.toUpperCase()}`;

  const waitId = `wait-${k}`;
  const getId = `get-${k}`;
  const ifId = `if-${k}`;
  const emailId = `email-${k}`;
  const keepId = `keep-${k}`;

  nodes.push(
    waitNode(
      waitId,
      waitName,
      [x, y],
      step.wait.amount,
      step.wait.unit,
      `wait-cancel-${k}`
    )
  );
  x += 220;
  nodes.push(getRow(getId, getName, [x, y]));
  x += 220;
  nodes.push(ifNotPurchased(ifId, ifName, [x, y]));
  x += 220;
  nodes.push(emailNode(emailId, emailName, [x, y - 120], step.subject, step.file));
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
    nodes.push(keepFields(keepId, keepName, [x, y - 120]));
    x += 220;
    connections[emailName] = {
      main: [[{ node: keepName, type: "main", index: 0 }]],
    };
    prevNode = keepName;
  } else {
    // last email — no keep needed
    prevNode = emailName;
  }
}

const workflow = {
  name: "Cancel / Card Refused — 7 Emails Recovery",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: {
    templateCredsSetupCompleted: false,
    description:
      "Card refused sequence: 5m C1 $39 → +24h C2 $39 → +24h C3 $39 → +24h C4 $29 → +24h C5 $29 → +48h C6 $29 → +48h C7 $29. Stops if purchased=true.",
  },
  pinData: {},
};

const outPath = path.join(outDir, "workflow-cancel-card-refused-7emails.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), "utf8");
console.log("Wrote", outPath);
console.log("Nodes:", nodes.length);
console.log("Sequence:");
let day = 0;
for (const s of SEQUENCE) {
  const w =
    s.wait.unit === "minutes"
      ? `${s.wait.amount} min`
      : `+${s.wait.amount}h`;
  console.log(`  ${s.key.toUpperCase()} ${w} | ${s.subject}`);
}

// Keep old filename as alias pointing note? Write both for clarity
const alias = path.join(outDir, "workflow-cancel-card-refused-4emails.json");
fs.writeFileSync(
  alias,
  JSON.stringify(
    {
      ...workflow,
      name: workflow.name + " (alias of 7-email)",
    },
    null,
    2
  ),
  "utf8"
);
console.log("Also updated legacy filename as alias:", alias);
