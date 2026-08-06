const base = process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud";
const key = process.env.N8N_API_KEY;
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
  return { status: r.status, j: await r.json().catch(() => ({})) };
}

const DOC = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
};
const SHEET = {
  __rl: true,
  value: 2076125170,
  mode: "list",
  cachedResultName: "Cancel Leads",
};
const CRED = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};

const list = await api("GET", "/api/v1/workflows");
for (const w of list.j.data || []) {
  if ((w.name || "").startsWith("TMP ")) {
    await api("DELETE", `/api/v1/workflows/${w.id}`).catch(() => {});
  }
}

const wf = {
  name: "TMP Read Cancel Sheet",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "tmp-read-cancel",
        responseMode: "lastNode",
        options: {},
      },
      id: "wh",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [200, 300],
      webhookId: "tmp-read-cancel",
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "read",
        documentId: DOC,
        sheetName: SHEET,
        options: { range: "A1:J5" },
      },
      id: "read",
      name: "Read",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [440, 300],
      credentials: CRED,
    },
  ],
  connections: {
    Webhook: { main: [[{ node: "Read", type: "main", index: 0 }]] },
  },
  settings: { executionOrder: "v1" },
};

const c = await api("POST", "/api/v1/workflows", wf);
const id = (c.j.data || c.j).id;
console.log("created", c.status, id);
await api("POST", `/api/v1/workflows/${id}/activate`);
const hit = await fetch(base + "/webhook/tmp-read-cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
console.log("status", hit.status);
console.log(await hit.text());
await new Promise((r) => setTimeout(r, 2000));
const ex = await api(
  "GET",
  `/api/v1/executions?limit=1&workflowId=${encodeURIComponent(id)}`
);
const eid = ex.j.data?.[0]?.id;
if (eid) {
  const det = await api("GET", `/api/v1/executions/${eid}?includeData=true`);
  const runs = det.j.data?.resultData?.runData || det.j.resultData?.runData;
  console.log(JSON.stringify(runs, null, 2).slice(0, 3000));
}
await api("POST", `/api/v1/workflows/${id}/deactivate`).catch(() => {});
await api("DELETE", `/api/v1/workflows/${id}`);
