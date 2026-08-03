/**
 * Fix n8n CLOUD recovery workflows via Public API.
 * - Email JSON body expression (Resend) — fix "not valid JSON"
 * - Append phone as text + correct columns
 * - Unify Google Sheets credential on Append
 *
 * Usage:
 *   set N8N_API_KEY=...
 *   set N8N_BASE_URL=https://infosd.app.n8n.cloud
 *   node scripts/fix-n8n-cloud.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const BASE = (process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud").replace(
  /\/$/,
  ""
);
const API = `${BASE}/api/v1`;
const KEY = process.env.N8N_API_KEY || "";

if (!KEY) {
  console.error("Missing N8N_API_KEY");
  process.exit(1);
}

const RECOVERY_ID = process.env.N8N_RECOVERY_WF_ID || "1M6veZBK0z4n9Fqu";
const PURCHASE_ID = process.env.N8N_PURCHASE_WF_ID || "Cqnv5dddUkc9uosc";

// Prefer the main Google Sheets account used by Get row / Update
const SHEETS_CRED = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};
const RESEND_CRED = {
  httpHeaderAuth: {
    id: "kgfB071PoLJfLOZd",
    name: "Header Auth account",
  },
};

const DOC = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit?usp=drivesdk",
};
const SHEET = {
  __rl: true,
  value: 1597998998,
  mode: "list",
  cachedResultName: "Leads",
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit#gid=1597998998",
};

function loadEmailBody(n) {
  const p = path.join(root, "docs/n8n", `email${n}-jsonBody-expression.txt`);
  let body = fs.readFileSync(p, "utf8").trim();
  // Must be full n8n expression returning an object (fixes cloud JSON validation)
  if (body.startsWith("={{")) return body;
  if (body.startsWith("=(")) return `={{${body.slice(1)}}}`; // =( → ={{
  if (body.startsWith("({")) return `={{ ${body} }}`;
  return `={{ ${body} }}`;
}

async function api(method, urlPath, body) {
  const res = await fetch(`${API}${urlPath}`, {
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
    throw new Error(
      `${method} ${urlPath} -> ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data).slice(0, 800)}`
    );
  }
  return data;
}

function col(id, extra = {}) {
  return {
    id,
    displayName: id,
    required: false,
    defaultMatch: false,
    display: true,
    type: "string",
    canBeUsedToMatch: true,
    removed: false,
    ...extra,
  };
}

function fixRecovery(wf) {
  const emailBodies = {
    "Email 1 ($39)": loadEmailBody(1),
    "Email 2 ($39)": loadEmailBody(2),
    "Email 3 ($39)": loadEmailBody(3),
    "Email 4 ($29)": loadEmailBody(4),
  };

  const phoneExpr =
    "={{ \"'\" + String($json.phone || '').replace(/^\\+/, '').replace(/^[\\'=]+/, '').trim() }}";

  for (const n of wf.nodes) {
    // Emails → Resend body
    if (emailBodies[n.name]) {
      n.parameters.method = "POST";
      n.parameters.url = "https://api.resend.com/emails";
      n.parameters.authentication = "genericCredentialType";
      n.parameters.genericAuthType = "httpHeaderAuth";
      n.parameters.sendHeaders = true;
      n.parameters.headerParameters = {
        parameters: [{ name: "Content-Type", value: "application/json" }],
      };
      n.parameters.sendBody = true;
      n.parameters.specifyBody = "json";
      n.parameters.jsonBody = emailBodies[n.name];
      n.credentials = RESEND_CRED;
      console.log("fixed email body:", n.name, "prefix", n.parameters.jsonBody.slice(0, 8));
    }

    if (n.type !== "n8n-nodes-base.googleSheets") continue;

    n.credentials = SHEETS_CRED;
    n.parameters.authentication = "oAuth2";
    n.parameters.resource = "sheet";
    n.parameters.documentId = DOC;
    n.parameters.sheetName = SHEET;

    if (n.name.includes("Append") || n.parameters.operation === "append") {
      n.parameters.operation = "append";
      n.parameters.columns = {
        mappingMode: "defineBelow",
        value: {
          email: "={{ $json.email }}",
          name: "={{ $json.name }}",
          "phone ": phoneExpr,
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
          col("email"),
          col("name"),
          col("phone "),
          col("purchased "),
          col("visitor_id "),
          col("utm_source "),
          col("utm_medium"),
          col("utm_campaign"),
          col("created_at"),
          col("status"),
        ],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      };
      n.parameters.options = { cellFormat: "USER_ENTERED" };
      console.log("fixed Append mapping + credential");
    }

    if (n.name.includes("Get row")) {
      n.parameters.operation = "read";
      console.log("fixed Get row cred/doc:", n.name);
    }
  }
  return wf;
}

function fixPurchase(wf) {
  for (const n of wf.nodes) {
    if (n.type !== "n8n-nodes-base.googleSheets") continue;
    n.credentials = SHEETS_CRED;
    n.parameters.authentication = "oAuth2";
    n.parameters.resource = "sheet";
    n.parameters.documentId = DOC;
    n.parameters.sheetName = SHEET;
    n.parameters.operation = "update";
    n.parameters.columns = {
      mappingMode: "defineBelow",
      value: {
        email: "={{ $json.email }}",
        "purchased ": "true",
        status: "purchased",
      },
      matchingColumns: ["email"],
      schema: [
        col("email", { required: true, defaultMatch: true }),
        col("purchased "),
        col("status"),
      ],
      attemptToConvertTypes: false,
      convertFieldsToString: true,
    };
    n.parameters.options = { cellFormat: "USER_ENTERED" };
    console.log("fixed purchase Update");
  }
  return wf;
}

function payloadFrom(wf) {
  // n8n public API update body
  return {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || { executionOrder: "v1" },
    staticData: wf.staticData ?? null,
  };
}

async function updateWorkflow(id, fixer, label) {
  const wf = await api("GET", `/workflows/${id}`);
  console.log(`\n=== ${label} id=${id} active=${wf.active} nodes=${wf.nodes?.length} ===`);
  fixer(wf);
  const body = payloadFrom(wf);

  // Some cloud versions require deactivate before structural update
  try {
    await api("POST", `/workflows/${id}/deactivate`);
    console.log("deactivated");
  } catch (e) {
    console.warn("deactivate skip:", e.message.slice(0, 120));
  }

  const updated = await api("PUT", `/workflows/${id}`, body);
  console.log("updated ok name=", updated.name || wf.name);

  try {
    await api("POST", `/workflows/${id}/activate`);
    console.log("activated");
  } catch (e) {
    console.warn("activate skip:", e.message.slice(0, 200));
  }
}

async function main() {
  await updateWorkflow(RECOVERY_ID, fixRecovery, "Recovery");
  await updateWorkflow(PURCHASE_ID, fixPurchase, "Purchase");

  // verify
  const v = await api("GET", `/workflows/${RECOVERY_ID}`);
  const e1 = v.nodes.find((n) => n.name.includes("Email 1"));
  const ap = v.nodes.find((n) => n.name.includes("Append"));
  console.log("\nVERIFY Email1 jsonBody starts:", e1?.parameters?.jsonBody?.slice(0, 12));
  console.log("VERIFY Append map:", ap?.parameters?.columns?.mappingMode);
  console.log("VERIFY Append cred:", ap?.credentials?.googleSheetsOAuth2Api?.id);
  console.log("VERIFY active:", v.active);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
