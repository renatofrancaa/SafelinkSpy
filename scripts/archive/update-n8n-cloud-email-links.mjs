/**
 * Update n8n cloud recovery Email 1–4 bodies with branded /go links.
 * Env: N8N_API_KEY, optional N8N_BASE_URL
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const BASE = (process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud").replace(/\/$/, "");
const KEY = process.env.N8N_API_KEY || "";
const RECOVERY_ID = process.env.N8N_RECOVERY_WF_ID || "1M6veZBK0z4n9Fqu";

if (!KEY) {
  console.error("Missing N8N_API_KEY");
  process.exit(1);
}

function loadEmailBody(n) {
  const p = path.join(root, "docs/n8n", `email${n}-jsonBody-expression.txt`);
  let body = fs.readFileSync(p, "utf8").trim();
  if (body.startsWith("={{")) return body;
  if (body.startsWith("=(")) return `={{${body.slice(1)}}}`;
  if (body.startsWith("({")) return `={{ ${body} }}`;
  return `={{ ${body} }}`;
}

async function api(method, urlPath, body) {
  const res = await fetch(`${BASE}/api/v1${urlPath}`, {
    method,
    headers: {
      "X-N8N-API-KEY": KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${urlPath} ${res.status}: ${String(text).slice(0, 400)}`);
  }
  return data;
}

const map = {
  "Email 1 ($39)": loadEmailBody(1),
  "Email 2 ($39)": loadEmailBody(2),
  "Email 3 ($39)": loadEmailBody(3),
  "Email 4 ($29)": loadEmailBody(4),
};

for (const [name, body] of Object.entries(map)) {
  const ok = body.includes("mysafelinkspy.com/go");
  console.log(name, "branded=", ok, "len=", body.length);
  if (!ok) throw new Error(`${name} missing branded host`);
}

const wf = await api("GET", `/workflows/${RECOVERY_ID}`);
for (const n of wf.nodes) {
  if (!map[n.name]) continue;
  n.parameters.specifyBody = "json";
  n.parameters.sendBody = true;
  n.parameters.jsonBody = map[n.name];
  n.parameters.url = "https://api.resend.com/emails";
  console.log("updated", n.name);
}

await api("POST", `/workflows/${RECOVERY_ID}/deactivate`);
await api("PUT", `/workflows/${RECOVERY_ID}`, {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings || { executionOrder: "v1" },
  staticData: wf.staticData ?? null,
});
const act = await api("POST", `/workflows/${RECOVERY_ID}/activate`);
console.log("active=", act.active ?? true);
console.log("Done.");
