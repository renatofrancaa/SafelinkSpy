/**
 * 1) Create Google Sheet tab "Cancel Leads" (+ header row) via n8n one-shot
 * 2) Point cancel-7 workflow Append/Get to that tab
 * 3) Mark Purchased updates BOTH Leads + Cancel Leads
 *
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
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit?usp=drivesdk",
};

const SHEET_LEADS = {
  __rl: true,
  value: 1597998998,
  mode: "list",
  cachedResultName: "Leads",
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit#gid=1597998998",
};

// Name mode works once the tab exists
const SHEET_CANCEL = {
  __rl: true,
  value: "Cancel Leads",
  mode: "name",
};

const SHEETS_CRED = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};
const RESEND_CRED = {
  httpHeaderAuth: { id: "kgfB071PoLJfLOZd", name: "Header Auth account" },
};

const COL_SCHEMA_FULL = [
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

const PURCHASE_SCHEMA = [
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
];

async function api(method, path, body) {
  const r = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    j = { raw: text.slice(0, 500) };
  }
  return { status: r.status, j };
}

function sheetRefCancel(gid) {
  if (gid != null) {
    return {
      __rl: true,
      value: gid,
      mode: "list",
      cachedResultName: "Cancel Leads",
      cachedResultUrl: `https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit#gid=${gid}`,
    };
  }
  return SHEET_CANCEL;
}

// --- Step 1: one-shot create sheet + header ---
async function ensureCancelSheet() {
  const oneshot = {
    name: "TMP Create Cancel Leads Sheet",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "tmp-create-cancel-sheet",
          responseMode: "lastNode",
          options: {},
        },
        id: "wh",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [200, 300],
        webhookId: "tmp-create-cancel-sheet",
      },
      {
        parameters: {
          authentication: "oAuth2",
          resource: "sheet",
          operation: "create",
          documentId: DOC,
          title: "Cancel Leads",
        },
        id: "create-sheet",
        name: "Create Cancel Leads",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4.5,
        position: [440, 300],
        credentials: SHEETS_CRED,
        onError: "continueRegularOutput",
      },
      {
        parameters: {
          authentication: "oAuth2",
          resource: "sheet",
          operation: "append",
          documentId: DOC,
          sheetName: SHEET_CANCEL,
          columns: {
            mappingMode: "defineBelow",
            value: {
              email: "email",
              name: "name",
              "phone ": "phone",
              "purchased ": "purchased",
              "visitor_id ": "visitor_id",
              "utm_source ": "utm_source",
              utm_medium: "utm_medium",
              utm_campaign: "utm_campaign",
              created_at: "created_at",
              status: "status",
            },
            matchingColumns: [],
            schema: COL_SCHEMA_FULL,
            attemptToConvertTypes: false,
            convertFieldsToString: true,
          },
          options: { cellFormat: "USER_ENTERED" },
        },
        id: "append-header",
        name: "Append header row",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4.5,
        position: [680, 300],
        credentials: SHEETS_CRED,
        onError: "continueRegularOutput",
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: "Create Cancel Leads", type: "main", index: 0 }]],
      },
      "Create Cancel Leads": {
        main: [[{ node: "Append header row", type: "main", index: 0 }]],
      },
    },
    settings: { executionOrder: "v1" },
  };

  // Delete old tmp if any
  const list = await api("GET", "/api/v1/workflows");
  for (const w of list.j.data || []) {
    if ((w.name || "").includes("TMP Create Cancel")) {
      await api("DELETE", `/api/v1/workflows/${w.id}`);
      console.log("deleted old tmp", w.id);
    }
  }

  const created = await api("POST", "/api/v1/workflows", oneshot);
  if (created.status >= 400) {
    console.error("create tmp failed", JSON.stringify(created.j).slice(0, 800));
    process.exit(1);
  }
  const tmpId = (created.j.data || created.j).id;
  console.log("tmp workflow", tmpId);

  await api("POST", `/api/v1/workflows/${tmpId}/activate`);

  const hit = await fetch(base + "/webhook/tmp-create-cancel-sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const hitText = await hit.text();
  console.log("create sheet webhook", hit.status, hitText.slice(0, 500));

  // Wait for execution
  await new Promise((r) => setTimeout(r, 4000));
  const ex = await api(
    "GET",
    `/api/v1/executions?limit=3&workflowId=${encodeURIComponent(tmpId)}`
  );
  for (const x of ex.j.data || []) {
    console.log("tmp exec", x.id, x.status);
  }

  // Deactivate + delete tmp
  await api("POST", `/api/v1/workflows/${tmpId}/deactivate`).catch(() => {});
  await api("DELETE", `/api/v1/workflows/${tmpId}`);
  console.log("tmp workflow removed");

  // Try to read sheet id via cancel workflow test later; name mode is enough
  return null;
}

function patchCancelWorkflow(wf) {
  for (const n of wf.nodes) {
    if (n.type === "n8n-nodes-base.googleSheets") {
      n.parameters.documentId = DOC;
      n.parameters.sheetName = sheetRefCancel(null);
      n.credentials = SHEETS_CRED;
      // ensure append schema if append
      if (n.parameters.operation === "append" || n.name.includes("Append")) {
        n.parameters.operation = "append";
        n.parameters.columns = {
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
          schema: COL_SCHEMA_FULL,
          attemptToConvertTypes: false,
          convertFieldsToString: true,
        };
      }
    }
    if (n.type === "n8n-nodes-base.httpRequest") {
      n.credentials = RESEND_CRED;
    }
  }
  return wf;
}

function patchMarkPurchased(wf) {
  // Ensure first update is Leads
  const updateLeads = wf.nodes.find(
    (n) => n.id === "update-row" || n.name.includes("Update purchased")
  );
  if (updateLeads) {
    updateLeads.name = "Update purchased — Leads";
    updateLeads.parameters.documentId = DOC;
    updateLeads.parameters.sheetName = SHEET_LEADS;
    updateLeads.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        email: "={{ $json.email }}",
        "purchased ": "true",
        status: "purchased",
      },
      matchingColumns: ["email"],
      schema: PURCHASE_SCHEMA,
      attemptToConvertTypes: false,
      convertFieldsToString: true,
    };
    updateLeads.credentials = SHEETS_CRED;
  }

  // Add second update for Cancel Leads if missing
  let updateCancel = wf.nodes.find((n) => n.id === "update-cancel-row");
  if (!updateCancel) {
    updateCancel = {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "update",
        documentId: DOC,
        sheetName: sheetRefCancel(null),
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            "purchased ": "true",
            status: "purchased",
          },
          matchingColumns: ["email"],
          schema: PURCHASE_SCHEMA,
          attemptToConvertTypes: false,
          convertFieldsToString: true,
        },
        options: { cellFormat: "USER_ENTERED" },
      },
      id: "update-cancel-row",
      name: "Update purchased — Cancel Leads",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [960, 300],
      credentials: SHEETS_CRED,
      onError: "continueRegularOutput",
      notes: "No-op if email only exists on funnel Leads tab",
    };
    wf.nodes.push(updateCancel);
  } else {
    updateCancel.parameters.sheetName = sheetRefCancel(null);
    updateCancel.credentials = SHEETS_CRED;
    updateCancel.onError = "continueRegularOutput";
  }

  // Keep email through both updates: Normalize -> Update Leads -> Keep -> Update Cancel
  // Or connect Update Leads directly to Update Cancel (data may change). Better insert Set keep.
  let keep = wf.nodes.find((n) => n.id === "keep-for-cancel");
  if (!keep) {
    keep = {
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
              name: "purchased",
              value: "true",
              type: "string",
            },
            {
              id: "k3",
              name: "status",
              value: "purchased",
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
    };
    wf.nodes.push(keep);
  }

  wf.connections = {
    "Webhook Purchase": {
      main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
    },
    "Normalize Purchase": {
      main: [
        [
          {
            node: updateLeads?.name || "Update purchased — Leads",
            type: "main",
            index: 0,
          },
        ],
      ],
    },
    [updateLeads?.name || "Update purchased — Leads"]: {
      main: [[{ node: "Keep email for Cancel sheet", type: "main", index: 0 }]],
    },
    "Keep email for Cancel sheet": {
      main: [
        [{ node: "Update purchased — Cancel Leads", type: "main", index: 0 }],
      ],
    },
  };

  return wf;
}

// --- main ---
console.log("=== 1) Ensure Cancel Leads tab ===");
await ensureCancelSheet();

console.log("=== 2) Patch cancel 7-email workflow ===");
const cancelId = "hL6HZlyHEtAeBI3u";
const cancelGet = await api("GET", `/api/v1/workflows/${cancelId}`);
let cancelWf = cancelGet.j.data || cancelGet.j;
cancelWf = patchCancelWorkflow(cancelWf);
const cancelPut = await api("PUT", `/api/v1/workflows/${cancelId}`, {
  name: cancelWf.name,
  nodes: cancelWf.nodes,
  connections: cancelWf.connections,
  settings: cancelWf.settings,
  staticData: cancelWf.staticData || null,
});
console.log("cancel PUT", cancelPut.status, cancelPut.j.name || cancelPut.j.message);
if (cancelPut.status >= 400) {
  console.log(JSON.stringify(cancelPut.j).slice(0, 1000));
  process.exit(1);
}
await api("POST", `/api/v1/workflows/${cancelId}/activate`);
console.log("cancel active");

console.log("=== 3) Patch Mark Purchased (both sheets) ===");
const markId = "Cqnv5dddUkc9uosc";
const markGet = await api("GET", `/api/v1/workflows/${markId}`);
let markWf = markGet.j.data || markGet.j;
markWf = patchMarkPurchased(markWf);
const markPut = await api("PUT", `/api/v1/workflows/${markId}`, {
  name: markWf.name,
  nodes: markWf.nodes,
  connections: markWf.connections,
  settings: markWf.settings,
  staticData: markWf.staticData || null,
});
console.log("mark PUT", markPut.status, markPut.j.name || markPut.j.message);
if (markPut.status >= 400) {
  console.log(JSON.stringify(markPut.j).slice(0, 1000));
  process.exit(1);
}
await api("POST", `/api/v1/workflows/${markId}/activate`);
console.log("mark active");

// Smoke test append to Cancel Leads only
console.log("=== 4) Smoke test cancel webhook ===");
const tr = await fetch(base + "/webhook/order-cancelled", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "cancel-sheet-test@example.com",
    name: "Sheet Test",
    phone: "15550001111",
    code: "SHEET-TEST-1",
    sale_status_enum: 6,
  }),
});
console.log("webhook", tr.status, await tr.text());
await new Promise((r) => setTimeout(r, 4000));
const e = await api(
  "GET",
  `/api/v1/executions?limit=2&workflowId=${encodeURIComponent(cancelId)}`
);
for (const x of e.j.data || []) {
  console.log({ id: x.id, status: x.status, waitTill: x.waitTill });
}
const latest = (e.j.data || [])[0];
if (latest?.status === "error") {
  const det = await api(
    "GET",
    `/api/v1/executions/${latest.id}?includeData=true`
  );
  const err = det.j.data?.resultData?.error || det.j.resultData?.error;
  console.log("ERROR", err?.message || err?.description);
}

// Update local docs/build
const localBuild = path.join(__dirname, "build-cancel-workflow.mjs");
let src = fs.readFileSync(localBuild, "utf8");
if (!src.includes("Cancel Leads")) {
  src = src.replace(
    'const SHEET_NAME = "Leads";\nconst SHEET_GID = 1597998998;',
    'const SHEET_NAME = "Cancel Leads";\nconst SHEET_GID = null; // use name mode'
  );
  // more reliable: write note in CANCEL setup
}
fs.writeFileSync(
  path.join(__dirname, "..", "docs", "n8n", "CANCEL-SHEET-SEPARATION.md"),
  `# Cancel Leads — aba separada

## Planilha
Documento: **App Spy - Leads Recovery**  
Abas:
| Aba | Uso |
|-----|-----|
| **Leads** | Recovery do funil (4 e-mails) |
| **Cancel Leads** | Cartão recusado / cancel (7 e-mails) |

Mesmas colunas:
\`\`\`
email | name | phone | purchased | visitor_id | utm_source | utm_medium | utm_campaign | created_at | status
\`\`\`

## Mark Purchased
Atualiza **as duas** abas por e-mail → as duas sequências param.

## Workflows cloud
- Cancel 7 emails → só **Cancel Leads**
- Recovery 4 emails → só **Leads**
- Mark purchased → Leads + Cancel Leads
`,
  "utf8"
);

console.log("DONE");
