/**
 * Fix Append node schema on cancel workflow + retest webhook.
 * Requires env: N8N_BASE_URL, N8N_API_KEY
 */
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

async function api(method, path, body) {
  const r = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

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
  defaultMatch: false,
  display: true,
  type: "string",
  canBeUsedToMatch: true,
  removed: false,
}));

const id = "hL6HZlyHEtAeBI3u";
const full = await api("GET", `/api/v1/workflows/${id}`);
const wf = full.j.data || full.j;

const append = wf.nodes.find(
  (n) => n.id === "append-cancel" || n.name === "Append cancel lead"
);
if (!append) {
  console.error("Append node not found");
  process.exit(1);
}

append.parameters.columns = {
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

// Ensure credentials on all sheets/email nodes
const SHEETS = { id: "cPUIPb2SjjiZpCfg", name: "Google Sheets account" };
const RESEND = { id: "kgfB071PoLJfLOZd", name: "Header Auth account" };
for (const n of wf.nodes) {
  if (n.type === "n8n-nodes-base.googleSheets") {
    n.credentials = { googleSheetsOAuth2Api: SHEETS };
  }
  if (n.type === "n8n-nodes-base.httpRequest") {
    n.credentials = { httpHeaderAuth: RESEND };
  }
}

const put = await api("PUT", `/api/v1/workflows/${id}`, {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings,
  staticData: wf.staticData || null,
});
console.log("PUT", put.status, put.j.name || put.j.message || "ok");
if (put.status >= 400) {
  console.log(JSON.stringify(put.j).slice(0, 1000));
  process.exit(1);
}

const act = await api("POST", `/api/v1/workflows/${id}/activate`);
console.log("activate", act.status, "active=", (act.j.data || act.j).active);

// Retest webhook
const tr = await fetch(base + "/webhook/order-cancelled", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "cancel-test-safelink@example.com",
    name: "Cancel Test",
    phone: "15550009999",
    code: "TEST-CANCEL-2",
    sale_status_enum: 6,
  }),
});
console.log("webhook", tr.status, await tr.text());

await new Promise((r) => setTimeout(r, 5000));
const e = await api(
  "GET",
  `/api/v1/executions?limit=3&workflowId=${encodeURIComponent(id)}`
);
for (const x of e.j.data || []) {
  console.log({
    id: x.id,
    status: x.status,
    startedAt: x.startedAt,
    waitTill: x.waitTill,
  });
}

// If latest error, dump
const latest = (e.j.data || [])[0];
if (latest && latest.status === "error") {
  const det = await api(
    "GET",
    `/api/v1/executions/${latest.id}?includeData=true`
  );
  const err = det.j.data?.resultData?.error || det.j.resultData?.error;
  console.log("latest error:", err?.message || JSON.stringify(err).slice(0, 500));
  const runData = det.j.data?.resultData?.runData || det.j.resultData?.runData;
  if (runData) {
    for (const [node, runs] of Object.entries(runData)) {
      for (const run of runs) {
        if (run.error) console.log("NODE", node, run.error.message);
        else console.log("OK", node);
      }
    }
  }
}
