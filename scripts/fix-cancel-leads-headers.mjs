/**
 * Ensure Cancel Leads exists with SAME column headers as funnel Leads
 * (including trailing spaces), then point cancel + mark workflows there.
 */
const base = process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud";
const key = process.env.N8N_API_KEY;
const headers = {
  "X-N8N-API-KEY": key,
  Accept: "application/json",
  "Content-Type": "application/json",
};

const SPREADSHEET_ID = "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU";
const DOC = {
  __rl: true,
  value: SPREADSHEET_ID,
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
  cachedResultUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=drivesdk`,
};
const SHEET_LEADS = {
  __rl: true,
  value: 1597998998,
  mode: "list",
  cachedResultName: "Leads",
};
const SHEETS_CRED = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};

// Exact same keys as working recovery Append
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

async function api(method, path, body) {
  const r = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

async function cleanupTmp() {
  const list = await api("GET", "/api/v1/workflows");
  for (const w of list.j.data || []) {
    if ((w.name || "").startsWith("TMP ")) {
      await api("POST", `/api/v1/workflows/${w.id}/deactivate`).catch(() => {});
      await api("DELETE", `/api/v1/workflows/${w.id}`);
    }
  }
}

async function runOnce(name, path, nodes, connections) {
  await cleanupTmp();
  const created = await api("POST", "/api/v1/workflows", {
    name,
    nodes,
    connections,
    settings: { executionOrder: "v1" },
  });
  if (created.status >= 400) {
    console.error(JSON.stringify(created.j).slice(0, 900));
    process.exit(1);
  }
  const id = (created.j.data || created.j).id;
  await api("POST", `/api/v1/workflows/${id}/activate`);
  // Cloud needs a moment to register production webhooks
  await new Promise((r) => setTimeout(r, 2500));
  const hit = await fetch(base + "/webhook/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const text = await hit.text();
  console.log(name, hit.status, text.slice(0, 400));
  await new Promise((r) => setTimeout(r, 5000));
  const ex = await api(
    "GET",
    `/api/v1/executions?limit=1&workflowId=${encodeURIComponent(id)}`
  );
  const row = ex.j.data?.[0];
  let runData = null;
  if (row) {
    const det = await api(
      "GET",
      `/api/v1/executions/${row.id}?includeData=true`
    );
    runData = det.j.data?.resultData?.runData || det.j.resultData?.runData;
    console.log(
      "exec",
      row.status,
      det.j.data?.resultData?.error?.message ||
        det.j.resultData?.error?.message ||
        ""
    );
  }
  await api("POST", `/api/v1/workflows/${id}/deactivate`).catch(() => {});
  await api("DELETE", `/api/v1/workflows/${id}`);
  return { text, runData, status: row?.status };
}

// Step A: try create (ignore if exists)
console.log("=== create Cancel Leads (if missing) ===");
await runOnce(
  "TMP Ensure Cancel Sheet",
  "tmp-ensure-cancel",
  [
    {
      parameters: {
        httpMethod: "POST",
        path: "tmp-ensure-cancel",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [200, 300],
      webhookId: "tmp-ensure-cancel",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "create",
        documentId: DOC,
        title: "Cancel Leads",
      },
      id: "create",
      name: "Create",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [440, 300],
      credentials: SHEETS_CRED,
      onError: "continueRegularOutput",
    },
  ],
  { Webhook: { main: [[{ node: "Create", type: "main", index: 0 }]] } }
);

// Step B: clear entire sheet then append using Set-only fields (no create junk)
console.log("=== clear + write proper header via seed append ===");
const seed = await runOnce(
  "TMP Seed Cancel Headers",
  "tmp-seed-cancel",
  [
    {
      parameters: {
        httpMethod: "POST",
        path: "tmp-seed-cancel",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [200, 300],
      webhookId: "tmp-seed-cancel",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "clear",
        documentId: DOC,
        sheetName: { __rl: true, value: "Cancel Leads", mode: "name" },
      },
      id: "clear",
      name: "Clear",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [400, 300],
      credentials: SHEETS_CRED,
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
        options: {},
      },
      id: "set",
      name: "Seed row",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [620, 300],
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "append",
        documentId: DOC,
        sheetName: { __rl: true, value: "Cancel Leads", mode: "name" },
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            name: "={{ $json.name }}",
            "phone ": "={{ $json['phone '] || $json.phone || '' }}",
            "purchased ": "={{ $json['purchased '] || $json.purchased || '' }}",
            "visitor_id ":
              "={{ $json['visitor_id '] || $json.visitor_id || '' }}",
            "utm_source ":
              "={{ $json['utm_source '] || $json.utm_source || '' }}",
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
      position: [840, 300],
      credentials: SHEETS_CRED,
    },
  ],
  {
    Webhook: { main: [[{ node: "Clear", type: "main", index: 0 }]] },
    Clear: { main: [[{ node: "Seed row", type: "main", index: 0 }]] },
    "Seed row": { main: [[{ node: "Append seed", type: "main", index: 0 }]] },
  }
);

console.log("seed result status", seed.status);

// Patch cancel workflow
console.log("=== patch cancel workflow ===");
const cancelId = "hL6HZlyHEtAeBI3u";
const SHEET_CANCEL = {
  __rl: true,
  value: "Cancel Leads",
  mode: "name",
};
const cg = await api("GET", `/api/v1/workflows/${cancelId}`);
const cancel = cg.j.data || cg.j;
for (const n of cancel.nodes) {
  if (n.type === "n8n-nodes-base.googleSheets") {
    n.parameters.documentId = DOC;
    n.parameters.sheetName = SHEET_CANCEL;
    n.credentials = SHEETS_CRED;
    if (n.name.includes("Append") || n.parameters.operation === "append") {
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
        schema: SCHEMA,
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      };
      n.parameters.options = { cellFormat: "USER_ENTERED" };
    }
  }
}
const cp = await api("PUT", `/api/v1/workflows/${cancelId}`, {
  name: cancel.name,
  nodes: cancel.nodes,
  connections: cancel.connections,
  settings: cancel.settings,
  staticData: cancel.staticData || null,
});
console.log("cancel PUT", cp.status, cp.j.name || cp.j.message);
await api("POST", `/api/v1/workflows/${cancelId}/activate`);

// Mark purchased: Leads (keep) + Cancel Leads
console.log("=== patch mark purchased ===");
const markId = "Cqnv5dddUkc9uosc";
const mg = await api("GET", `/api/v1/workflows/${markId}`);
const mark = mg.j.data || mg.j;

// ensure dual update exists
if (!mark.nodes.find((n) => n.id === "update-cancel-row")) {
  mark.nodes.push({
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "update",
      documentId: DOC,
      sheetName: SHEET_CANCEL,
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
    id: "update-cancel-row",
    name: "Update purchased — Cancel Leads",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [960, 300],
    credentials: SHEETS_CRED,
    onError: "continueRegularOutput",
  });
}

for (const n of mark.nodes) {
  if (n.id === "update-cancel-row" || (n.name || "").includes("Cancel Leads")) {
    n.parameters.sheetName = SHEET_CANCEL;
    n.parameters.documentId = DOC;
    n.credentials = SHEETS_CRED;
    n.onError = "continueRegularOutput";
    n.parameters.columns = {
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
    };
  }
  if (
    (n.name || "").includes("Update purchased") &&
    !(n.name || "").includes("Cancel")
  ) {
    n.parameters.sheetName = SHEET_LEADS;
    n.parameters.documentId = DOC;
    n.credentials = SHEETS_CRED;
    n.name = "Update purchased — Leads";
  }
}

// Fix connections for dual update
const leadsName =
  mark.nodes.find((n) => (n.name || "").includes("— Leads"))?.name ||
  mark.nodes.find((n) => n.id === "update-row")?.name ||
  "Update purchased — Leads";
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
mark.connections = {
  "Webhook Purchase": {
    main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
  },
  "Normalize Purchase": {
    main: [[{ node: leadsName, type: "main", index: 0 }]],
  },
  [leadsName]: {
    main: [[{ node: "Keep email for Cancel sheet", type: "main", index: 0 }]],
  },
  "Keep email for Cancel sheet": {
    main: [
      [{ node: "Update purchased — Cancel Leads", type: "main", index: 0 }],
    ],
  },
};

const mp = await api("PUT", `/api/v1/workflows/${markId}`, {
  name: mark.name,
  nodes: mark.nodes,
  connections: mark.connections,
  settings: mark.settings,
  staticData: mark.staticData || null,
});
console.log("mark PUT", mp.status, mp.j.name || mp.j.message);
if (mp.status >= 400) console.log(JSON.stringify(mp.j).slice(0, 600));
await api("POST", `/api/v1/workflows/${markId}/activate`);

console.log("=== smoke cancel webhook ===");
await new Promise((r) => setTimeout(r, 1500));
const tr = await fetch(base + "/webhook/order-cancelled", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "cancel-ok-final@example.com",
    name: "Final OK",
    phone: "15550003333",
    code: "FINAL-1",
    sale_status_enum: 6,
  }),
});
console.log("webhook", tr.status, await tr.text());
await new Promise((r) => setTimeout(r, 5000));
const e = await api(
  "GET",
  `/api/v1/executions?limit=1&workflowId=${encodeURIComponent(cancelId)}`
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
console.log("DONE");
