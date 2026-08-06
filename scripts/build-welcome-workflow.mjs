/**
 * Build n8n workflow: Welcome after purchase — 5 emails
 * Webhook purchase-welcome → W1 → 3h → W2 → 1d → W3 → 2d → W4 → 3d → W5
 *
 * Run: node scripts/build-welcome-workflow.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const emailsDir = path.join(root, "docs", "welcome-emails");
const outDir = path.join(root, "docs", "n8n");

const SEQUENCE = [
  {
    key: "w1",
    wait: null,
    subject: "'Welcome — your access is ready'",
    label: "Email W1 — welcome",
    file: "w1.html",
  },
  {
    key: "w2",
    wait: { amount: 3, unit: "hours" },
    subject: "'Quick start: open your portal'",
    label: "Email W2 — quick start",
    file: "w2.html",
  },
  {
    key: "w3",
    wait: { amount: 1, unit: "days" },
    subject: "'Your report is waiting'",
    label: "Email W3 — report waiting",
    file: "w3.html",
  },
  {
    key: "w4",
    wait: { amount: 2, unit: "days" },
    subject: "'Tip: check your dashboard alerts'",
    label: "Email W4 — tip",
    file: "w4.html",
  },
  {
    key: "w5",
    wait: { amount: 3, unit: "days" },
    subject: "'You\\'re all set'",
    label: "Email W5 — all set",
    file: "w5.html",
  },
];

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
  // Reply-To support for human replies later
  return `={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: [$json.email], reply_to: 'support@mysafelinkspy.com', subject: ${subjectExpr}, html: ${htmlExpr} }) }}`;
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

function keepFields(id, name, position) {
  return {
    parameters: {
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Purchase').item.json.email }}",
            type: "string",
          },
          {
            id: "k2",
            name: "name",
            value: "={{ $('Normalize Purchase').item.json.name }}",
            type: "string",
          },
          {
            id: "k3",
            name: "phone",
            value: "={{ $('Normalize Purchase').item.json.phone }}",
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
      path: "purchase-welcome",
      responseMode: "onReceived",
      options: {},
    },
    id: "wh-welcome",
    name: "Webhook Purchase Welcome",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [200, 300],
    webhookId: "purchase-welcome",
    notes: "Triggered on PerfectPay approved (from app N8N_WELCOME_WEBHOOK_URL)",
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
          {
            id: "a4",
            name: "order_code",
            value:
              "={{ String($json.body?.order_code || $json.body?.code || $json.order_code || '') }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "normalize-purchase",
    name: "Normalize Purchase",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [420, 300],
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
    id: "if-email",
    name: "If has email",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [640, 300],
  },
];

const connections = {
  "Webhook Purchase Welcome": {
    main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
  },
  "Normalize Purchase": {
    main: [[{ node: "If has email", type: "main", index: 0 }]],
  },
};

let x = 880;
const y = 220;
let prevNode = "If has email";
let prevIsIf = true;

for (let i = 0; i < SEQUENCE.length; i++) {
  const step = SEQUENCE[i];
  const k = step.key;

  if (step.wait) {
    const waitName = `Wait before ${k.toUpperCase()}`;
    nodes.push(
      waitNode(
        `wait-${k}`,
        waitName,
        [x, y],
        step.wait.amount,
        step.wait.unit,
        `wait-welcome-${k}`
      )
    );
    if (prevIsIf) {
      connections[prevNode] = {
        main: [[{ node: waitName, type: "main", index: 0 }], []],
      };
    } else {
      connections[prevNode] = {
        main: [[{ node: waitName, type: "main", index: 0 }]],
      };
    }
    prevNode = waitName;
    prevIsIf = false;
    x += 220;

    const keepName = `Keep before ${k.toUpperCase()}`;
    nodes.push(keepFields(`keep-${k}`, keepName, [x, y]));
    connections[prevNode] = {
      main: [[{ node: keepName, type: "main", index: 0 }]],
    };
    prevNode = keepName;
    x += 220;
  }

  const emailName = step.label;
  nodes.push(
    emailNode(
      `email-${k}`,
      emailName,
      [x, y],
      step.subject,
      step.file
    )
  );

  if (prevIsIf) {
    connections[prevNode] = {
      main: [[{ node: emailName, type: "main", index: 0 }], []],
    };
  } else {
    connections[prevNode] = {
      main: [[{ node: emailName, type: "main", index: 0 }]],
    };
  }
  prevNode = emailName;
  prevIsIf = false;
  x += 220;
}

const workflow = {
  name: "Welcome Purchase — 5 Emails",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: {
    description:
      "Buyers only: W1 immediate → 3h W2 → 1d W3 → 2d W4 → 3d W5. Webhook purchase-welcome. Resend.",
  },
  pinData: {},
};

const out = path.join(outDir, "workflow-welcome-purchase-5emails.json");
fs.writeFileSync(out, JSON.stringify(workflow, null, 2), "utf8");
console.log("Wrote", out, "nodes", nodes.length);
for (const s of SEQUENCE) {
  console.log(
    s.key,
    s.wait ? `+${s.wait.amount}${s.wait.unit[0]}` : "immediate",
    s.subject
  );
}
