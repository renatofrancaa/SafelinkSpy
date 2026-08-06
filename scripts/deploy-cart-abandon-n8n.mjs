/**
 * Create Cart Abandoned sheet, import workflow, patch Mark Purchased.
 * Env: N8N_BASE_URL, N8N_API_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud";
const key = process.env.N8N_API_KEY;
if (!key) {
  console.error("N8N_API_KEY required");
  process.exit(1);
}

const headers = {
  "X-N8N-API-KEY": key,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const DOC = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
};
const SHEETS = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};
const RESEND = {
  httpHeaderAuth: { id: "kgfB071PoLJfLOZd", name: "Header Auth account" },
};
const SHEET_NAME = "Cart Abandoned";
const SHEET_CART = { __rl: true, value: SHEET_NAME, mode: "name" };

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

async function api(method, p, body) {
  const r = await fetch(base + p, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

async function cleanup(prefix) {
  const list = await api("GET", "/api/v1/workflows");
  for (const w of list.j.data || []) {
    if ((w.name || "").startsWith(prefix)) {
      await api("POST", `/api/v1/workflows/${w.id}/deactivate`).catch(() => {});
      await api("DELETE", `/api/v1/workflows/${w.id}`);
    }
  }
}

async function runTmp(name, pathSeg, nodes, connections) {
  await cleanup(name.slice(0, 10));
  const c = await api("POST", "/api/v1/workflows", {
    name,
    nodes,
    connections,
    settings: { executionOrder: "v1" },
  });
  if (c.status >= 400) {
    console.error(JSON.stringify(c.j).slice(0, 600));
    process.exit(1);
  }
  const id = (c.j.data || c.j).id;
  await api("POST", `/api/v1/workflows/${id}/activate`);
  await new Promise((r) => setTimeout(r, 2500));
  const hit = await fetch(base + "/webhook/" + pathSeg, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  console.log(name, hit.status, (await hit.text()).slice(0, 200));
  await new Promise((r) => setTimeout(r, 4000));
  await api("POST", `/api/v1/workflows/${id}/deactivate`).catch(() => {});
  await api("DELETE", `/api/v1/workflows/${id}`);
}

// 1) Create sheet + seed headers
console.log("=== sheet ===");
await runTmp(
  "TMP Cart Sheet",
  "tmp-cart-sheet",
  [
    {
      parameters: {
        httpMethod: "POST",
        path: "tmp-cart-sheet",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [200, 300],
      webhookId: "tmp-cart-sheet",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "create",
        documentId: DOC,
        title: SHEET_NAME,
      },
      id: "create",
      name: "Create",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [400, 300],
      credentials: SHEETS,
      onError: "continueRegularOutput",
    },
    {
      parameters: {
        mode: "raw",
        jsonOutput: JSON.stringify({
          email: "seed@example.com",
          name: "seed",
          "phone ": "'0",
          "purchased ": "false",
          "visitor_id ": "",
          "utm_source ": "",
          utm_medium: "",
          utm_campaign: "",
          created_at: new Date().toISOString(),
          status: "seed",
        }),
      },
      id: "set",
      name: "Seed",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [600, 300],
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "clear",
        documentId: DOC,
        sheetName: SHEET_CART,
      },
      id: "clear",
      name: "Clear",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [800, 200],
      credentials: SHEETS,
      onError: "continueRegularOutput",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "append",
        documentId: DOC,
        sheetName: SHEET_CART,
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            name: "={{ $json.name }}",
            "phone ": "={{ $json['phone '] || '' }}",
            "purchased ": "={{ $json['purchased '] || 'false' }}",
            "visitor_id ": "={{ $json['visitor_id '] || '' }}",
            "utm_source ": "={{ $json['utm_source '] || '' }}",
            utm_medium: "={{ $json.utm_medium || '' }}",
            utm_campaign: "={{ $json.utm_campaign || '' }}",
            created_at: "={{ $json.created_at || '' }}",
            status: "={{ $json.status || '' }}",
          },
          matchingColumns: [],
          schema: SCHEMA,
          attemptToConvertTypes: false,
          convertFieldsToString: true,
        },
        options: { cellFormat: "USER_ENTERED" },
      },
      id: "append",
      name: "Append seed",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [1000, 300],
      credentials: SHEETS,
    },
  ],
  {
    Webhook: { main: [[{ node: "Create", type: "main", index: 0 }]] },
    Create: { main: [[{ node: "Seed", type: "main", index: 0 }]] },
    Seed: { main: [[{ node: "Clear", type: "main", index: 0 }]] },
    Clear: { main: [[{ node: "Append seed", type: "main", index: 0 }]] },
  }
);

// Fix: Clear after create wipes before append with wrong order - recreate seed properly
await runTmp(
  "TMP Cart Seed",
  "tmp-cart-seed",
  [
    {
      parameters: {
        httpMethod: "POST",
        path: "tmp-cart-seed",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [200, 300],
      webhookId: "tmp-cart-seed",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "clear",
        documentId: DOC,
        sheetName: SHEET_CART,
      },
      id: "clear",
      name: "Clear",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [400, 300],
      credentials: SHEETS,
      onError: "continueRegularOutput",
    },
    {
      parameters: {
        mode: "raw",
        jsonOutput: JSON.stringify({
          email: "seed@example.com",
          name: "seed",
          "phone ": "'0",
          "purchased ": "false",
          "visitor_id ": "",
          "utm_source ": "",
          utm_medium: "cart_abandon",
          utm_campaign: "seed",
          created_at: new Date().toISOString(),
          status: "seed",
        }),
      },
      id: "set",
      name: "Seed",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [600, 300],
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "append",
        documentId: DOC,
        sheetName: SHEET_CART,
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            name: "={{ $json.name }}",
            "phone ": "={{ $json['phone '] || '' }}",
            "purchased ": "={{ $json['purchased '] || 'false' }}",
            "visitor_id ": "",
            "utm_source ": "",
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
      },
      id: "append",
      name: "Append seed",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [800, 300],
      credentials: SHEETS,
    },
  ],
  {
    Webhook: { main: [[{ node: "Clear", type: "main", index: 0 }]] },
    Clear: { main: [[{ node: "Seed", type: "main", index: 0 }]] },
    Seed: { main: [[{ node: "Append seed", type: "main", index: 0 }]] },
  }
);

// 2) Import cart workflow
console.log("=== import workflow ===");
const raw = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "docs", "n8n", "workflow-cart-abandoned-7emails.json"),
    "utf8"
  )
);
for (const n of raw.nodes) {
  if (n.type === "n8n-nodes-base.googleSheets") {
    n.credentials = SHEETS;
    n.parameters.documentId = DOC;
    n.parameters.sheetName = SHEET_CART;
  }
  if (n.type === "n8n-nodes-base.httpRequest") {
    n.credentials = RESEND;
  }
}

const list = await api("GET", "/api/v1/workflows");
const existing = (list.j.data || []).find((w) =>
  (w.name || "").toLowerCase().includes("cart abandoned")
);
let wfId;
if (existing) {
  console.log("updating", existing.id);
  const full = await api("GET", `/api/v1/workflows/${existing.id}`);
  const cur = full.j.data || full.j;
  const put = await api("PUT", `/api/v1/workflows/${existing.id}`, {
    name: raw.name,
    nodes: raw.nodes,
    connections: raw.connections,
    settings: raw.settings,
    staticData: cur.staticData || null,
  });
  console.log("PUT", put.status);
  wfId = existing.id;
} else {
  const created = await api("POST", "/api/v1/workflows", {
    name: raw.name,
    nodes: raw.nodes,
    connections: raw.connections,
    settings: raw.settings,
  });
  console.log("POST", created.status);
  if (created.status >= 400) {
    console.error(JSON.stringify(created.j).slice(0, 800));
    process.exit(1);
  }
  wfId = (created.j.data || created.j).id;
}
await api("POST", `/api/v1/workflows/${wfId}/activate`);
console.log("cart workflow active", wfId);

// 3) Mark purchased → also Cart Abandoned
console.log("=== mark purchased triple sheet ===");
const markId = "Cqnv5dddUkc9uosc";
const mg = await api("GET", `/api/v1/workflows/${markId}`);
const mark = mg.j.data || mg.j;

if (!mark.nodes.find((n) => n.id === "update-cart-row")) {
  mark.nodes.push({
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "update",
      documentId: DOC,
      sheetName: SHEET_CART,
      columns: {
        mappingMode: "defineBelow",
        value: {
          email: "={{ $json.email }}",
          "purchased ": "true",
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
            id: "purchased ",
            displayName: "purchased ",
            required: false,
            defaultMatch: false,
            display: true,
            type: "string",
            canBeUsedToMatch: true,
            removed: false,
          },
          {
            id: "status",
            displayName: "status",
            required: false,
            defaultMatch: false,
            display: true,
            type: "string",
            canBeUsedToMatch: true,
            removed: false,
          },
        ],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { cellFormat: "USER_ENTERED" },
    },
    id: "update-cart-row",
    name: "Update purchased — Cart Abandoned",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [1180, 300],
    credentials: SHEETS,
    onError: "continueRegularOutput",
  });
}

// chain: keep email after cancel update → cart update
if (!mark.nodes.find((n) => n.id === "keep-for-cart")) {
  mark.nodes.push({
    parameters: {
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Purchase').item.json.email }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "keep-for-cart",
    name: "Keep email for Cart sheet",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [1070, 300],
  });
}

// rebuild connections carefully
const leadsNode =
  mark.nodes.find((n) => (n.name || "").includes("— Leads"))?.name ||
  "Update purchased — Leads";
const cancelNode =
  mark.nodes.find((n) => (n.name || "").includes("Cancel Leads"))?.name ||
  "Update purchased — Cancel Leads";

mark.connections = {
  "Webhook Purchase": {
    main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
  },
  "Normalize Purchase": {
    main: [[{ node: leadsNode, type: "main", index: 0 }]],
  },
  [leadsNode]: {
    main: [[{ node: "Keep email for Cancel sheet", type: "main", index: 0 }]],
  },
  "Keep email for Cancel sheet": {
    main: [[{ node: cancelNode, type: "main", index: 0 }]],
  },
  [cancelNode]: {
    main: [[{ node: "Keep email for Cart sheet", type: "main", index: 0 }]],
  },
  "Keep email for Cart sheet": {
    main: [
      [
        {
          node: "Update purchased — Cart Abandoned",
          type: "main",
          index: 0,
        },
      ],
    ],
  },
};

// ensure keep-for-cancel exists
if (!mark.nodes.find((n) => n.id === "keep-for-cancel")) {
  mark.nodes.push({
    parameters: {
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Purchase').item.json.email }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "keep-for-cancel",
    name: "Keep email for Cancel sheet",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [840, 300],
  });
}

const mp = await api("PUT", `/api/v1/workflows/${markId}`, {
  name: mark.name,
  nodes: mark.nodes,
  connections: mark.connections,
  settings: mark.settings,
  staticData: mark.staticData || null,
});
console.log("mark PUT", mp.status, mp.j.name || mp.j.message);
if (mp.status >= 400) console.log(JSON.stringify(mp.j).slice(0, 500));
await api("POST", `/api/v1/workflows/${markId}/activate`);

// smoke
console.log("=== smoke ===");
await new Promise((r) => setTimeout(r, 1500));
const tr = await fetch(base + "/webhook/cart-abandoned", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "cart-test@example.com",
    name: "Cart Test",
    phone: "15550004444",
  }),
});
console.log("webhook", tr.status, await tr.text());
await new Promise((r) => setTimeout(r, 5000));
const e = await api(
  "GET",
  `/api/v1/executions?limit=1&workflowId=${encodeURIComponent(wfId)}`
);
const latest = (e.j.data || [])[0];
console.log(
  "latest",
  latest && { id: latest.id, status: latest.status, waitTill: latest.waitTill }
);
if (latest?.status === "error") {
  const det = await api(
    "GET",
    `/api/v1/executions/${latest.id}?includeData=true`
  );
  console.log(
    "ERR",
    det.j.data?.resultData?.error?.message ||
      det.j.resultData?.error?.message
  );
}
console.log("WEBHOOK=https://infosd.app.n8n.cloud/webhook/cart-abandoned");
console.log("DONE");
